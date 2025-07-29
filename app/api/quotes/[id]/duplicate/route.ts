import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[POST /api/quotes/[id]/duplicate] Duplicating quote:', params.id);
    
    const quoteService = new QuoteService();
    
    // 元の見積書を取得
    const originalQuote = await quoteService.getQuote(params.id);
    
    if (!originalQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }
    
    // 新しい見積書番号を生成
    const newQuoteNumber = await quoteService.generateQuoteNumber();
    
    // 見積書データをコピー（IDと一部フィールドを除外）
    const {
      _id,
      quoteNumber,
      status,
      createdAt,
      updatedAt,
      convertedToInvoiceId,
      convertedToInvoiceDate,
      acceptedDate,
      rejectedDate,
      expiredDate,
      aiConversationId,
      isGeneratedByAI,
      aiGenerationMetadata,
      title,
      ...quoteData
    } = originalQuote;
    
    // 新しい見積書を作成
    const newQuote = await quoteService.createQuote({
      ...quoteData,
      quoteNumber: newQuoteNumber,
      title: title ? `${title}のコピー` : undefined,
      status: 'draft', // 複製時は必ず下書きステータス
      issueDate: new Date(), // 発行日は本日
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 有効期限は30日後
      isGeneratedByAI: false, // 複製は手動作成扱い
    });
    
    logger.info(`Quote duplicated successfully: ${originalQuote.quoteNumber} -> ${newQuote.quoteNumber}`);
    
    return NextResponse.json(newQuote);
  } catch (error) {
    logger.error('Error duplicating quote:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate quote' },
      { status: 500 }
    );
  }
}