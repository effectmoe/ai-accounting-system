import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { ObjectId } from 'mongodb';

interface VoteRequest {
  faqId: string;
  voteType: 'helpful' | 'unhelpful';
}

export async function POST(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const body: VoteRequest = await request.json();
    const { faqId, voteType } = body;
    
    if (!faqId || !voteType) {
      return NextResponse.json(
        { error: 'Required fields missing: faqId, voteType' },
        { status: 400 }
      );
    }
    
    if (!['helpful', 'unhelpful'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }
    
    await knowledgeService.connect();
    
    const collection = knowledgeService.db.collection('faq_articles');
    
    // 投票数を更新
    const updateField = voteType === 'helpful' ? 'usageStats.helpfulVotes' : 'usageStats.unhelpfulVotes';
    const result = await collection.updateOne(
      { _id: new ObjectId(faqId) },
      { 
        $inc: { [updateField]: 1 },
        $set: { 
          'usageStats.lastViewed': new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }
    
    // 利用ログを記録
    const usageLogCollection = knowledgeService.db.collection('faq_usage_logs');
    await usageLogCollection.insertOne({
      faqId,
      action: voteType,
      sessionId: request.headers.get('x-session-id') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date()
    });
    
    await knowledgeService.disconnect();
    
    return NextResponse.json({
      success: true,
      message: 'Vote recorded successfully'
    });
    
  } catch (error) {
    console.error('[FAQ Vote] Error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to record vote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}