// OpenAI Agent SDK setup (future use)
// This file sets up the structure for AI-powered agents.

export interface AgentTool {
  name: string;
  description: string;
  execute: (...args: unknown[]) => Promise<unknown>;
}

export interface Agent {
  name: string;
  instructions: string;
  tools: AgentTool[];
}

export function createAgent(name: string, instructions: string): Agent {
  return { name, instructions, tools: [] };
}

export function createTool(
  name: string,
  description: string,
  execute: (...args: unknown[]) => Promise<unknown>
): AgentTool {
  return { name, description, execute };
}
