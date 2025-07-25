const http = require('http');

const port = process.env.PORT || 4111;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok',
    service: 'mastra-accounting',
    message: 'Mastra Cloud deployment'
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

// Import and initialize Mastra in the background
setTimeout(() => {
  try {
    require('./src/mastra');
    console.log('Mastra framework loaded');
  } catch (error) {
    console.error('Failed to load Mastra:', error);
  }
}, 1000);