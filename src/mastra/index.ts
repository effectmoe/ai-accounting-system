import { Mastra } from '@mastra/core';
import { mastraAccountingAgent } from '../agents/mastra-accounting-agent';
import { mastraCustomerAgent } from '../agents/mastra-customer-agent';
import { mastraOcrAgent } from '../agents/mastra-ocr-agent';
import { mastraJapanTaxAgent } from '../agents/mastra-japan-tax-agent';
import { mastraDatabaseAgent } from '../agents/mastra-database-agent';
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
    mastraOcrAgent,
    mastraJapanTaxAgent,
    mastraDatabaseAgent,
    mastraProductAgent,
    mastraUiAgent,
    mastraConstructionAgent,
    mastraDeploymentAgent,
    mastraProblemSolvingAgent,
    mastraRefactorAgent,
  },
  workflows: {},
});

export default mastra;
