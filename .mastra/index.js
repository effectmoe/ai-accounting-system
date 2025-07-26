// Mastra Cloud entry point
import { mastra } from '../src/mastra/config';
import { registerAgentTools } from '../src/mastra/agent-registry';

// Register all agent tools
registerAgentTools();

// Start Mastra server
const PORT = process.env.MASTRA_PORT || 4111;

mastra.start({
  port: PORT,
  host: '0.0.0.0'
}).then(() => {
  console.log(`Mastra server started on port ${PORT}`);
  console.log('Registered agents:', Object.keys(mastra.agents));
}).catch(error => {
  console.error('Failed to start Mastra server:', error);
  process.exit(1);
});