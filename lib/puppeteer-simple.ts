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
      // @sparticuz/chromium-minを動的にインポート
      const chromium = await import('@sparticuz/chromium-min');
      
      console.log('[PuppeteerSimple] Using @sparticuz/chromium-min');
      console.log('[PuppeteerSimple] Chromium version:', chromium.default.version || 'unknown');
      console.log('[PuppeteerSimple] Chromium args count:', chromium.default.args?.length);
      
      // @sparticuz/chromium-minの実行パスを取得
      let execPath;
      try {
        // Vercel環境では特殊な処理が必要
        if (process.env.VERCEL) {
          // @sparticuz/chromium-minは設定済みのため、追加設定は不要
          
          // @sparticuz/chromium-minから実際のバイナリを取得
          // chromium-minはバイナリを含まないので、常にURLから取得する
          execPath = await chromium.default.executablePath(
            'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
          );
          console.log('[PuppeteerSimple] Using downloaded Chromium path:', execPath);
        } else {
          execPath = await chromium.default.executablePath();
          console.log('[PuppeteerSimple] Chromium executable path:', execPath);
        }
      } catch (pathError: any) {
        console.error('[PuppeteerSimple] Failed to get executable path:', pathError.message);
        // エラーでも続行（Puppeteerのデフォルトを使用）
        execPath = undefined;
      }
      
      // シンプルな設定でブラウザを起動
      const launchOptions: any = {
        args: chromium.default.args,
        defaultViewport: chromium.default.defaultViewport,
        headless: chromium.default.headless || true,
      };
      
      // 実行パスが有効な場合のみ設定（undefinedの場合はPuppeteerのデフォルトを使用）
      if (execPath !== undefined) {
        launchOptions.executablePath = execPath;
      }
      
      console.log('[PuppeteerSimple] Launch options:', {
        ...launchOptions,
        args: launchOptions.args?.length + ' args'
      });
      
      const browser = await puppeteer.launch(launchOptions);
      
      console.log('[PuppeteerSimple] Browser launched successfully');
      return browser;
      
    } catch (error: any) {
      console.error('[PuppeteerSimple] Failed to launch with @sparticuz/chromium:', error.message);
      console.error('[PuppeteerSimple] Error stack:', error.stack);
      
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
    // 開発環境 - puppeteer-coreを使用
    console.log('[PuppeteerSimple] Development environment - using puppeteer-core');
    try {
      // 開発環境でもpuppeteer-coreを使用
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // 開発環境では通常のChromiumを使用
        executablePath: process.platform === 'darwin' 
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome-stable' // Linux
      });
      
      console.log('[PuppeteerSimple] Browser launched in development');
      return browser;
    } catch (error) {
      console.error('[PuppeteerSimple] Failed in development, trying without executablePath');
      // Chrome/Chromiumが見つからない場合のフォールバック
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      return browser;
    }
  }
}