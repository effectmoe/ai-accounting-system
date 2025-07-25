import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
// Simple agent definition for Mastra Cloud
const accountingAgent = new Agent({
    name: "Accounting Assistant",
    instructions: "You are a helpful accounting assistant. Answer concisely.",
    model: openai("gpt-4o-mini"),
});
// Mastra configuration
export const mastra = new Mastra({
    agents: { accountingAgent },
});
// Export default for Mastra Cloud
export default mastra;
