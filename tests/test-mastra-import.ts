// Test Mastra import
import { Agent, createTool } from '@mastra/core';

console.log('Agent:', typeof Agent);
console.log('createTool:', typeof createTool);

// Test creating an agent
try {
  const testAgent = new Agent({
    id: 'test-agent',
    name: 'Test Agent',
    model: {
      provider: 'OPENAI',
      name: 'gpt-4o',
    },
  });
  console.log('Agent created successfully');
} catch (error) {
  console.error('Failed to create agent:', error);
}

// Also check if createAgent exists
async function checkExports() {
  try {
    const core = await import('@mastra/core');
    console.log('Available exports:', Object.keys(core));
  } catch (error) {
    console.error('Failed to import:', error);
  }
}

checkExports();