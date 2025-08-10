import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    logger.debug('[POST /api/quotes/[id]/email-history] Quote ID:', id);
    logger.debug('[POST /api/quotes/[id]/email-history] Email data:', JSON.stringify(body, null, 2));
    
    const quoteService = new QuoteService();
    const quote = await quoteService.getQuote(id);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // メール送信履歴を更新
    const emailHistory = quote.emailHistory || [];
    emailHistory.push({
      ...body,
      id: Date.now().toString(),
      timestamp: body.sentAt || new Date().toISOString()
    });
    
    await quoteService.updateQuote(id, { 
      emailHistory,
      lastEmailSentAt: body.sentAt || new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error recording email history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record email history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}