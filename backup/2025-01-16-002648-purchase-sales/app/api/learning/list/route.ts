import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // 検索条件を構築
    const query: any = { companyId };
    
    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: 'i' } },
        { accountCategory: { $regex: search, $options: 'i' } },
        { 'patterns': { $regex: search, $options: 'i' } }
      ];
    }

    // ページネーション
    const skip = (page - 1) * limit;

    // 学習データを取得
    const learnings = await db.find('accountLearningData', query, {
      sort: { updatedAt: -1, 'metadata.useCount': -1 },
      skip,
      limit
    });

    // 総件数を取得
    const total = await db.count('accountLearningData', query);

    // 各学習データに統計情報を追加
    const enrichedLearnings = learnings.map((learning: any) => {
      // 信頼度スコアを計算（使用回数に基づく）
      const useCount = learning.metadata?.useCount || 0;
      const confidenceScore = Math.min(0.5 + (useCount * 0.05), 0.99);
      
      return {
        id: learning._id.toString(),
        vendorName: learning.vendorName,
        accountCategory: learning.accountCategory,
        patterns: learning.patterns || [],
        usageCount: useCount,
        lastUsed: learning.metadata?.lastUsedAt || learning.metadata?.learnedAt || learning.createdAt,
        createdAt: learning.createdAt,
        updatedAt: learning.updatedAt,
        confidenceScore: learning.confidence || confidenceScore,
        metadata: learning.metadata || {}
      };
    });

    // カテゴリ別の統計を集計
    const categoryStats = await db.aggregate('accountLearningData', [
      { $match: { companyId } },
      {
        $group: {
          _id: '$accountCategory',
          count: { $sum: 1 },
          totalUsage: { $sum: { $ifNull: ['$metadata.useCount', 1] } }
        }
      },
      { $sort: { totalUsage: -1 } }
    ]);

    return NextResponse.json({
      success: true,
      learnings: enrichedLearnings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        totalLearnings: total,
        categoryBreakdown: categoryStats.map(stat => ({
          category: stat._id,
          count: stat.count,
          totalUsage: stat.totalUsage
        }))
      }
    });

  } catch (error) {
    console.error('Learning list error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch learning data'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';