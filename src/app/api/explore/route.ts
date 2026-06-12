import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { execSync } from "child_process";

async function ddgrSearch(query: string, maxResults: number, region?: string): Promise<{ title: string; url: string; abstract: string }[]> {
  try {
    const count = Math.min(Math.max(maxResults, 1), 50);
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
      let searchQueries: string[] = [];

      // Step 1: Generate 10 diverse search queries using AI
      send("reasoning", { label: "Generating search strategies", description: "Creating 10 diverse search queries based on your request..." });

      try {
        const queriesResult = await model.invoke([
          { role: "system", content: `You are a search strategy expert. Given a user request, generate 10 different search queries to find COMPANY WEBSITES and LANDING PAGES.
Each query should be max 6 words, diverse, and target different angles/industries/niches related to the request.
Focus on finding official business homepages, not articles or blog posts.
Return the queries as a JSON array of strings ONLY.` },
          { role: "user", content: query },
        ]);
        const qContent = typeof queriesResult.content === "string" ? queriesResult.content : "[]";
        const parsed = JSON.parse(qContent);
        if (Array.isArray(parsed)) {
          searchQueries = parsed.filter((q: string) => q.length > 2).slice(0, 10);
        }
      } catch {}

      if (searchQueries.length === 0) searchQueries = [query];

      send("reasoning", { label: "Search queries generated", description: `${searchQueries.length} queries ready: ${searchQueries.join(" | ")}` });
      send("reasoning_done", {});

      // Step 2: Run all searches
      for (let round = 0; round < searchQueries.length; round++) {
        const currentQuery = searchQueries[round];
        send("search", { label: `Search ${round + 1}/${searchQueries.length}`, description: `Query: "${currentQuery}" · Region: ${regionLabel}`, round: round + 1 });

        const roundResults = await ddgrSearch(currentQuery, Math.max(targetCount, 15), region);

        if (roundResults.length > 0) {
          allRawResults = dedupeUrls([...allRawResults, ...roundResults]);
          send("search_result", { results: roundResults, totalSoFar: allRawResults.length, message: `Query ${round + 1}: found ${roundResults.length} results (${allRawResults.length} total so far)` });
        } else {
          send("search_result", { results: [], totalSoFar: allRawResults.length, message: `Query ${round + 1}: no results` });
        }

        // Stop early if we have enough raw results (we'll filter later)
        if (allRawResults.length >= targetCount * 3) break;
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
        const filterPrompt = `You are a result filter. Review these search results and keep ones that are COMPANY WEBSITES or LANDING PAGES matching the user's request. PREFER company homepages over blog posts or articles when possible, but still include any relevant business page.

User request: "${query}"

Existing URLs to EXCLUDE:
${existingSet.size > 0 ? Array.from(existingSet).join("\n") : "(none)"}

Search results:
${JSON.stringify(allRawResults, null, 2)}

Include any result that appears to be an official company/business website, landing page, or service page relevant to the request.
EXCLUDE only: social media pages, Wikipedia articles, job listings, and completely irrelevant results.

Return ONLY a JSON array of { title, url, abstract } for matching results. Empty array if none match. Should have at LEAST ${targetCount} results if available.`;

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
