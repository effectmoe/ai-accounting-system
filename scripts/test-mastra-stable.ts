// Test script for stable Mastra v0.10.0
import { mastra } from '../src/mastra/config';
import { registerAgentTools } from '../src/mastra/agent-registry';

async function testMastraStable() {
  console.log('Testing Mastra stable version...');
  
  try {
    // Register tools
    registerAgentTools();
    
    // Test accounting agent
    const accountingAgent = mastra.agents['accountingAgent'];
    if (!accountingAgent) {
      throw new Error('Accounting agent not found');
    }
    
    console.log('✅ Accounting agent found:', accountingAgent.name);
    
    // Test tool execution
    const taxResult = await accountingAgent.execute({
      messages: [
        {
          role: 'user',
          content: '100万円の消費税を計算してください'
        }
      ]
    });
    
    console.log('Tax calculation result:', taxResult);
    
    // Test all agents
    const allAgents = Object.keys(mastra.agents);
    console.log('✅ All registered agents:', allAgents);
    
    console.log('✅ Mastra stable version test passed!');
  } catch (error) {
    console.error('❌ Error testing Mastra:', error);
  }
}

testMastraStable();