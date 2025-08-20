import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Chromiumのローカルパスを設定（Vercel環境用）
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

/**
 * Vercel環境でPuppeteerを起動するための共通設定
 */
export async function launchPuppeteer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  let browser = null;
  
  try {
    if (isProduction) {
      console.log('[Puppeteer] Production environment detected');
      console.log('[Puppeteer] Environment variables:', {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
        VERCEL_ENV: process.env.VERCEL_ENV
      });
      
      // 実行パスを取得（関数として呼び出し）
      let executablePath: string | undefined;
      try {
        executablePath = await chromium.executablePath();
        console.log('[Puppeteer] Chromium executable path:', executablePath);
        
        // パスが存在するか確認
        if (!executablePath) {
          console.warn('[Puppeteer] executablePath is undefined, using default');
        }
      } catch (e) {
        console.error('[Puppeteer] Failed to get executable path:', e);
        // エラー時はデフォルトのChromiumを使用
        console.log('[Puppeteer] Attempting to use default Chromium binary');
      }
      
      // ブラウザ起動オプション（Vercel最適化済み）
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
          '--disable-site-isolation-trials',
          '--disable-blink-features=AutomationControlled',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: chromium.defaultViewport || { width: 1280, height: 720 },
        headless: 'new', // Chrome 112+の新しいヘッドレスモード
        ignoreHTTPSErrors: true,
        protocolTimeout: 240000, // 4分のタイムアウト
      };
      
      // executablePathが取得できた場合のみ設定
      if (executablePath) {
        launchOptions.executablePath = executablePath;
        console.log('[Puppeteer] Using Chromium from:', executablePath);
      } else {
        console.log('[Puppeteer] Using bundled Chromium');
      }
      
      // ブラウザ起動を試行
      try {
        browser = await puppeteer.launch(launchOptions);
        console.log('[Puppeteer] Browser launched successfully');
      } catch (launchError: any) {
        console.error('[Puppeteer] Failed to launch with Chromium:', launchError.message);
        console.error('[Puppeteer] Stack trace:', launchError.stack);
        
        // フォールバック: 最小限のオプションで再試行
        console.log('[Puppeteer] Attempting fallback launch with minimal options');
        const fallbackOptions = {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true,
          ignoreHTTPSErrors: true,
        };
        
        if (executablePath) {
          (fallbackOptions as any).executablePath = executablePath;
        }
        
        browser = await puppeteer.launch(fallbackOptions);
        console.log('[Puppeteer] Browser launched with fallback options');
      }
      
    } else {
      // 開発環境: ローカルのPuppeteerを使用
      console.log('[Puppeteer] Development environment detected');
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    if (!browser) {
      throw new Error('[Puppeteer] Browser instance is null after all attempts');
    }
    
    return browser;
    
  } catch (error: any) {
    console.error('[Puppeteer] Critical error during browser launch:', error.message);
    console.error('[Puppeteer] Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}