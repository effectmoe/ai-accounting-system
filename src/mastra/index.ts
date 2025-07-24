import { Mastra } from '@mastra/core';

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
  },
});

// Start the server when this file is run directly
if (require.main === module) {
  mastra.start().then(() => {
    console.log(`✅ Mastra server running on port ${process.env.PORT || 3000}`);
    console.log(`✅ Health check available at http://0.0.0.0:${process.env.PORT || 3000}/`);
  }).catch((error) => {
    console.error('❌ Failed to start Mastra server:', error);
    process.exit(1);
  });
}

export default mastra;