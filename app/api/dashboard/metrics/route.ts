import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

const DB_NAME = process.env.MONGODB_DB_NAME || 'accounting-app';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface DashboardMetrics {
  totalRevenue: number;
  processedDocuments: number;
  pendingDocuments: number;
  activeCustomers: number;
  recentActivities: Array<{
    type: string;
    description: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

// GET: ダッシュボード用メトリクスを取得
export async function GET(request: NextRequest) {
  console.log('🎯 Dashboard metrics API called');
  logger.info('Dashboard metrics API called');
  
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    console.log('✅ Connected to MongoDB for dashboard metrics');
    logger.info('Connected to MongoDB for dashboard metrics');

    // Check what collections actually exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📋 Available collections:', collectionNames);
    logger.info('Available collections:', collectionNames);

    let totalRevenue = 0;
    let processedDocuments = 0;
    let pendingDocuments = 0;
    let activeCustomers = 0;
    let recentActivities: any[] = [];

    // 1. 総収益の計算 - 複数のソースから集計
    console.log('💰 Calculating total revenue...');
    
    // invoicesコレクションが存在する場合
    if (collectionNames.includes('invoices')) {
      const revenueResult = await db.collection('invoices').aggregate([
        {
          $match: {
            status: { $in: ['paid', 'sent'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]).toArray();
      totalRevenue += revenueResult[0]?.totalRevenue || 0;
      console.log(`Revenue from invoices: ¥${(revenueResult[0]?.totalRevenue || 0).toLocaleString()}`);
    }

    // supplierQuotesからも売上を計算（承認済みの見積もりなど）
    if (collectionNames.includes('supplierQuotes')) {
      const supplierQuoteRevenue = await db.collection('supplierQuotes').aggregate([
        {
          $match: {
            status: { $in: ['approved', 'completed', 'received'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]).toArray();
      const supplierRevenue = supplierQuoteRevenue[0]?.totalRevenue || 0;
      totalRevenue += supplierRevenue;
      console.log(`Revenue from supplier quotes: ¥${supplierRevenue.toLocaleString()}`);
    }

    logger.info(`Total revenue calculated: ¥${totalRevenue.toLocaleString()}`);

    // 2. 処理済みドキュメント数
    console.log('📄 Calculating processed documents...');
    
    if (collectionNames.includes('documents')) {
      processedDocuments = await db.collection('documents').countDocuments({
        status: { $in: ['completed', 'manual_review', 'processed'] }
      });
    }
    
    // OCR結果も処理済みドキュメントとしてカウント
    if (collectionNames.includes('ocrResults')) {
      const ocrProcessedCount = await db.collection('ocrResults').countDocuments({});
      processedDocuments += ocrProcessedCount;
      console.log(`OCR processed documents: ${ocrProcessedCount}`);
    }
    
    console.log(`Total processed documents: ${processedDocuments}`);
    logger.info(`Processed documents count: ${processedDocuments}`);

    // 3. 保留中のドキュメント数
    console.log('⏳ Calculating pending documents...');
    
    if (collectionNames.includes('documents')) {
      pendingDocuments = await db.collection('documents').countDocuments({
        status: { $in: ['pending', 'processing', 'ocr_processing'] }
      });
    }
    
    // supplierQuotesで保留中のものもカウント
    if (collectionNames.includes('supplierQuotes')) {
      const pendingQuotes = await db.collection('supplierQuotes').countDocuments({
        status: { $in: ['pending', 'draft', 'review'] }
      });
      pendingDocuments += pendingQuotes;
      console.log(`Pending supplier quotes: ${pendingQuotes}`);
    }
    
    console.log(`Total pending documents: ${pendingDocuments}`);
    logger.info(`Pending documents count: ${pendingDocuments}`);

    // 4. アクティブな顧客数/仕入先数
    console.log('👥 Calculating active customers/suppliers...');
    
    if (collectionNames.includes('invoices')) {
      const activeCustomerIds = await db.collection('invoices').distinct('customerId', {
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });
      activeCustomers += activeCustomerIds.length;
    }
    
    if (collectionNames.includes('customers')) {
      const customerCount = await db.collection('customers').countDocuments({
        isActive: { $ne: false }
      });
      activeCustomers += customerCount;
    }
    
    // アクティブな仕入先もカウント
    if (collectionNames.includes('suppliers')) {
      const activeSupplierCount = await db.collection('suppliers').countDocuments({
        isActive: { $ne: false }
      });
      activeCustomers += activeSupplierCount;
      console.log(`Active suppliers: ${activeSupplierCount}`);
    }
    
    console.log(`Total active customers/suppliers: ${activeCustomers}`);
    logger.info(`Active customers count: ${activeCustomers}`);

    // 5. 最近のアクティビティ
    console.log('📊 Fetching recent activities...');
    
    if (collectionNames.includes('activityLogs')) {
      recentActivities = await db.collection('activityLogs')
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
    }
    
    // activityLogsがない場合は、他のコレクションから最近のアクティビティを生成
    if (recentActivities.length === 0) {
      const mockActivities = [];
      
      // OCR結果から最近のアクティビティを生成
      if (collectionNames.includes('ocrResults')) {
        const recentOCR = await db.collection('ocrResults')
          .find({})
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        
        recentOCR.forEach(ocr => {
          mockActivities.push({
            type: 'ocr_completed',
            description: `OCR処理完了: ${ocr.vendor || 'ドキュメント'} (¥${(ocr.amount || 0).toLocaleString()})`,
            timestamp: ocr.createdAt,
            metadata: { amount: ocr.amount, vendor: ocr.vendor }
          });
        });
      }
      
      // 仕入先見積書から最近のアクティビティを生成
      if (collectionNames.includes('supplierQuotes')) {
        const recentQuotes = await db.collection('supplierQuotes')
          .find({})
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();
        
        recentQuotes.forEach(quote => {
          mockActivities.push({
            type: 'supplier_quote_created',
            description: `仕入先見積書作成: ${quote.quoteNumber} (¥${(quote.totalAmount || 0).toLocaleString()})`,
            timestamp: quote.createdAt,
            metadata: { quoteNumber: quote.quoteNumber, amount: quote.totalAmount }
          });
        });
      }
      
      // 仕入先登録アクティビティ
      if (collectionNames.includes('suppliers')) {
        const recentSuppliers = await db.collection('suppliers')
          .find({})
          .sort({ createdAt: -1 })
          .limit(2)
          .toArray();
        
        recentSuppliers.forEach(supplier => {
          mockActivities.push({
            type: 'supplier_created',
            description: `仕入先登録: ${supplier.companyName}`,
            timestamp: supplier.createdAt,
            metadata: { companyName: supplier.companyName }
          });
        });
      }
      
      // 時系列でソート
      recentActivities = mockActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    }
    
    console.log(`Recent activities generated: ${recentActivities.length}`);
    logger.info(`Recent activities count: ${recentActivities.length}`);

    const metrics: DashboardMetrics = {
      totalRevenue,
      processedDocuments,
      pendingDocuments,
      activeCustomers,
      recentActivities: recentActivities.map(activity => ({
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp,
        metadata: activity.metadata
      }))
    };

    console.log('✅ Dashboard metrics successfully compiled:', {
      totalRevenue: metrics.totalRevenue,
      processedDocuments: metrics.processedDocuments,
      pendingDocuments: metrics.pendingDocuments,
      activeCustomers: metrics.activeCustomers,
      activitiesCount: metrics.recentActivities.length
    });

    logger.info('Dashboard metrics successfully compiled', {
      totalRevenue: metrics.totalRevenue,
      processedDocuments: metrics.processedDocuments,
      pendingDocuments: metrics.pendingDocuments,
      activeCustomers: metrics.activeCustomers,
      activitiesCount: metrics.recentActivities.length
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('❌ Error fetching dashboard metrics:', error);
    logger.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}