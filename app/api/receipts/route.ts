import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { ReceiptStatus } from '@/types/receipt';
import { ActivityLogService } from '@/services/activity-log.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const receiptService = new ReceiptService();

    // クエリパラメータの取得
    const customerId = searchParams.get('customerId') || undefined;
    const invoiceId = searchParams.get('invoiceId') || undefined;
    const status = searchParams.get('status') as ReceiptStatus | undefined;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;
    const scannedFromPdfParam = searchParams.get('scannedFromPdf');
    const scannedFromPdf = scannedFromPdfParam === 'true' ? true : scannedFromPdfParam === 'false' ? false : undefined;
    const search = searchParams.get('search') || undefined;
    const accountCategory = searchParams.get('accountCategory') || undefined;
    const amountMin = searchParams.get('amountMin') ? parseFloat(searchParams.get('amountMin')!) : undefined;
    const amountMax = searchParams.get('amountMax') ? parseFloat(searchParams.get('amountMax')!) : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const sortBy = searchParams.get('sortBy') || 'issueDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const result = await receiptService.searchReceipts({
      customerId,
      invoiceId,
      status,
      dateFrom,
      dateTo,
      scannedFromPdf,
      search,
      accountCategory,
      amountMin,
      amountMax,
      limit,
      skip,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('Receipt creation request:', JSON.stringify(body, null, 2));

    const receiptService = new ReceiptService();

    // 直接作成の場合と請求書から作成の場合を分岐
    let receipt;

    if (body.invoiceId) {
      // 請求書から領収書を作成
      receipt = await receiptService.createReceiptFromInvoice({
        invoiceId: body.invoiceId,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        subject: body.subject,
        notes: body.notes
      });
    } else {
      // 直接作成の場合
      // 領収書番号を生成（body.receiptNumberが指定されていない場合）
      const receiptNumber = body.receiptNumber ||
        await (receiptService as any).generateReceiptNumber();

      const receiptData = {
        ...body,
        receiptNumber,
        issueDate: new Date(body.issueDate || new Date()),
        paidDate: body.paidDate ? new Date(body.paidDate) : undefined,
        status: body.status || 'draft' as ReceiptStatus,
      };

      receipt = await receiptService.createReceipt(receiptData);
    }

    // 確実に_idが存在することを確認
    if (!receipt || !receipt._id) {
      logger.error('Created receipt missing _id:', receipt);
      throw new Error('Receipt was created but ID is missing');
    }

    logger.debug('Receipt created successfully with ID:', receipt._id);

    // アクティビティログを記録
    try {
      const customerName = (receipt as any).customer?.companyName || receipt.customerName || '不明な顧客';
      await ActivityLogService.log({
        type: 'receipt_created',
        targetType: 'receipt',
        targetId: receipt._id.toString(),
        description: `領収書 ${receipt.receiptNumber} を作成しました`,
        metadata: {
          receiptNumber: receipt.receiptNumber,
          customerName,
          totalAmount: receipt.totalAmount,
          invoiceId: receipt.invoiceId?.toString(),
          invoiceNumber: receipt.invoiceNumber,
        },
      });
      logger.info('Activity log recorded for receipt creation');
    } catch (logError) {
      logger.error('Failed to log activity for receipt creation:', logError);
    }

    return NextResponse.json(receipt);
  } catch (error) {
    logger.error('Error creating receipt:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: 'Failed to create receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}