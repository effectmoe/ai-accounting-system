import puppeteer from 'puppeteer-core';

/**
 * Vercel環境用の最小限のPuppeteer設定
 */
export async function launchPuppeteerSimple() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  console.log('[PuppeteerSimple] Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isProduction
  });
  
  if (isProduction) {
    try {
      // @sparticuz/chromiumを動的にインポート
      const chromium = await import('@sparticuz/chromium');
      
      console.log('[PuppeteerSimple] Using @sparticuz/chromium');
      
      // シンプルな設定でブラウザを起動
      const browser = await puppeteer.launch({
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      });
      
      console.log('[PuppeteerSimple] Browser launched successfully');
      return browser;
      
    } catch (error: any) {
      console.error('[PuppeteerSimple] Failed to launch with @sparticuz/chromium:', error.message);
      
      // フォールバック: 最小限の設定で起動
      console.log('[PuppeteerSimple] Attempting minimal fallback');
      const browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ],
        headless: true,
      });
      
      console.log('[PuppeteerSimple] Browser launched with fallback');
      return browser;
    }
  } else {
    // 開発環境
    console.log('[PuppeteerSimple] Development environment - using local puppeteer');
    const puppeteerLocal = await import('puppeteer');
    const browser = await puppeteerLocal.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('[PuppeteerSimple] Browser launched in development');
    return browser;
  }
}