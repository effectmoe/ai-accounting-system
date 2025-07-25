// Mastra Cloud Server
console.log('[Mastra] Starting server...');
console.log('[Mastra] Node version:', process.version);
console.log('[Mastra] Environment:', process.env.NODE_ENV || 'development');
console.log('[Mastra] Port:', process.env.PORT || '4111');

const http = require('http');
const PORT = process.env.PORT || 4111;

console.log(`[Mastra] Creating server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  console.log(`[Mastra] ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    port: PORT,
    path: req.url
  }));
});

server.on('error', (err) => {
  console.error('[Mastra] Server error:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[Mastra] Server running on port ${PORT}`);
  console.log('[Mastra] Ready');
});

// Handle termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Keep process alive
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

console.log('Server initialization complete');