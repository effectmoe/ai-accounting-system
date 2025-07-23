import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    logger.debug('===== Journal Detail API GET Request Start =====');
    logger.debug('Journal ID:', id);
    logger.debug('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI_exists: !!process.env.MONGODB_URI,
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      timestamp: new Date().toISOString()
    });

    // IDの検証
    if (!id) {
      return NextResponse.json({
        success: false,
        error: '仕訳IDが指定されていません'
      }, { status: 400 });
    }

    // ObjectIdの形式チェック
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      logger.error('Invalid ObjectId format:', id);
      return NextResponse.json({
        success: false,
        error: '無効な仕訳IDです'
      }, { status: 400 });
    }

    // 仕訳を取得
    logger.debug('Fetching journal from database...');
    const journal = await db.findOne('journals', { _id: objectId });

    if (!journal) {
      logger.warn('Journal not found:', id);
      return NextResponse.json({
        success: false,
        error: '指定された仕訳が見つかりませんでした'
      }, { status: 404 });
    }

    logger.debug('Journal fetched successfully:', {
      id: journal._id,
      journalNumber: journal.journalNumber,
      status: journal.status,
      linesCount: journal.lines?.length || 0
    });

    const response = {
      success: true,
      journal
    };

    logger.debug('===== Journal Detail API GET Request End =====');

    return NextResponse.json(response);

  } catch (error) {
    logger.error('===== Journal Detail API Error =====');
    logger.error('Error object:', error);
    logger.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    // エラーメッセージの詳細化
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

// DELETE メソッド（将来の実装用）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    logger.debug('===== Journal Delete API Request Start =====');
    logger.debug('Journal ID:', id);

    // ObjectIdの形式チェック
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '無効な仕訳IDです'
      }, { status: 400 });
    }

    // 仕訳を削除
    const result = await db.deleteOne('journals', { _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json({
        success: false,
        error: '指定された仕訳が見つかりませんでした'
      }, { status: 404 });
    }

    logger.debug('Journal deleted successfully:', id);

    return NextResponse.json({
      success: true,
      message: '仕訳が正常に削除されました'
    });

  } catch (error) {
    logger.error('Journal Delete Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '仕訳の削除に失敗しました'
    }, { status: 500 });
  }
}

// PUT メソッド（将来の実装用）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    logger.debug('===== Journal Update API Request Start =====');
    logger.debug('Journal ID:', id);
    logger.debug('Update data:', body);

    // ObjectIdの形式チェック
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '無効な仕訳IDです'
      }, { status: 400 });
    }

    // 更新データから不要なフィールドを削除
    const { _id, ...updateData } = body;
    updateData.updatedAt = new Date();

    // 仕訳を更新
    const result = await db.updateOne(
      'journals',
      { _id: objectId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: '指定された仕訳が見つかりませんでした'
      }, { status: 404 });
    }

    // 更新後の仕訳を取得
    const updatedJournal = await db.findOne('journals', { _id: objectId });

    logger.debug('Journal updated successfully:', id);

    return NextResponse.json({
      success: true,
      journal: updatedJournal
    });

  } catch (error) {
    logger.error('Journal Update Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '仕訳の更新に失敗しました'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;