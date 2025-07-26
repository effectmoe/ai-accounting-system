const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = 4000;

app.get('/api/dashboard/metrics', async (req, res) => {
  console.log('Dashboard metrics requested');
  
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('accounting');
    
    // 実際のデータを取得
    const invoices = await db.collection('invoices').find({}).toArray();
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const processedDocuments = await db.collection('documents').countDocuments({ status: 'completed' });
    const pendingDocuments = await db.collection('documents').countDocuments({ status: 'pending' });
    const activeCustomers = await db.collection('customers').countDocuments({});
    
    const recentOCR = await db.collection('ocrResults').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    const recentActivities = recentOCR.map(ocr => ({
      type: 'ocr_completed',
      description: `OCR処理: ${ocr.vendor || 'ドキュメント'} (¥${(ocr.amount || 0).toLocaleString()})`,
      timestamp: ocr.createdAt || new Date(),
      metadata: { amount: ocr.amount }
    }));
    
    res.json({
      totalRevenue,
      processedDocuments,
      pendingDocuments,
      activeCustomers,
      recentActivities
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

app.listen(PORT, () => {
  console.log(`シンプルサーバーがポート ${PORT} で起動しました`);
  console.log(`http://localhost:${PORT}/health`);
  console.log(`http://localhost:${PORT}/api/dashboard/metrics`);
});