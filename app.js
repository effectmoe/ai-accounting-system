// Minimal HTTP server for Mastra Cloud
const http = require('http');
const port = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});