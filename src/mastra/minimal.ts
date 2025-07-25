import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Simple agent definition
const simpleAgent = new Agent({
  name: "Simple Assistant",
  instructions: "You are a helpful assistant. Answer concisely.",
  model: openai("gpt-4o-mini"),
});

// Mastra configuration
export const mastra = new Mastra({
  name: "Minimal Example",
  agents: { simpleAgent },
});

// Export default for Mastra Cloud
export default mastra;