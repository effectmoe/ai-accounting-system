import express from 'express';
import cors from 'cors';
import { handleAgentsEndpoint, handleWorkflowsEndpoint, handleSummaryEndpoint } from './api-handler.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSONパーサー
app.use(express.json());

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mastra API for AAM Accounting System',
    version: '1.0.0',
    endpoints: {
      agents: '/api/agents',
      workflows: '/api/workflows', 
      summary: '/api/summary'
    }
  });
});

// APIルート
app.get('/api', (req, res) => {
  res.json({ message: 'Hello to the Mastra API!' });
});

// エージェント一覧
app.get('/api/agents', (req, res) => {
  try {
    const agents = handleAgentsEndpoint();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ワークフロー一覧
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = handleWorkflowsEndpoint();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// サマリーエンドポイント
app.get('/api/summary', (req, res) => {
  try {
    const summary = handleSummaryEndpoint();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Mastra API server running on port ${PORT}`);
});

export default app;