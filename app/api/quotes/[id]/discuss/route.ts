import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { message, contactEmail, contactName, quoteNumber, timestamp } = body;

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

    // 問い合わせを保存
    const inquiry = {
      quoteId: new ObjectId(quoteId),
      quoteNumber: quote.quoteNumber,
      message,
      contactEmail,
      contactName,
      status: 'new',
      createdAt: new Date(timestamp),
      updatedAt: new Date()
    };

    const insertResult = await db.collection('quote_inquiries').insertOne(inquiry);

    if (!insertResult.insertedId) {
      throw new Error('問い合わせの保存に失敗しました');
    }

    // 見積書に問い合わせがあったことを記録 & ステータスを保留に変更
    await db.collection('quotes').updateOne(
      { _id: new ObjectId(quoteId) },
      {
        $push: {
          inquiries: {
            id: insertResult.insertedId,
            date: new Date(),
            from: contactName,
            email: contactEmail
          }
        },
        $set: {
          status: 'saved',  // ステータスを保留（saved）に変更
          lastInquiryAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // 履歴を記録
    await db.collection('quote_history').insertOne({
      quoteId: new ObjectId(quoteId),
      quoteNumber: quote.quoteNumber,
      action: 'inquiry_received',
      performedBy: contactEmail,
      performedAt: new Date(),
      details: {
        inquiryId: insertResult.insertedId,
        contactName,
        messagePreview: message.substring(0, 100)
      }
    });

    // メール通知を送信
    try {
      // 固定の受信先メールアドレス
      const toEmail = process.env.INTERNAL_NOTIFY_EMAIL || 'info@effect.moe';
      
      // 会社情報を取得
      const companyInfo = await db.collection('company_info').findOne({});
      
      // Resendが設定されているか確認
      const resendApiKey = process.env.RESEND_API_KEY;
      const isResendConfigured = resendApiKey && !resendApiKey.includes('dummy') && resendApiKey.startsWith('re_');
      
      if (isResendConfigured) {
        const resend = new Resend(resendApiKey);
        
        const htmlContent = `
<h3>見積書に関するご質問</h3>
<table style="border-collapse: collapse; margin-bottom: 20px;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">見積書番号</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">お客様</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${quote.customer?.companyName || '未設定'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">お問い合わせ者</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${contactName || ''}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">メールアドレス</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${contactEmail || ''}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background-color: #f5f5f5; font-weight: bold;">見積金額</td>
    <td style="padding: 8px; border: 1px solid #ddd;">¥${quote.totalAmount?.toLocaleString() || '0'}（税込）</td>
  </tr>
</table>

<h4>【ご質問内容】</h4>
<div style="padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; white-space: pre-wrap;">
${message || 'ご質問内容が入力されていません'}
</div>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
<p style="color: #666; font-size: 12px;">このメールは見積書システムから自動送信されています。</p>
        `;
        
        const textContent = `
見積書番号: ${quote.quoteNumber}
お客様: ${quote.customer?.companyName || '未設定'}
お問い合わせ者: ${contactName || ''}
メールアドレス: ${contactEmail || ''}

【ご質問内容】
${message || 'ご質問内容が入力されていません'}

見積金額: ¥${quote.totalAmount?.toLocaleString() || '0'}（税込）

---
このメールは見積書システムから自動送信されています。
        `;
        
        // Resendでメール送信
        const { data, error } = await resend.emails.send({
          from: `${companyInfo?.companyName || companyInfo?.name || 'お問い合わせ'} <${process.env.RESEND_FROM_EMAIL || 'accounting@effect.moe'}>`,
          to: toEmail,
          replyTo: contactEmail,
          subject: `【ご質問】見積書 ${quote.quoteNumber} について`,
          text: textContent,
          html: htmlContent,
          tags: [
            { name: 'type', value: 'quote_inquiry' },
            { name: 'quote_number', value: quote.quoteNumber },
          ],
        });
        
        if (error) {
          logger.error('Resend API error:', error);
        } else {
          logger.info(`Discussion email sent for quote ${quote.quoteNumber} to ${toEmail} via Resend`);
        }
      } else {
        // Resendが設定されていない場合はログに記録
        logger.warn(`Resend not configured. Discussion inquiry for quote ${quote.quoteNumber} from ${contactEmail}:`);
        logger.warn(`Message: ${message}`);
        logger.warn(`Would have sent to: ${toEmail}`);
      }
    } catch (emailError) {
      logger.error('Error sending discussion email:', emailError);
      // メール送信エラーは処理を失敗させない
    }

    logger.info(`Inquiry received for quote ${quote.quoteNumber} from ${contactEmail}`);

    return NextResponse.json({
      success: true,
      message: '問い合わせを受け付けました。見積もりが一旦保留され、担当者より返信させていただきます。',
      inquiryId: insertResult.insertedId.toString()
    });

  } catch (error) {
    logger.error('Error processing inquiry:', error);
    return NextResponse.json(
      { error: '送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}