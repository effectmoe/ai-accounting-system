import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'checking',
    steps: [],
  };

  try {
    // Step 1: 環境変数チェック
    const envCheck = {
      GMAIL_USER: process.env.GMAIL_USER ? `✅ Set (${process.env.GMAIL_USER})` : '❌ Missing',
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? '✅ Set' : '❌ Missing',
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN
        ? `✅ Set (${process.env.GMAIL_REFRESH_TOKEN.substring(0, 20)}...)`
        : '❌ Missing',
    };
    results.steps.push({ step: 'Environment Variables', result: envCheck });

    // 環境変数が不足している場合は終了
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET ||
        !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_USER) {
      results.status = 'failed';
      results.error = 'Missing required Gmail environment variables';
      return NextResponse.json(results, { status: 400 });
    }

    // Step 2: OAuth2クライアント作成
    results.steps.push({ step: 'Creating OAuth2 Client', result: 'Starting...' });

    const oauth2Client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    results.steps[results.steps.length - 1].result = '✅ OAuth2 Client created';

    // Step 3: アクセストークン取得テスト
    results.steps.push({ step: 'Getting Access Token', result: 'Requesting...' });

    try {
      const accessTokenResponse = await oauth2Client.getAccessToken();

      if (accessTokenResponse.token) {
        results.steps[results.steps.length - 1].result = '✅ Access token obtained';
        results.accessToken = {
          obtained: true,
          length: accessTokenResponse.token.length,
          prefix: accessTokenResponse.token.substring(0, 20) + '...',
        };
      } else {
        results.steps[results.steps.length - 1].result = '❌ No access token in response';
        results.status = 'failed';
        results.error = 'Access token was empty';
      }
    } catch (tokenError: any) {
      results.steps[results.steps.length - 1].result = '❌ Failed to get access token';
      results.status = 'failed';
      results.tokenError = {
        message: tokenError.message,
        code: tokenError.code,
        response: tokenError.response?.data || tokenError.response || null,
      };

      // よくあるエラーの診断
      if (tokenError.message?.includes('invalid_grant')) {
        results.diagnosis = 'REFRESH_TOKEN_EXPIRED';
        results.solution = 'リフレッシュトークンが失効しています。Google OAuth Playgroundで新しいトークンを取得してください。';
        results.howToFix = [
          '1. https://developers.google.com/oauthplayground にアクセス',
          '2. 右上の設定アイコン → "Use your own OAuth credentials" をチェック',
          '3. Client ID と Client Secret を入力',
          '4. 左のリストから "Gmail API v1" → "https://mail.google.com/" を選択',
          '5. "Authorize APIs" をクリック',
          '6. Googleアカウントでログイン（info@effect.moe）',
          '7. "Exchange authorization code for tokens" をクリック',
          '8. 表示された "Refresh token" をコピー',
          '9. Vercelで GMAIL_REFRESH_TOKEN を更新',
        ];
      } else if (tokenError.message?.includes('invalid_client')) {
        results.diagnosis = 'INVALID_CLIENT_CREDENTIALS';
        results.solution = 'Client IDまたはClient Secretが正しくありません。Google Cloud Consoleで確認してください。';
      }

      return NextResponse.json(results, { status: 500 });
    }

    // Step 4: Nodemailer テスト（実際には送信しない）
    results.steps.push({ step: 'Gmail API Ready', result: '✅ Authentication successful' });
    results.status = 'success';
    results.message = 'Gmail OAuth2認証は正常に動作しています';

    return NextResponse.json(results);

  } catch (error: any) {
    results.status = 'error';
    results.error = error.message;
    results.stack = error.stack;
    return NextResponse.json(results, { status: 500 });
  }
}

export const runtime = 'nodejs';
