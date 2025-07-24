import express from 'express';
import { mastra } from './mastra';

// Express appを作成
const app = express();
const PORT = process.env.PORT || 3000;

// JSONパーサー
app.use(express.json());

// Health checkエンドポイント
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req: express.Request, res: express.Response) => {
  res.status(200).json({ message: 'Mastra Accounting Automation API' });
});

// エージェントAPIエンドポイント
app.post('/api/agent/:agentId', async (req: express.Request, res: express.Response) => {
  try {
    const { agentId } = req.params;
    const { messages, ...options } = req.body;
    
    const agent = (mastra as any).getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentId} not found` });
    }
    
    const result = await agent.generate(messages, options);
    res.json(result);
  } catch (error: any) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// エージェント一覧エンドポイント
app.get('/api/agents', (req: express.Request, res: express.Response) => {
  const agents = Object.keys((mastra as any).agents || {});
  res.json({ agents });
});

// サーバーを起動
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api`);
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