import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

import { logger } from '@/lib/logger';
/**
 * POST /api/chat-history/[sessionId]/archive
 * セッションをアーカイブ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const success = await chatHistoryService.archiveSession(params.sessionId);

    return NextResponse.json({
      success,
      message: success ? 'Session archived' : 'Session not found'
    });

  } catch (error) {
    logger.error('Archive session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive session'
      },
      { status: 500 }
    );
  }
}