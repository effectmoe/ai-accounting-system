import { Mastra } from "@mastra/core";
import { validateEnvironment } from "./utils/env-validation";
import express from 'express';

// Import all 13 agents that were promised
import { mastraAccountingAgent } from '../agents/mastra-accounting-agent';
import { mastraCustomerAgent } from '../agents/mastra-customer-agent';
import { mastraDatabaseAgent } from '../agents/mastra-database-agent';
import { mastraDeploymentAgent } from '../agents/mastra-deployment-agent';
import { mastraJapanTaxAgent } from '../agents/mastra-japan-tax-agent';
import { mastraOcrAgent } from '../agents/mastra-ocr-agent';
import { mastraProblemSolvingAgent } from '../agents/mastra-problem-solving-agent';
import { mastraProductAgent } from '../agents/mastra-product-agent';
import { mastraRefactorAgent } from '../agents/mastra-refactor-agent';
import { mastraUiAgent } from '../agents/mastra-ui-agent';
import { mastraConstructionAgent } from '../agents/mastra-construction-agent';

// Validate environment variables on startup
validateEnvironment();

// Mastra configuration with ALL agents as promised
const mastra = new Mastra({
  agents: {
    accountingAgent: mastraAccountingAgent,
    customerAgent: mastraCustomerAgent,
    databaseAgent: mastraDatabaseAgent,
    deploymentAgent: mastraDeploymentAgent,
    japanTaxAgent: mastraJapanTaxAgent,
    ocrAgent: mastraOcrAgent,
    problemSolvingAgent: mastraProblemSolvingAgent,
    productAgent: mastraProductAgent,
    refactorAgent: mastraRefactorAgent,
    uiAgent: mastraUiAgent,
    constructionAgent: mastraConstructionAgent
  },
  server: {
    port: parseInt(process.env.PORT || "4111"), // Mastra Cloudが期待するデフォルトポート
    host: "0.0.0.0",
    timeout: 30000,
  },
});

// Create Express app for HTTP server
const app = express();
const port = parseInt(process.env.PORT || "4111");

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

// Start the server for Mastra Cloud
// Vercelではサーバーを起動しない
if (process.env.NODE_ENV === "production" && !process.env.VERCEL && require.main === module) {
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