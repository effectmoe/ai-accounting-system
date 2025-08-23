// This file ensures Mastra is only loaded on the server side
import "server-only";

let mastraInstance: any = null;
let agents: any = {};
let configAgents: any = {};
let agentRegistry: any = null;

export async function getMastra() {
  if (typeof window !== 'undefined') {
    throw new Error('Mastra can only be used on the server side');
  }
  
  if (!mastraInstance) {
    const { mastra, ...exportedAgents } = await import('./index');
    mastraInstance = mastra;
    agents = exportedAgents;
  }
  
  return { mastra: mastraInstance, ...agents };
}

export async function getMastraAgent(agentName: string) {
  const { mastra } = await getMastra();
  return mastra.agents[agentName];
}

export async function getMastraConfig() {
  if (typeof window !== 'undefined') {
    throw new Error('Mastra config can only be used on the server side');
  }
  
  if (!configAgents.accountingAgent) {
    const config = await import('./config');
    configAgents = {
      accountingAgent: config.accountingAgent,
      customerAgent: config.customerAgent,
      japanTaxAgent: config.japanTaxAgent,
    };
  }
  
  return configAgents;
}

export async function getAgentRegistry() {
  if (typeof window !== 'undefined') {
    throw new Error('Agent registry can only be used on the server side');
  }
  
  if (!agentRegistry) {
    const registry = await import('./agent-registry');
    agentRegistry = registry.agentRegistry;
  }
  
  return agentRegistry;
}

export async function registerAgentTools() {
  if (typeof window !== 'undefined') {
    throw new Error('Agent tools can only be registered on the server side');
  }
  
  const registry = await import('./agent-registry');
  return registry.registerAgentTools();
}