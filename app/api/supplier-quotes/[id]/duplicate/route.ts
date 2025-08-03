import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[POST /api/supplier-quotes/[id]/duplicate] Duplicating supplier quote:', params.id);
    
    const supplierQuoteService = new SupplierQuoteService();
    
    // 元の仕入先見積書を取得
    const originalQuote = await supplierQuoteService.getSupplierQuote(params.id);
    
    if (!originalQuote) {
      return NextResponse.json(
        { error: 'Supplier quote not found' },
        { status: 404 }
      );
    }
    
    // 新しい見積書番号を生成
    const newQuoteNumber = await supplierQuoteService.generateQuoteNumber();
    
    // 見積書データをコピー（IDと一部フィールドを除外）
    const {
      _id,
      quoteNumber,
      status,
      createdAt,
      updatedAt,
      convertedToPurchaseOrderId,
      convertedToPurchaseOrderDate,
      acceptedDate,
      rejectedDate,
      expiredDate,
      aiConversationId,
      isGeneratedByAI,
      aiGenerationMetadata,
      title,
      ...quoteData
    } = originalQuote;
    
    // 新しい仕入先見積書を作成
    const newQuote = await supplierQuoteService.createSupplierQuote({
      ...quoteData,
      quoteNumber: newQuoteNumber,
      title: title ? `${title}のコピー` : undefined,
      status: 'pending', // 複製時は保留ステータス
      issueDate: new Date(), // 発行日は本日
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 有効期限は30日後
      isGeneratedByAI: false, // 複製は手動作成扱い
    });
    
    logger.info(`Supplier quote duplicated successfully: ${originalQuote.quoteNumber} -> ${newQuote.quoteNumber}`);
    
    return NextResponse.json(newQuote);
  } catch (error) {
    logger.error('Error duplicating supplier quote:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate supplier quote' },
      { status: 500 }
    );
  }
}