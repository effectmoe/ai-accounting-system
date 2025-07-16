import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

/**
 * GET /api/chat-history
 * チャットセッション一覧の取得
 */
export async function GET(request: NextRequest) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as 'active' | 'archived' | 'deleted' || 'active';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'lastActiveAt' || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc';
    const query = searchParams.get('q');

    let result;
    
    if (query) {
      // 検索モード
      result = await chatHistoryService.searchSessions(query, userId || undefined, {
        limit,
        offset
      });
    } else {
      // 通常の一覧取得
      result = await chatHistoryService.getUserSessions(userId || undefined, {
        limit,
        offset,
        status,
        sortBy,
        sortOrder
      });
    }

    return NextResponse.json({
      success: true,
      data: result.sessions,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total
      }
    });

  } catch (error) {
    console.error('Chat history GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch chat history'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-history
 * 新しいチャットセッションの作成
 */
export async function POST(request: NextRequest) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const body = await request.json();
    const { userId, title } = body;

    const session = await chatHistoryService.createSession(userId, title);

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Chat history POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create chat session'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-history
 * チャットセッションの削除
 */
export async function DELETE(request: NextRequest) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const permanent = searchParams.get('permanent') === 'true';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const success = await chatHistoryService.deleteSession(sessionId, !permanent);

    return NextResponse.json({
      success,
      message: success 
        ? (permanent ? 'Session permanently deleted' : 'Session moved to trash')
        : 'Session not found'
    });

  } catch (error) {
    console.error('Chat history DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete chat session'
      },
      { status: 500 }
    );
  }
}