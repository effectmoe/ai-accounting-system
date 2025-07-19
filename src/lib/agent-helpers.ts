// Mastra Agent helpers

// createAgent helper function
export function createAgent(config: any): any {
  // Since @mastra/core's createAgent is not available in the current version,
  // we create a wrapper that returns an object with the expected structure
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    inputSchema: config.inputSchema,
    tools: config.tools || {},
    execute: async (input: any) => {
      // Call the original execute function with tools
      return config.execute({ input, tools: config.tools });
    },
    // Additional properties for compatibility
    getName: () => config.name,
    getDescription: () => config.description,
    getVersion: () => '1.0.0',
  };
}