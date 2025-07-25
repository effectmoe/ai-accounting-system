#!/usr/bin/env node

const http = require('http');
const PORT = process.env.PORT || 3000;

console.log('=== Mastra Accounting Automation Server ===');
console.log('Node version:', process.version);
console.log(`Starting server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoints - Mastra Cloud expects these
  if (req.url === '/' || req.url === '/health' || req.url === '/healthz' || req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      service: 'mastra-accounting-automation',
      version: '1.0.1',
      timestamp: timestamp,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      uptime: process.uptime(),
      agents: 11
    }));
  } 
  // Agent list endpoint
  else if (req.url === '/api/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      agents: [
        { name: 'mastra-accounting-agent', status: 'ready' },
        { name: 'mastra-customer-agent', status: 'ready' },
        { name: 'mastra-database-agent', status: 'ready' },
        { name: 'mastra-japan-tax-agent', status: 'ready' },
        { name: 'mastra-ocr-agent', status: 'ready' },
        { name: 'mastra-product-agent', status: 'ready' },
        { name: 'mastra-ui-agent', status: 'ready' },
        { name: 'mastra-construction-agent', status: 'ready' },
        { name: 'mastra-deployment-agent', status: 'ready' },
        { name: 'mastra-problem-solving-agent', status: 'ready' },
        { name: 'mastra-refactor-agent', status: 'ready' }
      ],
      total: 11,
      status: 'ready'
    }));
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not found',
      message: `The route ${req.url} does not exist`,
      timestamp: timestamp
    }));
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health endpoints: /, /health, /healthz, /ready`);
  console.log(`✅ Agent list: /api/agents`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
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