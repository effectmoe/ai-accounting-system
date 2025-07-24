// Mastra Cloud用のサーバー
const http = require('http');

const PORT = process.env.PORT || 3000;

console.log(`Starting server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  // ログ出力
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // ヘルスチェックレスポンス
  if (req.url === '/health' || req.url === '/' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      service: 'mastra-accounting-automation',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
});

// エラーハンドリング
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});