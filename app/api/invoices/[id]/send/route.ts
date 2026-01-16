import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { sendInvoiceEmail, getGmailConfigStatus } from '@/lib/gmail-service';
import { generateInvoicePDFWithPuppeteer } from '@/lib/pdf-puppeteer-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info('[Send Invoice API] Request started for invoiceId:', params.id);
    const requestBody = await request.json();
    logger.debug('[Send Invoice API] Received data:', JSON.stringify(requestBody, null, 2));

    const { recipientEmail, customMessage, ccEmails, bccEmails } = requestBody;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: '宛先メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // サービス経由で請求書を取得
    const invoiceService = new InvoiceService();
    const invoice = await invoiceService.getInvoice(params.id);

    if (!invoice) {
      return NextResponse.json(
        { error: '請求書が見つかりません' },
        { status: 404 }
      );
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    if (!companyInfo) {
      return NextResponse.json(
        { error: '会社情報が設定されていません' },
        { status: 400 }
      );
    }

    // Gmail設定状態を確認
    const gmailStatus = getGmailConfigStatus();
    logger.debug('[Send Invoice API] Gmail config status:', gmailStatus);

    // 顧客名を取得
    const customerName = invoice.customer?.companyName ||
                         invoice.customer?.name ||
                         invoice.customer?.contacts?.[0]?.name ||
                         'お客様';

    // PDF生成
    let pdfBuffer: Buffer | undefined;
    try {
      logger.info('[Send Invoice API] Generating PDF for invoice:', invoice.invoiceNumber);
      pdfBuffer = await generateInvoicePDFWithPuppeteer(invoice, companyInfo);
      logger.info('[Send Invoice API] PDF generated successfully, size:', pdfBuffer.length);
    } catch (pdfError) {
      logger.warn('[Send Invoice API] PDF generation failed, sending without attachment:', pdfError);
      // PDF生成に失敗してもメール送信は続行
    }

    // Gmail サービスでメール送信
    const emailResult = await sendInvoiceEmail({
      invoiceId: params.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName,
      customerEmail: recipientEmail,
      companyInfo,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate?.toISOString(),
      pdfBuffer,
      ccEmails: ccEmails || [],
      bccEmails: bccEmails || [],
      customMessage,
      replyTo: companyInfo.email,
    });

    logger.info('[Send Invoice API] Email result:', emailResult);

    if (!emailResult.success) {
      logger.error('[Send Invoice API] Gmail send error:', emailResult.error);

      // 認証エラーの特別処理
      if (emailResult.error?.includes('OAuth') || emailResult.error?.includes('token')) {
        return NextResponse.json(
          { error: 'メール送信サービスの認証に失敗しました。管理者にお問い合わせください。' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: `メール送信に失敗しました: ${emailResult.error}` },
        { status: 500 }
      );
    }

    logger.info(`Invoice ${invoice.invoiceNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId || 'unknown',
      trackingId: emailResult.trackingId,
      sentAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error sending invoice email:', error);
    console.error('[Send Invoice API] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: `請求書の送信に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
