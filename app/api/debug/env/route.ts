import { NextResponse } from 'next/server';

export async function GET() {
  // 環境変数のデバッグ情報を返す
  const debugInfo = {
    mongodb: {
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      NEXT_PUBLIC_USE_AZURE_MONGODB: process.env.NEXT_PUBLIC_USE_AZURE_MONGODB,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL: process.env.VERCEL,
      CI: process.env.CI
    },
    checks: {
      isVercelEnvironment: !!process.env.VERCEL,
      isProduction: process.env.NODE_ENV === 'production',
      mongoDBShouldBeEnabled: process.env.USE_AZURE_MONGODB === 'true' || 
                              process.env.NEXT_PUBLIC_USE_AZURE_MONGODB === 'true' ||
                              !!process.env.MONGODB_URI ||
                              !!process.env.VERCEL
    }
  };

  return NextResponse.json(debugInfo, { status: 200 });
}