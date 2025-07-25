import { Mastra } from '@mastra/core';
import { validateEnvironment } from './utils/env-validation';

// Validate environment on startup
validateEnvironment();

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
  const port = process.env.PORT || 3000;
  console.log(`🚀 Starting Mastra server...`);
  console.log(`📍 Port: ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  mastra.start().then(() => {
    console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
    console.log(`✅ Health check: http://0.0.0.0:${port}/`);
    console.log(`✅ API routes available at http://0.0.0.0:${port}/api`);
  }).catch((error) => {
    console.error('❌ Failed to start Mastra server:', error);
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing Mastra server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing Mastra server');
  process.exit(0);
});

export default mastra;