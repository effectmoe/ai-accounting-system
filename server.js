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
  
  // Health check endpoints
  if (req.url === '/health' || req.url === '/' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      service: 'mastra-accounting-automation',
      version: '1.0.1',
      timestamp: timestamp,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      uptime: process.uptime()
    }));
  } 
  // Agent list endpoint
  else if (req.url === '/api/agents') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      agents: [
        {
          name: 'mastra-accounting-agent',
          description: '会計処理・仕訳作成エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-customer-agent', 
          description: '顧客管理エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-database-agent',
          description: 'データベース操作エージェント', 
          status: 'ready'
        },
        {
          name: 'mastra-japan-tax-agent',
          description: '日本税制対応エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-ocr-agent',
          description: 'OCR処理エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-product-agent',
          description: '商品管理エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-ui-agent',
          description: 'UI操作エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-construction-agent',
          description: '構築支援エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-deployment-agent',
          description: 'デプロイメント管理エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-problem-solving-agent',
          description: '問題解決専門エージェント',
          status: 'ready'
        },
        {
          name: 'mastra-refactor-agent',
          description: 'リファクタリング専門エージェント',
          status: 'ready'
        }
      ],
      total: 11,
      status: 'ready'
    }));
  }
  // Project info endpoint
  else if (req.url === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      project: 'accounting-automation',
      description: 'AI-driven accounting automation system for Japanese tax compliance',
      framework: 'Mastra',
      version: '1.0.1',
      features: [
        'Japanese tax compliance (consumption tax, withholding tax, invoice system)',
        'AI-powered OCR for invoice processing',
        'Automated journal entry creation',
        'Multi-agent system for comprehensive automation',
        'MongoDB integration for data persistence',
        'Azure Form Recognizer integration',
        'Real-time processing and notifications'
      ]
    }));
  }
  // 404 for other routes
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
  console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Agent list: http://0.0.0.0:${PORT}/api/agents`);
  console.log(`✅ Project info: http://0.0.0.0:${PORT}/api/info`);
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

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});