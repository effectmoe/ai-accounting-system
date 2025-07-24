import { Mastra } from "@mastra/core";
import { registerApiRoute } from "@mastra/core/server";

// Import all agents
import { mastraAccountingAgent } from '../agents/mastra-accounting-agent';
import { mastraCustomerAgent } from '../agents/mastra-customer-agent';
import { mastraDatabaseAgent } from '../agents/mastra-database-agent';
import { mastraJapanTaxAgent } from '../agents/mastra-japan-tax-agent';
import { mastraOcrAgent } from '../agents/mastra-ocr-agent';
import { mastraProductAgent } from '../agents/mastra-product-agent';
import { mastraUiAgent } from '../agents/mastra-ui-agent';
import { mastraConstructionAgent } from '../agents/mastra-construction-agent';
import { mastraDeploymentAgent } from '../agents/mastra-deployment-agent';
import { mastraProblemSolvingAgent } from '../agents/mastra-problem-solving-agent';
import { mastraRefactorAgent } from '../agents/mastra-refactor-agent';

export const mastra = new Mastra({
  agents: {
    mastraAccountingAgent,
    mastraCustomerAgent,
    mastraDatabaseAgent,
    mastraJapanTaxAgent,
    mastraOcrAgent,
    mastraProductAgent,
    mastraUiAgent,
    mastraConstructionAgent,
    mastraDeploymentAgent,
    mastraProblemSolvingAgent,
    mastraRefactorAgent,
  },
  workflows: {},
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: '0.0.0.0',
    timeout: 30000,
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    },
    apiRoutes: [
      // Health check endpoint
      registerApiRoute("/health", {
        method: "GET",
        handler: async (c) => {
          try {
            const mastraInstance = c.get("mastra");
            const agents = await mastraInstance.getAgents();
            
            return c.json({
              status: "healthy",
              timestamp: new Date().toISOString(),
              service: "mastra-accounting-automation",
              version: "1.0.1",
              port: process.env.PORT || 3000,
              agents: Object.keys(agents).length,
              environment: process.env.NODE_ENV || 'development'
            }, 200);
          } catch (error) {
            return c.json({
              status: "unhealthy",
              timestamp: new Date().toISOString(),
              error: error.message
            }, 503);
          }
        },
      }),
      
      // Readiness check endpoint
      registerApiRoute("/ready", {
        method: "GET",
        handler: async (c) => {
          return c.json({ 
            status: "ready",
            timestamp: new Date().toISOString()
          }, 200);
        },
      }),
      
      // Root endpoint
      registerApiRoute("/", {
        method: "GET",
        handler: async (c) => {
          return c.json({
            service: "mastra-accounting-automation",
            status: "ok",
            timestamp: new Date().toISOString()
          }, 200);
        },
      }),
      
      // Agent list endpoint
      registerApiRoute("/api/agents", {
        method: "GET",
        handler: async (c) => {
          const mastraInstance = c.get("mastra");
          const agents = await mastraInstance.getAgents();
          
          return c.json({
            agents: Object.keys(agents).map(name => ({
              name,
              status: 'ready'
            })),
            total: Object.keys(agents).length,
            status: 'ready'
          }, 200);
        },
      }),
    ],
  },
});

// Export for Mastra Cloud
export default mastra;