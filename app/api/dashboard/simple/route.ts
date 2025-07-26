import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 環境変数から直接MongoDB URIを取得
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return NextResponse.json({ error: 'MongoDB URI not configured' }, { status: 500 });
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('accounting');
    
    // データを取得
    const invoices = await db.collection('invoices').find({}).toArray();
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    
    const processedDocuments = await db.collection('documents').countDocuments({ status: 'completed' });
    const pendingDocuments = await db.collection('documents').countDocuments({ status: 'pending' });
    const activeCustomers = await db.collection('customers').countDocuments({});
    
    // 最近のアクティビティ
    const recentOCR = await db.collection('ocrResults').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    const recentActivities = recentOCR.map(ocr => ({
      type: 'ocr_completed',
      description: `OCR処理: ${ocr.vendor || 'ドキュメント'}`,
      timestamp: ocr.createdAt || new Date()
    }));
    
    await client.close();
    
    return NextResponse.json({
      totalRevenue,
      processedDocuments,
      pendingDocuments,
      activeCustomers,
      recentActivities
    });
    
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}