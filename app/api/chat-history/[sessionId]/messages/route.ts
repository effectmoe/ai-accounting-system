import { NextRequest, NextResponse } from 'next/server';
import { getChatHistoryService } from '@/services/chat-history.service';

import { logger } from '@/lib/logger';
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
    const { sessionId } = params;
    const body = await request.json();
    const { content, role, metadata } = body;

    if (!content || !role) {
      return NextResponse.json(
        { success: false, error: 'content and role are required' },
        { status: 400 }
      );
    }

    const message = await chatHistoryService.addMessage(sessionId, {
      content,
      role,
      metadata
    });

    return NextResponse.json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.error(`Chat message POST error for session ${params.sessionId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add message'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat-history/[sessionId]/messages
 * セッションのメッセージ一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const chatHistoryService = getChatHistoryService();
  
  try {
    const { sessionId } = params;
    const session = await chatHistoryService.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messages: session.messages,
        sessionInfo: {
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }
      }
    });

  } catch (error) {
    logger.error(`Chat messages GET error for session ${params.sessionId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages'
      },
      { status: 500 }
    );
  }
}