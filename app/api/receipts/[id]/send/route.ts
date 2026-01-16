import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ReceiptService } from '@/services/receipt.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { sendReceiptEmail, getGmailConfigStatus } from '@/lib/gmail-service';
import { generateReceiptPDFWithPuppeteer } from '@/lib/pdf-puppeteer-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info('[Send Receipt API] Request started for receiptId:', params.id);
    const requestBody = await request.json();
    logger.debug('[Send Receipt API] Received data:', JSON.stringify(requestBody, null, 2));

    const { recipientEmail, customMessage, ccEmails, bccEmails } = requestBody;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: '宛先メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // サービス経由で領収書を取得
    const receiptService = new ReceiptService();
    const receipt = await receiptService.getReceipt(params.id);

    if (!receipt) {
      return NextResponse.json(
        { error: '領収書が見つかりません' },
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
    logger.debug('[Send Receipt API] Gmail config status:', gmailStatus);

    // 顧客名を取得
    const customerName = (receipt as any).customer?.companyName ||
                         (receipt as any).customer?.name ||
                         receipt.customerName ||
                         'お客様';

    // PDF生成
    let pdfBuffer: Buffer | undefined;
    try {
      logger.info('[Send Receipt API] Generating PDF for receipt:', receipt.receiptNumber);
      pdfBuffer = await generateReceiptPDFWithPuppeteer(receipt, companyInfo);
      logger.info('[Send Receipt API] PDF generated successfully, size:', pdfBuffer.length);
    } catch (pdfError) {
      logger.warn('[Send Receipt API] PDF generation failed, sending without attachment:', pdfError);
      // PDF生成に失敗してもメール送信は続行
    }

    // Gmail サービスでメール送信
    const emailResult = await sendReceiptEmail({
      receiptId: params.id,
      receiptNumber: receipt.receiptNumber,
      customerName,
      customerEmail: recipientEmail,
      companyInfo,
      totalAmount: receipt.totalAmount,
      pdfBuffer,
      ccEmails: ccEmails || [],
      bccEmails: bccEmails || [],
      customMessage,
      replyTo: companyInfo.email,
    });

    logger.info('[Send Receipt API] Email result:', emailResult);

    if (!emailResult.success) {
      logger.error('[Send Receipt API] Gmail send error:', emailResult.error);

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

    logger.info(`Receipt ${receipt.receiptNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId || 'unknown',
      trackingId: emailResult.trackingId,
      sentAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error sending receipt email:', error);
    console.error('[Send Receipt API] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: `領収書の送信に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
