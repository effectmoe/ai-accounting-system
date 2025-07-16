import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

/**
 * POST /api/chat-history/[sessionId]/messages
 * セッションにメッセージを追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const body = await request.json();
    const message = await chatHistoryService.addMessage(params.sessionId, body);

    return NextResponse.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message'
      },
      { status: 500 }
    );
  }
}