import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

const DB_NAME = 'accounting';

// GET: 請求書ステータスの分布を取得（デバッグ用）
export async function GET(request: NextRequest) {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    // 請求書のステータス分布を取得
    const statusDistribution = await db.collection('invoices').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    // 無効なステータス（日本語）をチェック
    const invalidStatuses = statusDistribution.filter(item => 
      item._id && !['draft', 'sent', 'viewed', 'unpaid', 'paid', 'partially_paid', 'overdue', 'cancelled'].includes(item._id)
    );
    
    // サンプルドキュメントを取得
    const sampleDocuments = await db.collection('invoices')
      .find({})
      .limit(5)
      .project({ _id: 1, invoiceNumber: 1, status: 1, totalAmount: 1 })
      .toArray();
    
    const result = {
      statusDistribution,
      invalidStatuses,
      sampleDocuments,
      summary: {
        totalInvoices: statusDistribution.reduce((sum, item) => sum + item.count, 0),
        totalAmount: statusDistribution.reduce((sum, item) => sum + item.totalAmount, 0),
        hasInvalidStatuses: invalidStatuses.length > 0
      }
    };
    
    logger.info('Invoice status debug info:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching invoice status debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice status debug info' },
      { status: 500 }
    );
  }
}

// POST: 無効なステータスを修正（日本語→英語）
export async function POST(request: NextRequest) {
  try {
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    
    // 日本語→英語のマッピング
    const statusMapping = {
      '下書き': 'draft',
      '送信済み': 'sent',
      '開封済み': 'viewed',
      '未払い': 'unpaid',
      '支払済み': 'paid',
      '一部支払済み': 'partially_paid',
      '期限超過': 'overdue',
      'キャンセル': 'cancelled'
    };
    
    const updateResults = [];
    
    // 各日本語ステータスを英語に変換
    for (const [japanese, english] of Object.entries(statusMapping)) {
      const result = await db.collection('invoices').updateMany(
        { status: japanese },
        { $set: { status: english } }
      );
      
      if (result.modifiedCount > 0) {
        updateResults.push({
          from: japanese,
          to: english,
          modifiedCount: result.modifiedCount
        });
      }
    }
    
    // その他の無効なステータスを 'draft' に設定
    const validStatuses = ['draft', 'sent', 'viewed', 'unpaid', 'paid', 'partially_paid', 'overdue', 'cancelled'];
    const otherInvalidResult = await db.collection('invoices').updateMany(
      { status: { $nin: validStatuses } },
      { $set: { status: 'draft' } }
    );
    
    if (otherInvalidResult.modifiedCount > 0) {
      updateResults.push({
        from: 'その他の無効なステータス',
        to: 'draft',
        modifiedCount: otherInvalidResult.modifiedCount
      });
    }
    
    logger.info('Invoice status fix results:', updateResults);
    
    return NextResponse.json({
      success: true,
      updateResults,
      totalModified: updateResults.reduce((sum, item) => sum + item.modifiedCount, 0)
    });
  } catch (error) {
    logger.error('Error fixing invoice statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fix invoice statuses' },
      { status: 500 }
    );
  }
}