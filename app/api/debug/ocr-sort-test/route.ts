import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // フィルター条件
    const filter = {
      companyId: '11111111-1111-1111-1111-111111111111',
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }
    };
    
    // ソートオプション
    let sortOptions: any = {};
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'date':
        sortOptions = {
          receipt_date: sortDirection,
          createdAt: sortDirection
        };
        break;
      case 'amount':
        sortOptions = {
          total_amount: sortDirection,
          createdAt: sortDirection
        };
        break;
      default:
        sortOptions = {
          createdAt: sortDirection
        };
    }
    
    // 全データを取得してソート
    const allDocuments = await db.find('documents', filter, {
      sort: sortOptions
    });
    
    // データの統計情報
    const stats = {
      total: allDocuments.length,
      uniqueDates: new Set(allDocuments.map(d => d.receipt_date || d.documentDate || d.issueDate || 'no-date')).size,
      uniqueAmounts: new Set(allDocuments.map(d => d.total_amount || d.totalAmount || 0)).size,
      dateDistribution: {} as any,
      amountDistribution: {} as any
    };
    
    // 日付分布
    allDocuments.forEach(doc => {
      const date = doc.receipt_date || doc.documentDate || doc.issueDate || 'no-date';
      stats.dateDistribution[date] = (stats.dateDistribution[date] || 0) + 1;
    });
    
    // 金額分布
    allDocuments.forEach(doc => {
      const amount = doc.total_amount || doc.totalAmount || 0;
      stats.amountDistribution[amount] = (stats.amountDistribution[amount] || 0) + 1;
    });
    
    // ソート結果のサンプル
    const sortedSample = allDocuments.slice(0, 30).map((doc, index) => ({
      index: index + 1,
      _id: doc._id.toString(),
      receipt_date: doc.receipt_date || doc.documentDate || doc.issueDate,
      total_amount: doc.total_amount || doc.totalAmount || 0,
      vendor_name: doc.vendor_name || doc.vendorName || 'N/A',
      createdAt: doc.createdAt
    }));
    
    return NextResponse.json({
      sortBy,
      sortOrder,
      stats,
      sortedSample,
      message: 'デバッグ用のソート結果です'
    });
    
  } catch (error) {
    console.error('Sort test error:', error);
    return NextResponse.json({
      error: 'ソートテスト中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}