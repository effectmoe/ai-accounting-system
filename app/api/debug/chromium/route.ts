import { NextResponse } from 'next/server';

export async function GET() {
  const diagnostics: any = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
      PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
      PUPPETEER_CACHE_DIR: process.env.PUPPETEER_CACHE_DIR,
    },
    chromium: {},
    puppeteer: {},
    errors: []
  };

  try {
    // @sparticuz/chromiumの情報を取得
    const chromium = await import('@sparticuz/chromium');
    diagnostics.chromium = {
      available: true,
      version: chromium.default.version || 'unknown',
      headless: chromium.default.headless,
      args: chromium.default.args?.length || 0,
      defaultViewport: chromium.default.defaultViewport,
    };

    // 実行パスを取得
    try {
      const execPath = await chromium.default.executablePath();
      diagnostics.chromium.executablePath = execPath;
      
      // ファイルの存在確認（Vercel環境では使えない可能性あり）
      try {
        const fs = await import('fs');
        if (fs.existsSync(execPath)) {
          const stats = fs.statSync(execPath);
          diagnostics.chromium.binary = {
            exists: true,
            size: stats.size,
            isFile: stats.isFile(),
          };
        } else {
          diagnostics.chromium.binary = {
            exists: false
          };
        }
      } catch (fsError: any) {
        diagnostics.chromium.binary = {
          error: 'Cannot check file system: ' + fsError.message
        };
      }
    } catch (pathError: any) {
      diagnostics.chromium.executablePath = null;
      diagnostics.chromium.pathError = pathError.message;
    }
  } catch (error: any) {
    diagnostics.chromium = {
      available: false,
      error: error.message
    };
  }

  try {
    // puppeteer-coreの情報を取得
    const puppeteer = await import('puppeteer-core');
    diagnostics.puppeteer = {
      available: true,
      // バージョン情報は直接取得できないため省略
    };
  } catch (error: any) {
    diagnostics.puppeteer = {
      available: false,
      error: error.message
    };
  }

  // 簡単な起動テスト
  try {
    const { launchPuppeteerSimple } = await import('@/lib/puppeteer-simple');
    const browser = await launchPuppeteerSimple();
    diagnostics.launchTest = {
      success: true,
      version: await browser.version()
    };
    await browser.close();
  } catch (error: any) {
    diagnostics.launchTest = {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}