import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import nodemailer from 'nodemailer';
import { generateQuotePDF } from '@/lib/pdf-generator';

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

    // メール通知を送信
    try {
      // PDFを生成
      const pdfBuffer = await generateQuotePDF(quote);
      
      // メール送信設定
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      
      // 1. 顧客への承認確認メール（PDF添付）
      if (quote.customer?.email) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@example.com',
          to: quote.customer.email,
          subject: `【承認確認】見積書 ${quote.quoteNumber}`,
          text: `
お世話になっております。

見積書「${quote.quoteNumber}」をご承認いただき、誠にありがとうございます。
正式な見積書PDFを添付させていただきます。

見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。
          `,
          html: `
<p>お世話になっております。</p>
<p>見積書「${quote.quoteNumber}」をご承認いただき、誠にありがとうございます。<br>
正式な見積書PDFを添付させていただきます。</p>
<p><strong>見積金額: ¥${quote.totalAmount.toLocaleString()}（税込）</strong></p>
<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
<p>よろしくお願いいたします。</p>
          `,
          attachments: [
            {
              filename: `見積書_${quote.quoteNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
        
        logger.info(`Acceptance email sent to ${quote.customer.email} for quote ${quote.quoteNumber}`);
      }
      
      // 2. 社内担当者への承認通知メール
      const companyInfo = await db.collection('company_info').findOne({});
      const internalEmail = companyInfo?.email || process.env.INTERNAL_NOTIFY_EMAIL || process.env.SMTP_FROM;
      
      if (internalEmail) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@example.com',
          to: internalEmail,
          subject: `【承認通知】見積書 ${quote.quoteNumber} が承認されました`,
          text: `
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
          `,
          html: `
<h3>見積書承認通知</h3>
<p>見積書が承認されました。</p>

<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">見積書番号</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${quote.quoteNumber}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">顧客名</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${quote.customer?.companyName || '未設定'}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">見積金額</td>
    <td style="padding: 8px; border: 1px solid #ddd;">¥${quote.totalAmount.toLocaleString()}（税込）</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">承認日時</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(acceptedAt).toLocaleString('ja-JP')}</td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">承認者</td>
    <td style="padding: 8px; border: 1px solid #ddd;">${acceptedBy || '未設定'}</td>
  </tr>
</table>

<h4>承認者情報</h4>
<ul>
  <li>IPアドレス: ${ipAddress || '不明'}</li>
  <li>ブラウザ: ${userAgent || '不明'}</li>
</ul>

<h4>次のアクション</h4>
<ol>
  <li>請求書の発行準備</li>
  <li>納品・作業スケジュールの確認</li>
  <li>顧客への追加連絡（必要に応じて）</li>
</ol>

<p style="margin-top: 30px;">
  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app'}/quotes/${quoteId}" 
     style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
    管理画面で詳細を確認
  </a>
</p>
          `,
          attachments: [
            {
              filename: `見積書_${quote.quoteNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });
        
        logger.info(`Internal notification sent for quote ${quote.quoteNumber} approval`);
      }
    } catch (emailError) {
      logger.error('Error sending acceptance email:', emailError);
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