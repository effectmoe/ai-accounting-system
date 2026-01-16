import { NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2-client';

export async function GET() {
  const debugInfo: Record<string, any> = {
    timestamp: new Date().toISOString(),
    envVars: {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ? `${process.env.R2_ACCOUNT_ID.substring(0, 8)}...` : 'NOT SET',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? `${process.env.R2_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? 'SET (hidden)' : 'NOT SET',
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || 'NOT SET',
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || 'NOT SET',
    },
    envVarLengths: {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID?.length || 0,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID?.length || 0,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY?.length || 0,
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME?.length || 0,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL?.length || 0,
    },
    uploadTest: null as any,
  };

  // Test R2 upload with a tiny test file
  try {
    const testBuffer = Buffer.from('test-' + Date.now());
    const testKey = `test/debug-${Date.now()}.txt`;

    const result = await uploadToR2(testBuffer, testKey, {
      contentType: 'text/plain',
    });

    debugInfo.uploadTest = {
      success: true,
      key: result.key,
      url: result.url,
      size: result.size,
    };
  } catch (error: any) {
    debugInfo.uploadTest = {
      success: false,
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack?.split('\n').slice(0, 5),
    };
  }

  return NextResponse.json(debugInfo);
}
