import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenRouter } from "@langchain/openrouter";

const model = new ChatOpenRouter({
  model: "openai/gpt-5-nano",
  apiKey: process.env.OPENROUTER_API_KEY!,
  modelKwargs: { reasoning: { effort: "medium" } },
});

const agent = createAgent({
  model,
  tools: [],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: crypto.randomUUID() } };

async function main() {
  const result = await agent.invoke(
    {
      messages: [
        { role: "user", content: "Solve: if a train travels 60 mph for 2.5 hours, how far does it go?" },
      ],
    },
    config,
  );

  for (const msg of result.messages) {
    if (msg._getType() === "ai") {
      const kw = (msg as any).additional_kwargs;
      if (kw.reasoning_content) {
        console.log("Reasoning:", kw.reasoning_content);
      }
    }
  }

  const lastMsg = result.messages.at(-1);
  console.log("\nAnswer:", lastMsg?.content);
}

main().catch(console.error);
