import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

import { logger } from '@/lib/logger';
/**
 * POST /api/chat-history/[sessionId]/bookmark
 * セッションのブックマークを切り替え
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const success = await chatHistoryService.toggleBookmark(params.sessionId);

    return NextResponse.json({
      success,
      message: success ? 'Bookmark toggled' : 'Session not found'
    });

  } catch (error) {
    logger.error('Toggle bookmark error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle bookmark'
      },
      { status: 500 }
    );
  }
}