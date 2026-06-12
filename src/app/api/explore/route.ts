import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { execSync } from "child_process";

async function ddgrSearch(query: string, maxResults: number, region?: string): Promise<{ title: string; url: string; abstract: string }[]> {
  try {
    const count = Math.min(Math.max(maxResults, 1), 25);
    const regionFlag = region && region !== "us-en" ? ` -r ${region}` : "";
    const output = execSync(`ddgr --noua --json -n ${count}${regionFlag} "${query.replace(/"/g, '\\"')}"`, {
      timeout: 20000,
      maxBuffer: 5 * 1024 * 1024,
    }).toString();
    const results = JSON.parse(output);
    return results.map((r: any) => ({ title: r.title || "", url: r.url || "", abstract: r.abstract || "" }));
  } catch (e: any) {
    console.error("ddgr failed:", e.message);
    return [];
  }
}

function dedupeUrls(results: { title: string; url: string; abstract: string }[]): { title: string; url: string; abstract: string }[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function eventStream(req: NextRequest, controller: ReadableStreamDefaultController, onDone: () => void) {
  const encoder = new TextEncoder();
  const send = (event: string, data: any) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      const { query, maxResults, existingUrls, region } = await req.json();
      if (!query) {
        send("error", { message: "Query required" });
        controller.close();
        return;
      }

      const targetCount = Math.min(Math.max(maxResults || 10, 1), 25);
      const existingSet = new Set((existingUrls || []).map((u: string) => u.replace(/\/$/, "").toLowerCase()));

      const regionNames: Record<string, string> = { "us-en": "US", "uk-en": "UK", "au-en": "Australia", "ca-en": "Canada", "de-de": "Germany", "fr-fr": "France", "es-es": "Spain", "it-it": "Italy", "nl-nl": "Netherlands", "br-pt": "Brazil", "jp-jp": "Japan", "in-en": "India", "se-sv": "Sweden", "no-no": "Norway", "dk-da": "Denmark", "fi-fi": "Finland", "pl-pl": "Poland", "pt-pt": "Portugal", "ru-ru": "Russia", "za-en": "South Africa" };
      const regionLabel = regionNames[region || "us-en"] || region || "US";

      const model = new ChatOpenAI({
        model: "openai/gpt-5-nano",
        configuration: { baseURL: "https://openrouter.ai/api/v1" },
        apiKey: process.env.OPENROUTER_API_KEY,
        modelKwargs: { reasoning_effort: "medium" },
      });

      let allRawResults: { title: string; url: string; abstract: string }[] = [];
      let searchQueries = [query];
      const maxRounds = 3;

      for (let round = 1; round <= maxRounds; round++) {
        if (round === 1) {
          send("reasoning", { label: "Analyzing request", description: "Understanding what to search for..." });

          try {
            const result = await model.invoke([
              { role: "system", content: "Given the user's request, generate a short DuckDuckGo search query (max 6 words) to find COMPANY WEBSITES and LANDING PAGES. Focus on finding official business websites, not blog posts or articles. Use terms like 'official website' or target domain patterns. Return ONLY the search query text." },
              { role: "user", content: query },
            ]);
            const generated = typeof result.content === "string" ? result.content.trim() : query;
            if (generated.length > 2 && generated.split(/\s+/).length <= 10) {
              searchQueries[0] = generated;
            }
          } catch {}

          send("reasoning", { label: "Analyzing request", description: `Optimized query: "${searchQueries[0]}"` });
          send("reasoning_done", {});
        }

        const currentQuery = searchQueries[searchQueries.length - 1];
        send("search", { label: `Search round ${round}/${maxRounds}`, description: `Query: "${currentQuery}" · Region: ${regionLabel}`, round });

        const roundResults = await ddgrSearch(currentQuery, Math.min(targetCount, 25), region);

        if (roundResults.length > 0) {
          allRawResults = dedupeUrls([...allRawResults, ...roundResults]);
          send("search_result", { results: roundResults, totalSoFar: allRawResults.length, message: `Round ${round}: found ${roundResults.length} results (${allRawResults.length} unique so far)` });
        } else {
          send("search_result", { results: [], totalSoFar: allRawResults.length, message: `Round ${round}: no results` });
        }

        // Check if we have enough
        if (allRawResults.length >= targetCount || round >= maxRounds) break;

        // Generate follow-up query for next round
        send("reasoning", { label: `Need more results (${allRawResults.length}/${targetCount})`, description: "Generating a different search angle..." });
        send("reasoning_done", {});

        try {
          const followUp = await model.invoke([
            { role: "system", content: `We searched for "${currentQuery}" and got ${allRawResults.length} results. Generate a DIFFERENT search query (max 6 words) to find more COMPANY WEBSITES and LANDING PAGES. Focus on finding business homepages. Avoid repeating words from previous queries: ${searchQueries.join(", ")}. Return ONLY the query text.` },
            { role: "user", content: query },
          ]);
          const nextQuery = typeof followUp.content === "string" ? followUp.content.trim() : "";
          if (nextQuery.length > 2 && nextQuery.split(/\s+/).length <= 10 && !searchQueries.includes(nextQuery)) {
            searchQueries.push(nextQuery);
          } else {
            break;
          }
        } catch {
          break;
        }
      }

      if (allRawResults.length === 0) {
        send("search_result", { results: [], message: "No results found from search" });
        send("reasoning", { label: "No results", description: "DuckDuckGo returned no results. Try a different query or region." });
        send("reasoning_done", {});
        send("result", { results: [], summary: "No results found" });
        send("done", {});
        controller.close();
        return;
      }

      // Filter results with AI
      send("reasoning", { label: "Filtering results", description: `Checking ${allRawResults.length} results against your request and ${existingSet.size} existing URLs...` });

      let filteredResults: typeof allRawResults = [];

      try {
        const filterPrompt = `You are a strict result filter. Review these search results and ONLY keep ones that are COMPANY WEBSITES or LANDING PAGES matching the user's request. EXCLUDE blog posts, articles, news stories, social media pages, Wikipedia entries, review sites, and directory listings.

User request: "${query}"

Existing URLs to EXCLUDE:
${existingSet.size > 0 ? Array.from(existingSet).join("\n") : "(none)"}

Search results:
${JSON.stringify(allRawResults, null, 2)}

PREFER URLs that look like company homepages (e.g. example.com, example.com/about, example.com/contact) over subpages.
EXCLUDE URLs that look like articles (/blog/, /news/, /article/, etc.) or social media (facebook.com, twitter.com, linkedin.com, etc.).

Return ONLY a JSON array of { title, url, abstract } for company website results that match the request AND are not in the existing URLs list. Empty array if none match.`;

        const filterResult = await model.invoke([
          { role: "system", content: "You are a strict result filter. Return ONLY valid JSON." },
          { role: "user", content: filterPrompt },
        ]);

        const filterContent = typeof filterResult.content === "string" ? filterResult.content : "[]";
        const parsed = JSON.parse(filterContent);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (r.url && r.title && !existingSet.has(r.url.replace(/\/$/, "").toLowerCase())) {
              filteredResults.push({ title: r.title, url: r.url, abstract: r.abstract || "" });
            }
          }
        }
      } catch (e: any) {
        console.error("AI filtering failed:", e.message);
      }

      // Trim to target
      filteredResults = filteredResults.slice(0, targetCount);

      send("reasoning", { label: "Filtering complete", description: `Kept ${filteredResults.length}/${targetCount} matching results (excluded ${allRawResults.length - filteredResults.length} irrelevant or duplicates)` });
      send("reasoning_done", {});

      send("result", { results: filteredResults, summary: `Found ${filteredResults.length} matching websites` });

      if (filteredResults.length < targetCount && searchQueries.length > 1) {
        send("reasoning", { label: "Note", description: `Only found ${filteredResults.length}/${targetCount} matching results after ${searchQueries.length} search rounds` });
        send("reasoning_done", {});
      }

      send("done", {});
    } catch (e: any) {
      try {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`));
      } catch {}
    }
    controller.close();
    onDone();
  })();
}

export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      eventStream(req, controller, () => {});
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
