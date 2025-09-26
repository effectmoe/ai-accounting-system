import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { InvoiceService } from '@/services/invoice.service';
import { ActivityLogService } from '@/services/activity-log.service';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[POST /api/invoices/[id]/convert-to-receipt] Request for invoice ID:', params.id);
    const body = await request.json();

    const receiptService = new ReceiptService();
    const invoiceService = new InvoiceService();

    // 請求書の存在確認
    const invoice = await invoiceService.getInvoice(params.id);
    if (!invoice) {
      logger.debug('Invoice not found for conversion:', params.id);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // すでに領収書が作成されているかチェック
    const existingReceipts = await receiptService.searchReceipts({
      invoiceId: params.id,
      limit: 1
    });

    if (existingReceipts.receipts.length > 0) {
      logger.debug('Receipt already exists for invoice:', params.id);
      return NextResponse.json(
        {
          error: 'Receipt already exists for this invoice',
          existingReceiptId: existingReceipts.receipts[0]._id
        },
        { status: 400 }
      );
    }

    // 請求書から領収書を作成
    const receipt = await receiptService.createReceiptFromInvoice({
      invoiceId: params.id,
      issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
      subject: body.subject,
      notes: body.notes
    });

    // 請求書に領収書作成のフラグを設定（必要に応じて）
    try {
      // 請求書に「領収書発行済み」のステータス情報を追加
      await invoiceService.updateInvoice(params.id, {
        receiptIssued: true,
        receiptIssuedAt: new Date(),
        receiptId: receipt._id
      });
    } catch (updateError) {
      logger.error('Failed to update invoice with receipt info:', updateError);
      // 領収書は作成されているので、エラーにしない
    }

    // アクティビティログを記録
    try {
      const customerName = (receipt as any).customer?.companyName || receipt.customerName || '不明な顧客';

      await ActivityLogService.log({
        type: 'receipt_created_from_invoice',
        targetType: 'receipt',
        targetId: receipt._id!.toString(),
        description: `請求書 ${invoice.invoiceNumber} から領収書 ${receipt.receiptNumber} を作成しました`,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          invoiceId: params.id,
          invoiceNumber: invoice.invoiceNumber,
          customerName,
          totalAmount: receipt.totalAmount,
        },
      });

      // 請求書の方にもログを記録
      await ActivityLogService.log({
        type: 'invoice_converted_to_receipt',
        targetType: 'invoice',
        targetId: params.id,
        description: `請求書 ${invoice.invoiceNumber} から領収書 ${receipt.receiptNumber} を作成しました`,
        metadata: {
          receiptId: receipt._id!.toString(),
          receiptNumber: receipt.receiptNumber,
          invoiceNumber: invoice.invoiceNumber,
          customerName,
          totalAmount: receipt.totalAmount,
        },
      });

      logger.info('Activity log recorded for receipt creation from invoice');
    } catch (logError) {
      logger.error('Failed to log activity for receipt creation from invoice:', logError);
    }

    logger.info(`Receipt created from invoice: ${receipt.receiptNumber} from ${invoice.invoiceNumber}`);

    return NextResponse.json({
      success: true,
      receipt,
      message: `請求書 ${invoice.invoiceNumber} から領収書 ${receipt.receiptNumber} を作成しました`
    });
  } catch (error) {
    logger.error('Error converting invoice to receipt:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to convert invoice to receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[GET /api/invoices/[id]/convert-to-receipt] Checking conversion status for invoice ID:', params.id);

    const receiptService = new ReceiptService();
    const invoiceService = new InvoiceService();

    // 請求書の存在確認
    const invoice = await invoiceService.getInvoice(params.id);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // 関連する領収書を検索
    const existingReceipts = await receiptService.searchReceipts({
      invoiceId: params.id,
      limit: 10  // 複数の領収書が作成されている場合もあるため
    });

    return NextResponse.json({
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        paidDate: invoice.paidDate
      },
      receipts: existingReceipts.receipts.map(receipt => ({
        id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        totalAmount: receipt.totalAmount,
        status: receipt.status,
        issueDate: receipt.issueDate,
        createdAt: receipt.createdAt
      })),
      canConvert: existingReceipts.receipts.length === 0, // 領収書がない場合のみ変換可能
      totalReceipts: existingReceipts.total
    });
  } catch (error) {
    logger.error('Error checking invoice conversion status:', error);
    return NextResponse.json(
      { error: 'Failed to check conversion status' },
      { status: 500 }
    );
  }
}