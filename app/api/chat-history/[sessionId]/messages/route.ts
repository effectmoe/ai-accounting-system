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
    console.log('[Add Message API] Received request for session:', params.sessionId);
    const body = await request.json();
    console.log('[Add Message API] Message body:', JSON.stringify(body));
    
    // セッションが存在するか確認
    const session = await chatHistoryService.getSession(params.sessionId);
    if (!session) {
      console.log('[Add Message API] Session not found, creating new session');
      // セッションが存在しない場合は作成
      await chatHistoryService.createSession(undefined, `税務・会計相談 ${new Date().toLocaleDateString()}`);
    }
    
    const message = await chatHistoryService.addMessage(params.sessionId, body);
    console.log('[Add Message API] Message added successfully:', message.id);

    return NextResponse.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('[Add Message API] Error:', error);
    console.error('[Add Message API] Stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message'
      },
      { status: 500 }
    );
  }
}