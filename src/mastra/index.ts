import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { validateEnvironment } from "./utils/env-validation";
import express from 'express';

// Validate environment variables on startup
validateEnvironment();

// Simple agent definition for Mastra Cloud
const accountingAgent = new Agent({
  name: "Accounting Assistant",
  instructions: "You are a helpful accounting assistant. Answer concisely.",
  model: openai("gpt-4o-mini"),
});

// Mastra configuration
const mastra = new Mastra({
  agents: { accountingAgent },
});

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || "3000");

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: "ok", 
    service: "mastra-accounting-automation",
    timestamp: new Date().toISOString()
  });
});

// Detailed health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Get agents to verify they're loaded
    const agents = await mastra.getAgents();
    const agentCount = Object.keys(agents).length;
    
    res.json({
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
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
if (process.env.NODE_ENV === "production" || require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Starting Mastra server on port ${port}...`);
    console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
    console.log(`✅ Health check endpoint: http://0.0.0.0:${port}/`);
    console.log(`✅ Detailed health check endpoint: http://0.0.0.0:${port}/health`);
  });
}

// Export for Mastra Cloud
export { mastra };
export default mastra;