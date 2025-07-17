import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // MongoDB接続確認
    console.log('Journals list API - MongoDB URI exists:', !!process.env.MONGODB_URI);

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // フィルター条件を構築
    const filter: any = {};
    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    
    // 日付フィルター
    if (dateFrom || dateTo) {
      filter.entryDate = {};
      
      if (dateFrom) {
        filter.entryDate.$gte = new Date(dateFrom);
      }
      
      if (dateTo) {
        filter.entryDate.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    // 仕訳を取得
    const journals = await db.find('journals', filter, {
      limit,
      skip,
      sort: { entryDate: -1, createdAt: -1 }
    });

    console.log('Raw journals from database:', journals.length);

    // 総数を取得
    const totalCount = await db.count('journals', filter);

    return NextResponse.json({
      success: true,
      journals,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Journal list error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // より詳細なエラーメッセージ
    let errorMessage = '予期しないエラーが発生しました';
    if (error instanceof Error) {
      if (error.message.includes('MONGODB_URI')) {
        errorMessage = 'データベース接続設定が不足しています';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'データベースに接続できません';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';