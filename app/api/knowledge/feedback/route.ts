import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  const knowledgeService = new KnowledgeService();

  try {
    const body = await request.json();
    const { messageId, sessionId, feedback } = body;

    if (!messageId || !sessionId || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['good', 'bad'].includes(feedback)) {
      return NextResponse.json(
        { error: 'Invalid feedback value' },
        { status: 400 }
      );
    }

    await knowledgeService.connect();

    // フィードバックログを記録
    await knowledgeService.createProcessingLog({
      operation: 'user_feedback',
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(),
      metadata: {
        messageId,
        sessionId,
        feedback,
        timestamp: new Date().toISOString()
      }
    });

    await knowledgeService.disconnect();

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    logger.error('Feedback API error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to record feedback'
      },
      { status: 500 }
    );
  }
}