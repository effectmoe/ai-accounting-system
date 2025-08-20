import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Vercel環境でPuppeteerを起動するための共通設定
 */
export async function launchPuppeteer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  let browser = null;
  
  try {
    if (isProduction) {
      console.log('[Puppeteer] Production environment detected');
      
      // Chromiumの設定を最適化
      chromium.setHeadlessMode = true;
      chromium.setGraphicsMode = false;
      
      // 実行パスを取得（関数として呼び出し）
      let executablePath: string | undefined;
      try {
        executablePath = await chromium.executablePath();
        console.log('[Puppeteer] Chromium executable path:', executablePath);
      } catch (e) {
        console.warn('[Puppeteer] Failed to get executable path:', e);
      }
      
      // ブラウザ起動オプション
      const launchOptions: any = {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials'
        ],
        defaultViewport: chromium.defaultViewport,
        headless: true,
        ignoreHTTPSErrors: true,
      };
      
      // executablePathが取得できた場合のみ設定
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      
      browser = await puppeteer.launch(launchOptions);
      console.log('[Puppeteer] Browser launched successfully');
      
    } else {
      // 開発環境: ローカルのPuppeteerを使用
      console.log('[Puppeteer] Development environment detected');
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    return browser;
    
  } catch (error) {
    console.error('[Puppeteer] Failed to launch browser:', error);
    throw error;
  }
}