import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

import { logger } from '@/lib/logger';
/**
 * GET /api/chat-history/[sessionId]
 * 特定のセッション情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    logger.debug(`[API] GET /api/chat-history/${params.sessionId}`);
    
    // MongoDBに接続
    await chatHistoryService.connect();
    
    const session = await chatHistoryService.getSession(params.sessionId);
    
    if (!session) {
      logger.debug(`[API] セッションが見つかりません: ${params.sessionId}`);
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    logger.debug(`[API] セッション取得成功: ${params.sessionId}`);
    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('[API] Chat history GET error:', error);
    logger.error('[API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat-history/[sessionId]
 * セッション情報を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    logger.debug(`[API] PATCH /api/chat-history/${params.sessionId}`);
    
    const body = await request.json();
    const { title, category, specialization } = body;
    
    logger.debug('[API] 更新データ:', { title, category, specialization });

    await chatHistoryService.connect();
    const db = (chatHistoryService as any).db;
    
    // sessionIdと_idの両方で検索を試みる
    let result = await db.collection('chat_sessions').updateOne(
      { sessionId: params.sessionId },
      {
        $set: {
          ...(title && { title }),
          ...(category && { category }),
          ...(specialization && { specialization }),
          updatedAt: new Date()
        }
      }
    );
    
    // sessionIdで見つからない場合は_idでも試す
    if (result.modifiedCount === 0) {
      try {
        const { ObjectId } = await import('mongodb');
        const objectId = new ObjectId(params.sessionId);
        result = await db.collection('chat_sessions').updateOne(
          { _id: objectId },
          {
            $set: {
              ...(title && { title }),
              ...(category && { category }),
              ...(specialization && { specialization }),
              updatedAt: new Date()
            }
          }
        );
      } catch (e) {
        logger.debug('[API] ObjectId変換エラー:', e);
      }
    }

    logger.debug(`[API] 更新結果: ${result.modifiedCount > 0 ? '成功' : '失敗'}`);
    
    return NextResponse.json({
      success: result.modifiedCount > 0,
      message: result.modifiedCount > 0 ? 'Session updated' : 'Session not found'
    });

  } catch (error) {
    logger.error('[API] Chat history PATCH error:', error);
    logger.error('[API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session'
      },
      { status: 500 }
    );
  }
}