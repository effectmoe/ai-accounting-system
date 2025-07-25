#!/usr/bin/env node
const http = require('http');
const port = process.env.PORT || 4111;

console.log('[Mastra Cloud Server] Starting...');

// Create a simple HTTP server that responds to all requests
const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  // Always return 200 OK for any request
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.end(JSON.stringify({ 
    status: 'ok',
    service: 'mastra-accounting-automation',
    timestamp: timestamp,
    port: port,
    message: 'Server is running. Mastra agents configuration is in mastra.yaml'
  }));
});

// Start listening
server.listen(port, '0.0.0.0', () => {
  console.log(`[Mastra Cloud Server] Listening on port ${port}`);
  console.log(`[Mastra Cloud Server] Ready for requests`);
});

// Handle errors
server.on('error', (err) => {
  console.error('[Mastra Cloud Server] Error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Mastra Cloud Server] SIGTERM received');
  server.close(() => {
    console.log('[Mastra Cloud Server] Server closed');
    process.exit(0);
  });
});

// Keep the process alive
process.on('uncaughtException', (err) => {
  console.error('[Mastra Cloud Server] Uncaught exception:', err);
});