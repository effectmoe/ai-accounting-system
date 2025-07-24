import { serve } from '@mastra/core';
import { mastra } from './mastra';

// Mastra Cloud用のサーバーを起動
const PORT = process.env.PORT || 3000;

serve(mastra, {
  port: Number(PORT),
  host: '0.0.0.0',
});

console.log(`🚀 Mastra server running on port ${PORT}`);

// Health check用のエンドポイント
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});