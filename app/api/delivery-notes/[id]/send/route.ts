import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { getDatabase } from '@/lib/mongodb';
import { CompanyInfoService } from '@/services/company-info.service';
import { sendDeliveryNoteEmail, getGmailConfigStatus } from '@/lib/gmail-service';
import { generateDeliveryNotePDFWithPuppeteer } from '@/lib/pdf-puppeteer-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info('[Send DeliveryNote API] Request started for deliveryNoteId:', params.id);
    const requestBody = await request.json();
    logger.debug('[Send DeliveryNote API] Received data:', JSON.stringify(requestBody, null, 2));

    const { recipientEmail, customMessage, ccEmails, bccEmails } = requestBody;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: '宛先メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // 納品書を取得
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    const deliveryNoteResult = await collection
      .aggregate([
        { $match: { _id: new ObjectId(params.id) } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
      ])
      .toArray();

    if (!deliveryNoteResult || deliveryNoteResult.length === 0) {
      return NextResponse.json(
        { error: '納品書が見つかりません' },
        { status: 404 }
      );
    }

    const deliveryNote = deliveryNoteResult[0];

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
    logger.debug('[Send DeliveryNote API] Gmail config status:', gmailStatus);

    // 顧客名を取得
    const customerName = deliveryNote.customer?.companyName ||
                         deliveryNote.customer?.name ||
                         deliveryNote.customer?.contacts?.[0]?.name ||
                         'お客様';

    // PDF生成
    let pdfBuffer: Buffer | undefined;
    try {
      logger.info('[Send DeliveryNote API] Generating PDF for delivery note:', deliveryNote.deliveryNoteNumber);
      pdfBuffer = await generateDeliveryNotePDFWithPuppeteer(deliveryNote, companyInfo);
      logger.info('[Send DeliveryNote API] PDF generated successfully, size:', pdfBuffer.length);
    } catch (pdfError) {
      logger.warn('[Send DeliveryNote API] PDF generation failed, sending without attachment:', pdfError);
      // PDF生成に失敗してもメール送信は続行
    }

    // Gmail サービスでメール送信
    const emailResult = await sendDeliveryNoteEmail({
      deliveryNoteId: params.id,
      deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
      customerName,
      customerEmail: recipientEmail,
      companyInfo,
      pdfBuffer,
      ccEmails: ccEmails || [],
      bccEmails: bccEmails || [],
      customMessage,
      replyTo: companyInfo.email,
    });

    logger.info('[Send DeliveryNote API] Email result:', emailResult);

    if (!emailResult.success) {
      logger.error('[Send DeliveryNote API] Gmail send error:', emailResult.error);

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

    logger.info(`DeliveryNote ${deliveryNote.deliveryNoteNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId || 'unknown',
      trackingId: emailResult.trackingId,
      sentAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error sending delivery note email:', error);
    console.error('[Send DeliveryNote API] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      { error: `納品書の送信に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
