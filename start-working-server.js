// 実際に動作するサーバー
const express = require('express');
const next = require('next');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = 3000;

app.prepare().then(() => {
  const server = express();
  
  // APIエンドポイント
  server.get('/api/dashboard/metrics', async (req, res) => {
    console.log('📊 Dashboard metrics requested');
    
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
      await client.connect();
      const db = client.db('accounting');
      
      // 実際のデータを取得
      const invoices = await db.collection('invoices').find({}).toArray();
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      
      const documents = await db.collection('documents').find({}).toArray();
      const processedDocuments = documents.filter(d => d.status === 'completed').length;
      const pendingDocuments = documents.filter(d => d.status === 'pending').length;
      
      const activeCustomers = await db.collection('customers').countDocuments({});
      
      // 最近のアクティビティ
      const recentOCR = await db.collection('ocrResults').find({}).sort({ createdAt: -1 }).limit(5).toArray();
      const recentSupplierQuotes = await db.collection('supplierQuotes').find({}).sort({ createdAt: -1 }).limit(5).toArray();
      
      const activities = [];
      
      recentOCR.forEach(ocr => {
        activities.push({
          type: 'ocr_completed',
          description: `OCR処理完了: ${ocr.vendor || 'ドキュメント'} (¥${(ocr.amount || 0).toLocaleString()})`,
          timestamp: ocr.createdAt || new Date()
        });
      });
      
      recentSupplierQuotes.forEach(quote => {
        activities.push({
          type: 'supplier_quote_created',
          description: `仕入先見積書: ${quote.quoteNumber} (¥${(quote.totalAmount || 0).toLocaleString()})`,
          timestamp: quote.createdAt || new Date()
        });
      });
      
      // 時系列でソート
      const recentActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      
      console.log('✅ Data retrieved:', {
        totalRevenue,
        processedDocuments,
        pendingDocuments,
        activeCustomers,
        activitiesCount: recentActivities.length
      });
      
      res.json({
        totalRevenue,
        processedDocuments,
        pendingDocuments,
        activeCustomers,
        recentActivities
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await client.close();
    }
  });
  
  // 他のAPIエンドポイント
  server.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  
  // Next.jsのページ
  server.all('*', (req, res) => {
    return handle(req, res);
  });
  
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 サーバーが起動しました: http://localhost:${PORT}`);
    console.log('📊 ダッシュボード: http://localhost:' + PORT);
    console.log('🔍 API: http://localhost:' + PORT + '/api/dashboard/metrics');
  });
});