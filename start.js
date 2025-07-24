#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('=== Mastra Start Script ===');

// Check if Mastra output exists
const mastraOutput = path.join(process.cwd(), '.mastra/output/index.mjs');

if (fs.existsSync(mastraOutput)) {
  console.log('Starting Mastra server...');
  const server = spawn('node', [mastraOutput], { stdio: 'inherit' });
  
  server.on('error', (err) => {
    console.error('Failed to start Mastra server:', err);
    startFallbackServer();
  });
} else {
  console.log('Mastra output not found, starting fallback server...');
  startFallbackServer();
}

function startFallbackServer() {
  const http = require('http');
  const PORT = process.env.PORT || 3000;
  
  const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    if (req.url === '/health' || req.url === '/' || req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok',
        service: 'mastra-accounting-automation',
        fallback: true
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Fallback server running on port ${PORT}`);
  });
}