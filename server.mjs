import { createServer } from 'http';

const port = process.env.PORT || 4111;

console.log('[Server] Starting...');

const server = createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[Server] Ready on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});