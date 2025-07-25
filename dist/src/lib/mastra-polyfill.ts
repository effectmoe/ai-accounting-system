// Mastra polyfill for createAgent function
// This file provides a createAgent function that wraps the Agent class

import { Agent } from '@mastra/core';

// Define the structure expected by createAgent
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  inputSchema: any;
  tools: Record<string, {
    description: string;
    execute: (params: any) => Promise<any>;
  }>;
  execute: (context: { input: any; tools: any }) => Promise<any>;
}

// createAgent function that mimics the expected behavior
export function createAgent(config: AgentConfig): any {
  // Create a class that extends Agent
  class CustomAgent extends Agent {
    constructor() {
      super({
        id: config.id,
        name: config.name,
        description: config.description,
        model: {
          provider: 'DEEPSEEK',
          name: 'deepseek-chat',
          toolChoice: 'auto',
        },
      });
    }

    async execute(input: any): Promise<any> {
      // Create tools object with bound execute functions
      const tools: Record<string, (params: any) => Promise<any>> = {};
      
      for (const [toolName, tool] of Object.entries(config.tools)) {
        tools[toolName] = tool.execute;
      }

      // Call the original execute function with input and tools
      return config.execute({ input, tools });
    }
  }

  // Return an instance that matches the expected interface
  const agent = new CustomAgent();
  
  // Add the tools and other properties to the instance
  Object.assign(agent, {
    id: config.id,
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    tools: config.tools,
    execute: async (input: any) => agent.execute(input),
    getName: () => config.name,
    getDescription: () => config.description,
    getVersion: () => '1.0.0',
  });

  return agent;
}

// Re-export the createAgent function as default and named export
export default createAgent;