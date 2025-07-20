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
    
    logger.debug('[POST /api/quotes/[id]/convert-to-invoice] Quote ID:', id);
    logger.debug('[POST /api/quotes/[id]/convert-to-invoice] Invoice data:', JSON.stringify(body, null, 2));
    
    const quoteService = new QuoteService();
    
    // 見積書を請求書に変換
    const invoice = await quoteService.convertToInvoice(id, body);
    
    logger.debug('[POST /api/quotes/[id]/convert-to-invoice] Invoice created:', invoice._id);
    
    return NextResponse.json(invoice);
  } catch (error) {
    logger.error('Error converting quote to invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to convert quote to invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}