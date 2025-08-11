// 検討中ステータスAPIエンドポイント
// Created: 2025-08-11
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { generateQuotePDF } from '@/lib/pdf-quote-generator-simple';
import { sendQuoteEmail } from '@/lib/resend-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { consideredAt, consideredBy, ipAddress, userAgent } = body;

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

    // 検討中ステータスに更新
    const updateResult = await db.collection('quotes').updateOne(
      { _id: new ObjectId(quoteId) },
      {
        $set: {
          status: 'considering',
          consideredAt: new Date(consideredAt),
          consideredBy,
          considerationDetails: {
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

    // 検討中履歴を記録
    await db.collection('quote_history').insertOne({
      quoteId: new ObjectId(quoteId),
      quoteNumber: quote.quoteNumber,
      action: 'considering',
      performedBy: consideredBy,
      performedAt: new Date(),
      details: {
        previousStatus: quote.status,
        newStatus: 'considering',
        ipAddress,
        userAgent
      }
    });

    // Resendでメール通知を送信
    try {
      // 会社情報を取得
      const companyInfo = await db.collection('company_info').findOne({});
      
      // PDFを生成
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generateQuotePDF(quote);
      } catch (pdfError) {
        logger.error('PDF generation failed:', pdfError);
        // PDF生成が失敗してもメールは送信する
        pdfBuffer = Buffer.from('検討中見積書', 'utf-8');
      }
      
      // 1. 顧客への検討中通知メール（PDF添付）
      if (quote.customer?.email && quote.customer.email.trim() !== '') {
        const customMessage = `
お世話になっております。

見積書「${quote.quoteNumber}」をご検討いただき、誠にありがとうございます。
現在、社内にて検討いただいているとのことで承知いたしました。

見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）

ご検討の結果、ご不明な点やご要望がございましたら、
お気軽にお問い合わせください。

何か追加のご説明やご提案が必要な場合は、
遠慮なくお申し付けください。

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
            { name: 'type', value: 'consideration_notification' },
            { name: 'action', value: 'quote_considering' }
          ]
        });
        
        if (emailResult.success) {
          logger.info(`Consideration email sent to ${quote.customer.email} for quote ${quote.quoteNumber}`);
        } else {
          logger.error(`Failed to send consideration email: ${emailResult.error}`);
        }
      } else {
        logger.warn(`Customer email not set for quote ${quote.quoteNumber}. Skipping customer notification.`);
      }
      
      // 2. 社内担当者への検討中通知メール
      const internalEmail = companyInfo?.email || process.env.INTERNAL_NOTIFY_EMAIL;
      
      if (internalEmail) {
        const internalMessage = `
見積書が検討中ステータスに変更されました。

見積書番号: ${quote.quoteNumber}
顧客名: ${quote.customer?.companyName || '未設定'}
顧客メール: ${quote.customer?.email && quote.customer.email.trim() !== '' ? quote.customer.email : '未設定（要注意）'}
見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）
検討開始日時: ${new Date(consideredAt).toLocaleString('ja-JP')}
検討者: ${consideredBy || '未設定'}

【検討者情報】
IPアドレス: ${ipAddress || '不明'}
ブラウザ: ${userAgent || '不明'}

【顧客通知メール】
${quote.customer?.email && quote.customer.email.trim() !== '' ? '✓ 顧客に検討中通知メールを送信しました' : '⚠ 顧客メールアドレスが未設定のため、顧客への通知をスキップしました'}

【推奨アクション】
1. 1週間後にフォローアップ
2. 追加提案の準備
3. 価格調整の検討（必要に応じて）
${quote.customer?.email && quote.customer.email.trim() !== '' ? '' : '4. 顧客メールアドレスの設定'}

詳細は管理画面でご確認ください。
        `;
        
        const internalEmailResult = await sendQuoteEmail({
          quote: {
            ...quote,
            title: `【検討中通知】見積書 ${quote.quoteNumber} が検討中です`
          },
          companyInfo: companyInfo || {},
          recipientEmail: internalEmail,
          customMessage: internalMessage,
          attachPdf: true,
          pdfBuffer,
          tags: [
            { name: 'type', value: 'internal_notification' },
            { name: 'action', value: 'quote_considering' }
          ]
        });
        
        if (internalEmailResult.success) {
          logger.info(`Internal notification sent for quote ${quote.quoteNumber} consideration`);
        } else {
          logger.error(`Failed to send internal notification: ${internalEmailResult.error}`);
        }
      }
    } catch (emailError) {
      logger.error('Error sending consideration emails via Resend:', emailError);
      // メール送信エラーは検討中処理を失敗させない
    }

    logger.info(`Quote ${quote.quoteNumber} marked as considering by ${consideredBy}`);

    return NextResponse.json({
      success: true,
      message: '見積書を検討中にしました',
      quoteNumber: quote.quoteNumber
    });

  } catch (error) {
    logger.error('Error marking quote as considering:', error);
    return NextResponse.json(
      { error: '検討中処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}