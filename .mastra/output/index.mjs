// Override Mastra Cloud's generated file
import http from 'http';

const PORT = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'accounting-automation' }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default {};