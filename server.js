const express = require('express');
const app = express();

// Mastra Cloudが設定するPORT環境変数を優先、なければ4111を使用
const port = process.env.PORT || 4111;

console.log('Starting server with environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  defaultPort: 4111
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Mastra Cloud Readiness Check',
    port: port,
    env: process.env.NODE_ENV
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on port ${port}`);
  console.log(`✅ Health check available at http://0.0.0.0:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});