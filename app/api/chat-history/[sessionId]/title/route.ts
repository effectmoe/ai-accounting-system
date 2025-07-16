import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

/**
 * POST /api/chat-history/[sessionId]/title
 * セッションのタイトルを自動生成
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const title = await chatHistoryService.generateSessionTitle(params.sessionId);

    return NextResponse.json({
      success: true,
      data: { title }
    });

  } catch (error) {
    console.error('Generate title error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate title'
      },
      { status: 500 }
    );
  }
}