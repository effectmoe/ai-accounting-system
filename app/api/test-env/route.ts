import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 環境変数の状態を安全に確認
  const envStatus = {
    // Azure Form Recognizer
    AZURE_FORM_RECOGNIZER_ENDPOINT: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT ? '✅ Set' : '❌ Missing',
    AZURE_FORM_RECOGNIZER_KEY: process.env.AZURE_FORM_RECOGNIZER_KEY ? '✅ Set' : '❌ Missing',
    
    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Missing',
    
    // System flags
    USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB || 'Not set',
    NEXT_PUBLIC_USE_AZURE_MONGODB: process.env.NEXT_PUBLIC_USE_AZURE_MONGODB || 'Not set',
    
    // Gmail OAuth2設定（現在使用中）
    GMAIL_USER: process.env.GMAIL_USER ? `✅ Set (${process.env.GMAIL_USER})` : '❌ Missing',
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? '✅ Set' : '❌ Missing',
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? '✅ Set' : '❌ Missing',

    // Resend設定（廃止済み）
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `⚠️ Set but deprecated (${process.env.RESEND_API_KEY.substring(0, 10)}...)` : 'Not set (OK - deprecated)',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Not set',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Not set',
    
    // Runtime info
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? 'Yes' : 'No',
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not on Vercel',
  };

  // パッケージの存在確認
  let packageStatus = {};
  try {
    require.resolve('@azure/ai-form-recognizer');
    packageStatus['@azure/ai-form-recognizer'] = '✅ Installed';
  } catch {
    packageStatus['@azure/ai-form-recognizer'] = '❌ Not found';
  }

  try {
    require.resolve('mongodb');
    packageStatus['mongodb'] = '✅ Installed';
  } catch {
    packageStatus['mongodb'] = '❌ Not found';
  }

  return NextResponse.json({
    message: 'Environment Configuration Test',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    packages: packageStatus,
    recommendation: getRecommendation(envStatus, packageStatus)
  });
}

function getRecommendation(envStatus: any, packageStatus: any): string[] {
  const recommendations = [];

  // Gmail OAuth2チェック（必須）
  if (envStatus.GMAIL_USER === '❌ Missing' ||
      envStatus.GMAIL_CLIENT_ID === '❌ Missing' ||
      envStatus.GMAIL_CLIENT_SECRET === '❌ Missing' ||
      envStatus.GMAIL_REFRESH_TOKEN === '❌ Missing') {
    recommendations.push('⚠️ Gmail OAuth2設定が不完全です。メール送信機能が動作しません。');
  }

  if (envStatus.AZURE_FORM_RECOGNIZER_ENDPOINT === '❌ Missing' ||
      envStatus.AZURE_FORM_RECOGNIZER_KEY === '❌ Missing') {
    recommendations.push('Add Azure Form Recognizer credentials to Vercel environment variables');
  }

  if (envStatus.MONGODB_URI === '❌ Missing') {
    recommendations.push('Add MongoDB connection string to Vercel environment variables');
  }

  if (envStatus.USE_AZURE_MONGODB !== 'true') {
    recommendations.push('Set USE_AZURE_MONGODB=true to enable the new system');
  }

  if (packageStatus['@azure/ai-form-recognizer'] === '❌ Not found') {
    recommendations.push('Azure Form Recognizer package not found - check build logs');
  }

  return recommendations.length > 0 ? recommendations : ['All configurations look good!'];
}

export const runtime = 'nodejs';