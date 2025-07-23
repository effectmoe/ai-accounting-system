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
  logger.info('Dashboard metrics API called');
  
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    logger.info('Connected to MongoDB for dashboard metrics');

    // 1. 総収益（支払い済みまたは送信済みの請求書の合計）
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
    
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    logger.info(`Total revenue calculated: ¥${totalRevenue.toLocaleString()}`);

    // 2. 処理済みドキュメント数
    const processedDocuments = await db.collection('documents').countDocuments({
      status: { $in: ['completed', 'manual_review', 'processed'] }
    });
    logger.info(`Processed documents count: ${processedDocuments}`);

    // 3. 保留中のドキュメント数
    const pendingDocuments = await db.collection('documents').countDocuments({
      status: { $in: ['pending', 'processing', 'ocr_processing'] }
    });
    logger.info(`Pending documents count: ${pendingDocuments}`);

    // 4. アクティブな顧客数（請求書を発行した顧客）
    const activeCustomerIds = await db.collection('invoices').distinct('customerId', {
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // 過去90日間
    });
    const activeCustomers = activeCustomerIds.length;
    logger.info(`Active customers count: ${activeCustomers}`);

    // 5. 最近のアクティビティ（活動ログから取得）
    const recentActivities = await db.collection('activityLogs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    logger.info(`Recent activities count: ${recentActivities.length}`);

    const metrics: DashboardMetrics = {
      totalRevenue,
      processedDocuments,
      pendingDocuments,
      activeCustomers,
      recentActivities: recentActivities.map(activity => ({
        type: activity.type,
        description: activity.description,
        timestamp: activity.createdAt,
        metadata: activity.metadata
      }))
    };

    logger.info('Dashboard metrics successfully compiled', {
      totalRevenue: metrics.totalRevenue,
      processedDocuments: metrics.processedDocuments,
      pendingDocuments: metrics.pendingDocuments,
      activeCustomers: metrics.activeCustomers,
      activitiesCount: metrics.recentActivities.length
    });

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}