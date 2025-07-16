import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

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
    const session = await chatHistoryService.getSession(params.sessionId);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('Chat history GET error:', error);
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
    const body = await request.json();
    const { title, category, specialization } = body;

    await chatHistoryService.connect();
    const db = (chatHistoryService as any).db;
    const result = await db.collection('chat_sessions').updateOne(
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

    return NextResponse.json({
      success: result.modifiedCount > 0,
      message: result.modifiedCount > 0 ? 'Session updated' : 'Session not found'
    });

  } catch (error) {
    console.error('Chat history PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session'
      },
      { status: 500 }
    );
  }
}