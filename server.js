// Simple HTTP server for Mastra Cloud
const http = require('http');
const PORT = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    message: 'Accounting Automation System',
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Import Mastra agents after server is running
setTimeout(() => {
  console.log('Loading Mastra agents...');
  try {
    require('./src/mastra');
    console.log('Mastra agents loaded successfully');
  } catch (error) {
    console.log('Mastra agents not available in this environment');
  }
}, 1000);