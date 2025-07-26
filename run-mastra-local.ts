// Mastraエージェントをローカルで実行
import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// エージェントとツールをインポート
import { mastraAccountingAgent } from './src/agents/mastra-accounting-agent';
import { calculateTaxTool, createJournalEntryTool, generateFinancialReportTool } from './src/agents/tools/accounting-tools';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 4111;

// APIエンドポイント
app.post('/api/mastra/execute', async (req, res) => {
  const { agent, tool, params } = req.body;
  
  console.log(`\n🤖 エージェント実行: ${agent} - ツール: ${tool}`);
  console.log('パラメータ:', params);
  
  try {
    let result;
    
    // ツールを直接実行
    switch (tool) {
      case 'calculate_tax':
        result = await calculateTaxTool.handler(params);
        break;
      case 'create_journal_entry':
        result = await createJournalEntryTool.handler(params);
        break;
      case 'generate_financial_report':
        result = await generateFinancialReportTool.handler(params);
        break;
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
    
    console.log('✅ 実行成功');
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('❌ エラー:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ヘルスチェック
app.get('/api/mastra/health', (req, res) => {
  res.json({
    status: 'ok',
    agents: 11,
    tools: ['calculate_tax', 'create_journal_entry', 'generate_financial_report'],
    port: PORT
  });
});

// エージェント一覧
app.get('/api/mastra/agents', (req, res) => {
  res.json({
    agents: [
      { name: 'mastra-accounting-agent', description: '会計処理エージェント' },
      { name: 'mastra-customer-agent', description: '顧客管理エージェント' },
      { name: 'mastra-japan-tax-agent', description: '日本税制エージェント' },
      // ... 他のエージェント
    ]
  });
});

// サンプル実行
app.get('/api/mastra/demo', async (req, res) => {
  console.log('\n🎯 デモ実行開始...');
  
  try {
    // 消費税計算のデモ
    const taxResult = await calculateTaxTool.handler({
      amount: 100000,
      taxType: 'consumption',
      options: { includeLocal: true }
    });
    
    res.json({
      message: 'Mastraエージェントシステムが動作しています',
      demo: {
        description: '10万円の消費税計算',
        result: taxResult
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
🚀 Mastraエージェントシステムがローカルで起動しました！
================================================

📍 ベースURL: http://localhost:${PORT}

利用可能なエンドポイント:
- GET  /api/mastra/health  - ヘルスチェック
- GET  /api/mastra/agents  - エージェント一覧
- GET  /api/mastra/demo    - デモ実行
- POST /api/mastra/execute - エージェント実行

実行例:
curl -X POST http://localhost:${PORT}/api/mastra/execute \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent": "accounting",
    "tool": "calculate_tax",
    "params": {
      "amount": 1000000,
      "taxType": "consumption"
    }
  }'

🛑 終了するには Ctrl+C を押してください
================================================
  `);
});