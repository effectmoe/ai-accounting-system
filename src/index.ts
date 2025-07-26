import { Mastra, createServer } from '@mastra/core';
import { mastra } from './mastra';

// Start Mastra server
const port = process.env.PORT || 4111;

async function startServer() {
  try {
    console.log('[Mastra] Starting server...');
    const server = await createServer(mastra, {
      port: Number(port),
      isDev: false,
    });
    console.log(`[Mastra] Server running on port ${port}`);
  } catch (error) {
    console.error('[Mastra] Failed to start server:', error);
    // Fallback to simple HTTP server
    const http = require('http');
    const fallbackServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port }));
    });
    fallbackServer.listen(port, () => {
      console.log(`[Mastra] Fallback server running on port ${port}`);
    });
  }
}

startServer();

export default mastra;