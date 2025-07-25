#!/usr/bin/env node
const http = require('http');
const port = process.env.PORT || 4111;

console.log(`[Mastra Server] Starting on port ${port}...`);

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/' || req.url === '/health' || req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'mastra-accounting-automation',
      timestamp: new Date().toISOString(),
      port: port,
      agents: [
        'accountingAgent',
        'customerAgent',
        'databaseAgent',
        'deploymentAgent',
        'japanTaxAgent',
        'ocrAgent',
        'problemSolvingAgent',
        'productAgent',
        'refactorAgent',
        'uiAgent',
        'constructionAgent'
      ],
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      uptime: Math.round(process.uptime()) + 's'
    }));
  } else if (req.url.startsWith('/api')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Mastra API endpoint',
      path: req.url,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: req.url }));
  }
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
  console.log(`✅ Health check endpoints: / or /health or /ready`);
  console.log(`✅ Server is ready to accept connections`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('[Mastra Server] Server error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Mastra Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[Mastra Server] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Mastra Server] SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('[Mastra Server] HTTP server closed');
    process.exit(0);
  });
});