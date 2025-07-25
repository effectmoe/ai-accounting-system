// Define mastra to fix the error
const mastra = {};
var mastra$1 = mastra;
const telemetry = {};

// Start HTTP server for readiness probe
import http from 'http';
const port = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Telemetry server running on port ${port}`);
});

export { mastra$1 as default, telemetry };
