import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/services/invoice.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[POST /api/invoices/[id]/duplicate] Duplicating invoice:', params.id);
    
    const invoiceService = new InvoiceService();
    
    // 元の請求書を取得
    const originalInvoice = await invoiceService.getInvoice(params.id);
    
    if (!originalInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // 新しい請求書番号を生成
    const newInvoiceNumber = await invoiceService.generateInvoiceNumber();
    
    // 請求書データをコピー（IDと一部フィールドを除外）
    const {
      _id,
      invoiceNumber,
      status,
      createdAt,
      updatedAt,
      convertedToDeliveryNoteId,
      convertedToDeliveryNoteDate,
      paidDate,
      paidAmount,
      cancelledAt,
      aiConversationId,
      isGeneratedByAI,
      aiGenerationMetadata,
      title,
      ...invoiceData
    } = originalInvoice;

    // 商品アイテムからproductIdを削除（複製時は全てカスタム商品として扱う）
    if (invoiceData.items) {
      invoiceData.items = invoiceData.items.map((item: any) => {
        const { productId, ...itemWithoutProductId } = item;
        return itemWithoutProductId;
      });
      logger.debug('[POST /api/invoices/[id]/duplicate] Removed productId from items for editing flexibility');
    }

    // 新しい請求書を作成
    const newInvoice = await invoiceService.createInvoice({
      ...invoiceData,
      invoiceNumber: newInvoiceNumber,
      title: title ? `${title}のコピー` : undefined,
      status: 'draft', // 複製時は必ず下書きステータス
      issueDate: new Date(), // 発行日は本日
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 支払期限は30日後
      isGeneratedByAI: false, // 複製は手動作成扱い
    });
    
    logger.info(`Invoice duplicated successfully: ${originalInvoice.invoiceNumber} -> ${newInvoice.invoiceNumber}`);
    
    return NextResponse.json(newInvoice);
  } catch (error) {
    logger.error('Error duplicating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate invoice' },
      { status: 500 }
    );
  }
}