import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';
import { Receipt } from '@/types/receipt';

/**
 * Vercel環境検出の改善
 */
function isVercelEnvironment(): boolean {
  return !!(
    process.env.VERCEL || 
    process.env.VERCEL_ENV || 
    process.env.VERCEL_URL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME // VercelはAWS Lambdaベース
  );
}

/**
 * 開発環境検出
 */
function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' && !isVercelEnvironment();
}

/**
 * Vercel/Production環境用のChromium設定
 */
function getVercelChromiumConfig() {
  // @sparticuz/chromium の最新設定方法
  const executablePath = chromium.executablePath;
  
  return {
    args: [
      ...chromium.args,
      // Vercel Lambda環境用の追加オプション
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images', // 画像読み込みを無効化してパフォーマンス向上
      '--virtual-time-budget=30000', // 30秒でタイムアウト
      '--run-all-compositor-stages-before-draw'
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: true, // chromium.headless は非推奨のため直接指定
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    // Lambda環境用のタイムアウト設定
    timeout: 30000,
    protocolTimeout: 30000,
  };
}

/**
 * 開発環境用のPuppeteer設定
 */
function getLocalChromiumConfig() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security'
    ],
    timeout: 60000
  };
}

/**
 * Puppeteerを使用して領収書のPDFを生成する（改善版）
 */
export async function generateReceiptPDFWithPuppeteer(receipt: Receipt): Promise<Buffer> {
  let browser = null;
  
  try {
    logger.debug('Starting receipt PDF generation with Puppeteer for:', receipt.receiptNumber);
    logger.debug('Environment check:', {
      isDevelopment: isDevelopmentEnvironment(),
      isVercel: isVercelEnvironment(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    
    if (isDevelopmentEnvironment()) {
      // ローカル開発環境 - 通常のpuppeteerを使用
      logger.debug('Using local Puppeteer for development');
      const puppeteerLocal = await import('puppeteer');
      const config = getLocalChromiumConfig();
      browser = await puppeteerLocal.default.launch(config);
    } else {
      // Vercel/Production環境 - @sparticuz/chromium を使用
      logger.debug('Using @sparticuz/chromium for production/Vercel');
      
      // Chromiumの実行可能パスを事前に確認
      let executablePath: string;
      try {
        executablePath = await chromium.executablePath;
        logger.debug('Chromium executable path:', executablePath);
      } catch (pathError) {
        logger.error('Failed to get Chromium executable path:', pathError);
        throw new Error('Chromium実行ファイルが見つかりません');
      }
      
      const config = getVercelChromiumConfig();
      
      // より詳細なログ出力
      logger.debug('Puppeteer launch config:', {
        argsCount: config.args.length,
        executablePath: config.executablePath,
        headless: config.headless,
        timeout: config.timeout
      });
      
      browser = await puppeteer.launch(config);
    }

    // ページ作成とタイムアウト設定
    const page = await browser.newPage();
    
    // ページタイムアウト設定
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // メモリ効率化のための設定
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // 不要なリソースをブロック
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // HTMLコンテンツを生成
    const htmlContent = generateReceiptHTML(receipt);
    logger.debug('Generated HTML content length:', htmlContent.length);
    
    // HTMLを設定（タイムアウト制御）
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded', // networkidle0 より軽量
      timeout: 20000
    });
    
    // PDFを生成（日本語フォント対応とパフォーマンス最適化）
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      preferCSSPageSize: true,
      // パフォーマンス向上のための設定
      omitBackground: false,
      timeout: 25000
    });
    
    logger.debug('Receipt PDF generated successfully, size:', pdfBuffer.length);
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    logger.error('Error generating receipt PDF with Puppeteer:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      receiptNumber: receipt.receiptNumber,
      environment: {
        isDevelopment: isDevelopmentEnvironment(),
        isVercel: isVercelEnvironment(),
        nodeEnv: process.env.NODE_ENV
      }
    });
    
    // より具体的なエラーメッセージ
    if (error instanceof Error) {
      if (error.message.includes('Could not find Chromium')) {
        throw new Error('Vercel環境でChromiumが見つかりません。@sparticuz/chromiumの設定を確認してください。');
      } else if (error.message.includes('TimeoutError')) {
        throw new Error('PDF生成がタイムアウトしました。処理時間を短縮するか、jsPDFフォールバックを使用してください。');
      } else if (error.message.includes('Protocol error')) {
        throw new Error('Chromiumプロトコルエラーが発生しました。Vercel環境でのメモリ不足が原因の可能性があります。');
      }
    }
    
    throw new Error(`PDF生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        logger.warn('Browser close error (non-critical):', closeError);
      }
    }
  }
}

/**
 * jsPDFを使用した簡易版PDF生成（フォールバック用）- 改善版
 */
export async function generateReceiptPDFWithJsPDF(receipt: Receipt): Promise<Buffer> {
  try {
    logger.debug('Generating receipt PDF with jsPDF for:', receipt.receiptNumber);
    
    const { jsPDF } = await import('jspdf');
    
    // A4サイズのPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // 基本設定
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;
    
    // ヘッダー
    doc.setFontSize(24);
    doc.text('領収書', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // 領収書番号
    doc.setFontSize(12);
    doc.text(`No. ${receipt.receiptNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // 発行日
    const issueDate = new Date(receipt.issueDate).toLocaleDateString('ja-JP');
    doc.setFontSize(10);
    doc.text(`発行日: ${issueDate}`, margin, currentY);
    currentY += 15;
    
    // 顧客名
    doc.setFontSize(14);
    doc.text(`${receipt.customerName || '様'}`, margin, currentY);
    currentY += 15;
    
    // 金額
    doc.setFontSize(18);
    const totalAmount = (receipt.totalAmount ?? 0).toLocaleString('ja-JP');
    doc.text(`領収金額: ¥${totalAmount}`, margin, currentY);
    currentY += 20;
    
    // 但し書き
    doc.setFontSize(12);
    doc.text(`但し書き: ${receipt.subject || 'お品代として'}`, margin, currentY);
    currentY += 15;
    
    // 項目詳細ヘッダー
    doc.setFontSize(10);
    doc.text('項目', margin, currentY);
    doc.text('数量', margin + 80, currentY);
    doc.text('単価', margin + 110, currentY);
    doc.text('金額', margin + 140, currentY);
    
    // ヘッダー下線
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 10;
    
    // 項目詳細
    (receipt.items || []).forEach((item, index) => {
      if (currentY > 250) { // ページの終わりに近づいたら新しいページ
        doc.addPage();
        currentY = margin;
      }
      
      doc.text(item.description || `項目${index + 1}`, margin, currentY);
      doc.text(`${(item.quantity ?? 1).toLocaleString('ja-JP')} ${item.unit || '式'}`, margin + 80, currentY);
      doc.text(`¥${(item.unitPrice ?? 0).toLocaleString('ja-JP')}`, margin + 110, currentY);
      doc.text(`¥${(item.amount ?? 0).toLocaleString('ja-JP')}`, margin + 140, currentY);
      currentY += 7;
    });
    
    // 合計欄
    currentY += 5;
    doc.line(margin + 100, currentY, pageWidth - margin, currentY);
    currentY += 7;
    
    const subtotal = (receipt.subtotal ?? 0).toLocaleString('ja-JP');
    const taxAmount = (receipt.taxAmount ?? 0).toLocaleString('ja-JP');
    const taxRate = Math.round((receipt.taxRate ?? 0.1) * 100);
    
    doc.text('小計:', margin + 110, currentY);
    doc.text(`¥${subtotal}`, margin + 140, currentY);
    currentY += 7;
    
    doc.text(`消費税(${taxRate}%):`, margin + 110, currentY);
    doc.text(`¥${taxAmount}`, margin + 140, currentY);
    currentY += 7;
    
    doc.setFontSize(12);
    doc.text('合計:', margin + 110, currentY);
    doc.text(`¥${totalAmount}`, margin + 140, currentY);
    currentY += 15;
    
    // 発行者情報
    if (receipt.issuerName) {
      doc.setFontSize(10);
      doc.text(`発行者: ${receipt.issuerName}`, margin, currentY);
      currentY += 5;
      
      if (receipt.issuerAddress) {
        doc.text(`住所: ${receipt.issuerAddress}`, margin, currentY);
        currentY += 5;
      }
      
      if (receipt.issuerPhone) {
        doc.text(`TEL: ${receipt.issuerPhone}`, margin, currentY);
        currentY += 5;
      }
    }
    
    // 備考
    if (receipt.notes) {
      currentY += 10;
      doc.text('備考:', margin, currentY);
      currentY += 5;
      const lines = doc.splitTextToSize(receipt.notes, pageWidth - margin * 2);
      doc.text(lines, margin, currentY);
    }
    
    // PDFをBufferとして返す
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    logger.debug('jsPDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    logger.error('Error generating receipt PDF with jsPDF:', error);
    throw new Error(`jsPDF でのPDF生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 自動フォールバック付きPDF生成
 */
export async function generateReceiptPDFWithAutoFallback(receipt: Receipt): Promise<Buffer> {
  try {
    // まずPuppeteerで試行
    return await generateReceiptPDFWithPuppeteer(receipt);
  } catch (puppeteerError) {
    logger.warn('Puppeteer PDF generation failed, falling back to jsPDF:', puppeteerError);
    
    try {
      // フォールバックとしてjsPDFを使用
      return await generateReceiptPDFWithJsPDF(receipt);
    } catch (jspdfError) {
      logger.error('Both Puppeteer and jsPDF failed:', { puppeteerError, jspdfError });
      throw new Error('PDF生成が完全に失敗しました。システム管理者にお問い合わせください。');
    }
  }
}