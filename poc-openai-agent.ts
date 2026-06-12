import { Agent, Runner } from '@openai/agents';
import { OpenAIProvider, setOpenAIAPI } from '@openai/agents-openai';

setOpenAIAPI('chat_completions');

const provider = new OpenAIProvider({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant.',
  model: 'openai/gpt-5-nano',
  modelSettings: {
    reasoning: { effort: 'medium' },
  },
});

const runner = new Runner({
  modelProvider: provider,
});

async function main() {
  const result = await runner.run(
    agent,
    'Solve: if a train travels 60 mph for 2.5 hours, how far does it go?',
    { stream: true },
  );

  for await (const event of result) {
    if (event.type !== 'run_item_stream_event') continue;
    const { name, item } = event;

    if (name === 'reasoning_item_created') {
      for (const c of (item as any).rawItem.rawContent ?? []) {
        if (c.type === 'reasoning_text') process.stdout.write(c.text);
      }
    }

    if (name === 'message_output_text_delta') {
      process.stdout.write((event as any).delta);
    }
  }

  console.log('\n\nFinal output:', result.finalOutput);
}

main().catch(console.error);
