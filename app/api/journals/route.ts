import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 詳細なデバッグログ
    logger.debug('===== Journals API GET Request Start =====');
    logger.debug('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_exists: !!process.env.MONGODB_URI,
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      VERCEL: !!process.env.VERCEL,
      timestamp: new Date().toISOString()
    });

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    logger.debug('Query parameters:', { companyId, dateFrom, dateTo, limit, skip });

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

    logger.debug('Filter object:', filter);

    // 仕訳を取得
    logger.debug('Attempting to fetch journals from database...');
    const journals = await db.find('journals', filter, {
      limit,
      skip,
      sort: { entryDate: -1, createdAt: -1 }
    });

    logger.debug('Journals fetched successfully:', {
      count: journals.length,
      hasData: journals.length > 0,
      firstJournal: journals.length > 0 ? journals[0] : null
    });

    // 総数を取得
    logger.debug('Fetching total count...');
    const totalCount = await db.count('journals', filter);
    logger.debug('Total count:', totalCount);

    const response = {
      success: true,
      journals,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    };

    logger.debug('API Response:', {
      success: response.success,
      journalsCount: response.journals.length,
      totalCount: response.totalCount,
      currentPage: response.currentPage,
      totalPages: response.totalPages
    });

    logger.debug('===== Journals API GET Request End =====');

    return NextResponse.json(response);

  } catch (error) {
    logger.error('===== Journal API Error =====');
    logger.error('Error object:', error);
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    // より詳細なエラーメッセージ
    let errorMessage = '予期しないエラーが発生しました';
    if (error instanceof Error) {
      if (error.message.includes('MONGODB_URI')) {
        errorMessage = 'データベース接続設定が不足しています';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'データベースに接続できません';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = 'データベース接続がタイムアウトしました';
      } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        errorMessage = 'データベース認証に失敗しました';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      } : undefined
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30; // Vercel function timeout in seconds