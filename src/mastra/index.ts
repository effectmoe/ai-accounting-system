import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { registerApiRoute } from "@mastra/core/server";
import { validateEnvironment, diagnosticsRoute } from "./utils/env-validation";

// Validate environment variables on startup
validateEnvironment();

// Simple agent definition for Mastra Cloud
const accountingAgent = new Agent({
  name: "Accounting Assistant",
  instructions: "You are a helpful accounting assistant. Answer concisely.",
  model: openai("gpt-4o-mini"),
});

// Health check endpoint
const healthRoute = registerApiRoute("/", {
  method: "GET",
  handler: async (c) => {
    return c.json({ 
      status: "ok", 
      service: "mastra-accounting-automation",
      timestamp: new Date().toISOString()
    });
  },
});

// Detailed health check endpoint
const detailedHealthRoute = registerApiRoute("/health", {
  method: "GET",
  handler: async (c) => {
    const mastraInstance = c.get("mastra");
    try {
      // Get agents to verify they're loaded
      const agents = await mastraInstance.getAgents();
      const agentCount = Object.keys(agents).length;
      
      return c.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        components: {
          agents: {
            status: agentCount > 0 ? "healthy" : "degraded",
            count: agentCount
          },
          memory: {
            used: process.memoryUsage().heapUsed,
            total: process.memoryUsage().heapTotal
          },
          uptime: process.uptime()
        }
      });
    } catch (error) {
      return c.json({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      }, 503);
    }
  },
});

// Diagnostics endpoint for development
const diagnostics = diagnosticsRoute(registerApiRoute);

// Mastra configuration
export const mastra = new Mastra({
  agents: { accountingAgent },
  server: {
    port: parseInt(process.env.PORT || "3000"),
    host: "0.0.0.0",
  },
  // apiRoutes が利用できない場合はコメントアウト
  // apiRoutes: [healthRoute, detailedHealthRoute, diagnostics],
});

// Export default for Mastra Cloud
export default mastra;