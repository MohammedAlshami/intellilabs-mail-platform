export interface Agent {
  name: string;
  instructions: string;
  tools: AgentTool[];
}

export interface AgentTool {
  name: string;
  description: string;
  execute: (...args: unknown[]) => Promise<unknown>;
}
