import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'accounting@effect.moe';
    
    // API設定の確認
    const config = {
      hasApiKey: !!resendApiKey,
      apiKeyValid: resendApiKey?.startsWith('re_'),
      apiKeyLength: resendApiKey?.length,
      fromEmail,
      internalEmail: process.env.INTERNAL_NOTIFY_EMAIL,
    };
    
    // テストメール送信（APIキーがある場合）
    let testResult = null;
    if (resendApiKey && resendApiKey.startsWith('re_')) {
      const resend = new Resend(resendApiKey);
      
      try {
        const { data, error } = await resend.emails.send({
          from: `テストシステム <${fromEmail}>`,
          to: 'info@effect.moe',
          subject: 'API動作確認テスト - ' + new Date().toISOString(),
          html: `
            <h1>Resend API テスト</h1>
            <p>このメールはAPI動作確認のために送信されました。</p>
            <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
            <hr>
            <p>設定情報:</p>
            <ul>
              <li>From: ${fromEmail}</li>
              <li>API Key: ${resendApiKey.substring(0, 10)}...</li>
            </ul>
          `,
          text: 'Resend API動作確認テスト',
        });
        
        testResult = {
          success: !error,
          messageId: data?.id,
          error: error?.message,
        };
      } catch (err) {
        testResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }
    
    return NextResponse.json({
      config,
      testResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Test email API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}