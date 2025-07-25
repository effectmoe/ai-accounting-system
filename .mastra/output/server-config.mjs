// Define mastra to fix error
const mastra = {};
var mastra$1 = mastra;

// Create HTTP server for readiness probe
import http from 'http';
const port = process.env.PORT || 4111;

const httpServer = http.createServer((req, res) => {
  console.log(`Server-config: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server-config HTTP server running on port ${port}`);
});

const server = { httpServer };

export { mastra$1 as default, server };
//# sourceMappingURL=server-config.mjs.map
