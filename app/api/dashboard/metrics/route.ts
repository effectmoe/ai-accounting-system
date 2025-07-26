import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

const DB_NAME = 'accounting'; // MongoDBの実際のデータベース名

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
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
    let totalExpenses = 0;
    let processedDocuments = 0;
    let pendingDocuments = 0;
    let activeCustomers = 0;
    let recentActivities: any[] = [];

    // 1. 総収益の計算 - 売上のみを集計
    console.log('💰 Calculating total revenue...');
    
    // invoicesコレクションが存在する場合（売上）
    if (collectionNames.includes('invoices')) {
      const revenueResult = await db.collection('invoices').aggregate([
        {
          $match: {
            status: { $in: ['paid', 'sent', 'unpaid', 'viewed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' }
          }
        }
      ]).toArray();
      totalRevenue += revenueResult[0]?.totalRevenue || 0;
      console.log(`Revenue from invoices: ¥${(revenueResult[0]?.totalRevenue || 0).toLocaleString()}`);
    }

    // quotesコレクションが存在する場合（売上見積）
    if (collectionNames.includes('quotes')) {
      const quotesResult = await db.collection('quotes').aggregate([
        {
          $match: {
            status: { $in: ['accepted', 'converted'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' }
          }
        }
      ]).toArray();
      const quotesRevenue = quotesResult[0]?.totalRevenue || 0;
      totalRevenue += quotesRevenue;
      console.log(`Revenue from accepted quotes: ¥${quotesRevenue.toLocaleString()}`);
    }

    // supplierQuotesは支出なので除外（仕入先からの見積書は支出）
    // purchaseInvoicesも支出なので除外（仕入先からの請求書は支出）

    logger.info(`Total revenue calculated: ¥${totalRevenue.toLocaleString()}`);

    // 2. 総支出の計算 - 仕入・経費を集計
    console.log('💸 Calculating total expenses...');
    
    // purchaseInvoicesコレクションが存在する場合（仕入請求書）
    if (collectionNames.includes('purchaseInvoices')) {
      const expenseResult = await db.collection('purchaseInvoices').aggregate([
        {
          $match: {
            status: { $in: ['paid', 'approved', 'received'] }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' }
          }
        }
      ]).toArray();
      totalExpenses += expenseResult[0]?.totalExpenses || 0;
      console.log(`Expenses from purchase invoices: ¥${(expenseResult[0]?.totalExpenses || 0).toLocaleString()}`);
    }

    // supplierQuotesコレクションが存在する場合（仕入見積書・承認済みのもの）
    if (collectionNames.includes('supplierQuotes')) {
      const supplierQuotesResult = await db.collection('supplierQuotes').aggregate([
        {
          $match: {
            status: { $in: ['accepted', 'converted'] }
          }
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' }
          }
        }
      ]).toArray();
      const supplierQuotesExpenses = supplierQuotesResult[0]?.totalExpenses || 0;
      // 仕入請求書と重複しないように、convertedでない見積書のみカウント
      if (!collectionNames.includes('purchaseInvoices')) {
        totalExpenses += supplierQuotesExpenses;
        console.log(`Expenses from accepted supplier quotes: ¥${supplierQuotesExpenses.toLocaleString()}`);
      }
    }

    logger.info(`Total expenses calculated: ¥${totalExpenses.toLocaleString()}`);

    // 3. 処理済みドキュメント数
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

    // 4. アクティブな顧客数（仕入先は除外）
    console.log('👥 Calculating active customers...');
    
    // 過去90日間に取引のあった顧客をカウント
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const activeCustomerIds = new Set<string>();
    
    // invoicesから顧客IDを取得
    if (collectionNames.includes('invoices')) {
      const customerIdsFromInvoices = await db.collection('invoices').distinct('customerId', {
        createdAt: { $gte: ninetyDaysAgo }
      });
      customerIdsFromInvoices.forEach(id => activeCustomerIds.add(id));
    }
    
    // quotesから顧客IDを取得
    if (collectionNames.includes('quotes')) {
      const customerIdsFromQuotes = await db.collection('quotes').distinct('customerId', {
        createdAt: { $gte: ninetyDaysAgo }
      });
      customerIdsFromQuotes.forEach(id => activeCustomerIds.add(id));
    }
    
    // アクティブな顧客IDの数をカウント
    if (activeCustomerIds.size > 0) {
      activeCustomers = activeCustomerIds.size;
    } else if (collectionNames.includes('customers')) {
      // 取引履歴がない場合は、アクティブな顧客マスタの数をカウント
      activeCustomers = await db.collection('customers').countDocuments({
        isActive: { $ne: false }
      });
    }
    
    console.log(`Active customers (last 90 days): ${activeCustomers}`);
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
            description: `仕入先見積書作成: ${quote.quoteNumber} (¥${(quote.amount || 0).toLocaleString()})`,
            timestamp: quote.createdAt,
            metadata: { quoteNumber: quote.quoteNumber, amount: quote.amount }
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

    // 利益と利益率の計算
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const metrics: DashboardMetrics = {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin,
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
      totalExpenses: metrics.totalExpenses,
      profit: metrics.profit,
      profitMargin: `${metrics.profitMargin.toFixed(1)}%`,
      processedDocuments: metrics.processedDocuments,
      pendingDocuments: metrics.pendingDocuments,
      activeCustomers: metrics.activeCustomers,
      activitiesCount: metrics.recentActivities.length
    });

    logger.info('Dashboard metrics successfully compiled', {
      totalRevenue: metrics.totalRevenue,
      totalExpenses: metrics.totalExpenses,
      profit: metrics.profit,
      profitMargin: `${metrics.profitMargin.toFixed(1)}%`,
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