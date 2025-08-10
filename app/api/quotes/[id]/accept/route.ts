import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { generateQuotePDF } from '@/lib/pdf-generator';
import { sendQuoteEmail } from '@/lib/resend-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { acceptedAt, acceptedBy, ipAddress, userAgent } = body;

    const { db } = await connectToDatabase();
    const quoteId = params.id;

    // 見積書を取得
    const quote = await db.collection('quotes').findOne({
      _id: new ObjectId(quoteId)
    });

    if (!quote) {
      return NextResponse.json(
        { error: '見積書が見つかりません' },
        { status: 404 }
      );
    }

    // 承認情報を更新
    const updateResult = await db.collection('quotes').updateOne(
      { _id: new ObjectId(quoteId) },
      {
        $set: {
          status: 'accepted',
          acceptedAt: new Date(acceptedAt),
          acceptedBy,
          acceptanceDetails: {
            ipAddress,
            userAgent,
            timestamp: new Date()
          },
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('見積書の更新に失敗しました');
    }

    // 承認履歴を記録
    await db.collection('quote_history').insertOne({
      quoteId: new ObjectId(quoteId),
      quoteNumber: quote.quoteNumber,
      action: 'accepted',
      performedBy: acceptedBy,
      performedAt: new Date(),
      details: {
        previousStatus: quote.status,
        newStatus: 'accepted',
        ipAddress,
        userAgent
      }
    });

    // Resendでメール通知を送信
    try {
      // 会社情報を取得
      const companyInfo = await db.collection('company_info').findOne({});
      
      // PDFを生成
      const pdfBuffer = await generateQuotePDF(quote);
      
      // 1. 顧客への承認確認メール（PDF添付）
      if (quote.customer?.email) {
        const customMessage = `
お世話になっております。

見積書「${quote.quoteNumber}」をご承認いただき、誠にありがとうございます。
正式な見積書PDFを添付させていただきます。

見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）

ご不明な点がございましたら、お気軽にお問い合わせください。
よろしくお願いいたします。
        `;
        
        const emailResult = await sendQuoteEmail({
          quote,
          companyInfo: companyInfo || {},
          recipientEmail: quote.customer.email,
          recipientName: quote.customer.contacts?.[0]?.name || quote.customer.companyName,
          customMessage,
          attachPdf: true,
          pdfBuffer,
          replyTo: companyInfo?.email,
          tags: [
            { name: 'type', value: 'acceptance_confirmation' },
            { name: 'action', value: 'quote_accepted' }
          ]
        });
        
        if (emailResult.success) {
          logger.info(`Acceptance email sent to ${quote.customer.email} for quote ${quote.quoteNumber}`);
        } else {
          logger.error(`Failed to send acceptance email: ${emailResult.error}`);
        }
      }
      
      // 2. 社内担当者への承認通知メール
      const internalEmail = companyInfo?.email || process.env.INTERNAL_NOTIFY_EMAIL;
      
      if (internalEmail) {
        const internalMessage = `
見積書が承認されました。

見積書番号: ${quote.quoteNumber}
顧客名: ${quote.customer?.companyName || '未設定'}
見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）
承認日時: ${new Date(acceptedAt).toLocaleString('ja-JP')}
承認者: ${acceptedBy || '未設定'}

【承認者情報】
IPアドレス: ${ipAddress || '不明'}
ブラウザ: ${userAgent || '不明'}

【次のアクション】
1. 請求書の発行準備
2. 納品・作業スケジュールの確認
3. 顧客への追加連絡（必要に応じて）

詳細は管理画面でご確認ください。
        `;
        
        const internalEmailResult = await sendQuoteEmail({
          quote: {
            ...quote,
            title: `【承認通知】見積書 ${quote.quoteNumber} が承認されました`
          },
          companyInfo: companyInfo || {},
          recipientEmail: internalEmail,
          customMessage: internalMessage,
          attachPdf: true,
          pdfBuffer,
          tags: [
            { name: 'type', value: 'internal_notification' },
            { name: 'action', value: 'quote_accepted' }
          ]
        });
        
        if (internalEmailResult.success) {
          logger.info(`Internal notification sent for quote ${quote.quoteNumber} approval`);
        } else {
          logger.error(`Failed to send internal notification: ${internalEmailResult.error}`);
        }
      }
    } catch (emailError) {
      logger.error('Error sending acceptance emails via Resend:', emailError);
      // メール送信エラーは承認処理を失敗させない
    }

    logger.info(`Quote ${quote.quoteNumber} accepted by ${acceptedBy}`);

    return NextResponse.json({
      success: true,
      message: '見積書を承認しました',
      quoteNumber: quote.quoteNumber
    });

  } catch (error) {
    logger.error('Error accepting quote:', error);
    return NextResponse.json(
      { error: '承認処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}