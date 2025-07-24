const http = require('http');

const PORT = process.env.PORT || 8080;

console.log(`Starting server with PORT=${PORT}`);
console.log(`Environment:`, {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST
});

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - ${req.headers['user-agent']}`);
  
  // Handle all health check variations
  if (req.url === '/health' || 
      req.url === '/healthz' || 
      req.url === '/ready' || 
      req.url === '/.well-known/health' ||
      req.url === '/') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'X-Powered-By': 'Mastra'
    });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Mastra Accounting Automation',
      timestamp: timestamp,
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: req.url }));
  }
});

// Start listening
server.listen(PORT, () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at:`);
  console.log(`   - http://0.0.0.0:${PORT}/health`);
  console.log(`   - http://0.0.0.0:${PORT}/healthz`);
  console.log(`   - http://0.0.0.0:${PORT}/ready`);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});