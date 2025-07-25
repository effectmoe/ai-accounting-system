const http = require('http');
const port = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: port }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`HTTP server listening on port ${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});