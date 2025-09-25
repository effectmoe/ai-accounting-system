import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    logger.debug('[POST /api/quotes/[id]/undo-convert-to-invoice] Quote ID:', { quoteId: id });

    const quoteService = new QuoteService();

    // 請求書変換を取り消し
    const quote = await quoteService.undoConvertToInvoice(id);

    logger.debug('[POST /api/quotes/[id]/undo-convert-to-invoice] Conversion undone:', {
      quoteId: quote._id,
      quoteNumber: quote.quoteNumber,
      status: quote.status
    });

    return NextResponse.json({
      success: true,
      quote,
      message: '請求書変換を取り消しました'
    });
  } catch (error) {
    logger.error('Error undoing quote to invoice conversion:', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to undo quote to invoice conversion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}