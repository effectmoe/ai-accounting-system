console.log('Starting Mastra Cloud server...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PWD: process.cwd()
});

const http = require('http');
const port = parseInt(process.env.PORT || '4111', 10);

console.log(`Creating HTTP server on port ${port}...`);

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} from ${req.headers.host}`);
  
  // Handle all requests with 200 OK
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'X-Powered-By': 'Mastra'
  });
  
  const response = JSON.stringify({ 
    status: 'ok',
    service: 'mastra-accounting',
    timestamp: timestamp,
    port: port,
    path: req.url,
    method: req.method
  });
  
  res.end(response);
  console.log(`[${timestamp}] Response sent: ${response}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server is listening on http://0.0.0.0:${port}`);
  console.log('✅ Ready for readiness probe');
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