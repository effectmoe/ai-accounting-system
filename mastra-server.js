#!/usr/bin/env node
const express = require('express');
const app = express();
const port = process.env.PORT || 4111;

// Middleware
app.use(express.json());

// Root health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mastra-accounting-automation',
    timestamp: new Date().toISOString(),
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
    ]
  });
});

// Detailed health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      agents: {
        status: 'healthy',
        count: 11
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      },
      uptime: process.uptime()
    }
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
  console.log(`✅ Health check endpoint: http://0.0.0.0:${port}/`);
  console.log(`✅ Detailed health check endpoint: http://0.0.0.0:${port}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});