/**
 * 見積書専用のメール添付用PDF生成
 * 印刷ボタンと同じ美しいレイアウトを実現
 * 請求書と領収書のロジックを踏襲
 */

import { logger } from '@/lib/logger';

/**
 * 見積書のHTMLからメール用PDFを生成
 * 印刷ボタンと同じ方法でPDFを生成
 */
export async function generateQuoteEmailPDF(quote: any, companyInfo?: any): Promise<Blob> {
  try {
    logger.debug('Generating beautiful quote PDF for email:', quote.quoteNumber);
    
    // pdf-quote-html-generatorのHTMLを使用（印刷プレビューと同じ）
    const { generateCompactQuoteHTML } = await import('./pdf-quote-html-generator');
    
    // 会社情報を取得（必要な場合）
    let finalCompanyInfo = companyInfo;
    if (!finalCompanyInfo) {
      try {
        const response = await fetch('/api/company-info');
        if (response.ok) {
          finalCompanyInfo = await response.json();
        }
      } catch (error) {
        logger.warn('Failed to fetch company info, using defaults:', error);
      }
    }
    
    // 美しいHTMLを生成（印刷ボタンと同じ、showDescriptions=true）
    const htmlContent = generateCompactQuoteHTML(quote, finalCompanyInfo, true);
    
    // ブラウザ環境チェック
    if (typeof window === 'undefined') {
      throw new Error('This function must be called in browser environment');
    }
    
    try {
      // html2canvasとjsPDFを動的インポート
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      // 一時的なコンテナを作成
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '210mm';
      container.style.height = '297mm';
      
      // HTMLを挿入（スタイルも含む完全なHTML）
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // styleタグとbodyの内容を抽出
      const styleElements = tempDiv.querySelectorAll('style');
      const bodyContent = tempDiv.querySelector('.quote-container') || tempDiv.querySelector('body')?.firstElementChild;
      
      // スタイルを追加
      styleElements.forEach(style => {
        const newStyle = document.createElement('style');
        newStyle.textContent = style.textContent || '';
        document.head.appendChild(newStyle);
      });
      
      // コンテンツを追加
      if (bodyContent) {
        container.appendChild(bodyContent.cloneNode(true));
      } else {
        container.innerHTML = htmlContent;
      }
      
      document.body.appendChild(container);
      
      // フォント読み込みとレンダリングを確実に完了させる
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 見積書コンテナを取得
      const quoteContainer = container.querySelector('.quote-container') || container;
      
      // html2canvasでキャンバスに変換（適度な品質でサイズを抑える）
      const canvas = await html2canvas(quoteContainer as HTMLElement, {
        scale: 1.5, // 品質とサイズのバランス（2→1.5に削減）
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4のピクセル幅
        height: 1123, // A4のピクセル高さ
        windowWidth: 794,
        windowHeight: 1123,
      });
      
      // PDFを生成（圧縮設定を追加）
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // 圧縮を有効化
      });
      
      // キャンバスをJPEGに変換（PNGよりサイズが小さい）
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // JPEG形式、品質85%
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // 画像をPDFのサイズに合わせる
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // PDFの情報を設定
      pdf.setProperties({
        title: `見積書 ${quote.quoteNumber}`,
        subject: '見積書',
        author: companyInfo?.companyName || '株式会社EFFECT',
        keywords: 'quote, 見積書',
        creator: 'AAM Accounting System'
      });
      
      // Blobとして出力（圧縮済み）
      const pdfBlob = pdf.output('blob');
      
      // クリーンアップ
      document.body.removeChild(container);
      // 追加したスタイルも削除
      styleElements.forEach(() => {
        const addedStyles = document.head.querySelectorAll('style:last-child');
        if (addedStyles.length > 0) {
          addedStyles[addedStyles.length - 1].remove();
        }
      });
      
      logger.debug('Beautiful quote PDF generated successfully', {
        blobSize: pdfBlob.size,
        sizeInMB: (pdfBlob.size / (1024 * 1024)).toFixed(2),
        quoteNumber: quote.quoteNumber
      });
      
      // PDFサイズが3MBを超える場合は警告してサーバーサイド生成を使用
      if (pdfBlob.size > 3 * 1024 * 1024) {
        logger.warn('PDF size exceeds 3MB, falling back to server-side generation', {
          sizeInMB: (pdfBlob.size / (1024 * 1024)).toFixed(2)
        });
        
        // サーバーサイドのPDF APIを使用
        const pdfResponse = await fetch(`/api/quotes/${quote._id}/pdf?download=true&engine=jspdf`, {
          method: 'GET',
        });
        
        if (!pdfResponse.ok) {
          throw new Error('Server-side PDF generation failed');
        }
        
        return await pdfResponse.blob();
      }
      
      return pdfBlob;
      
    } catch (renderError) {
      logger.error('HTML to PDF conversion error:', renderError);
      
      // フォールバック: サーバーサイドのPDF APIを使用
      logger.debug('Falling back to server-side PDF generation');
      
      const pdfResponse = await fetch(`/api/quotes/${quote._id}/pdf?download=true&engine=jspdf`, {
        method: 'GET',
      });
      
      if (!pdfResponse.ok) {
        throw new Error('Server-side PDF generation failed');
      }
      
      return await pdfResponse.blob();
    }
    
  } catch (error) {
    logger.error('Quote PDF generation error:', error);
    throw error;
  }
}

/**
 * 見積書データをbase64エンコードされたPDFに変換
 * EmailSendModalで使用
 */
export async function generateQuoteEmailPDFBase64(quote: any, companyInfo?: any): Promise<string> {
  const blob = await generateQuoteEmailPDF(quote, companyInfo);
  
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}