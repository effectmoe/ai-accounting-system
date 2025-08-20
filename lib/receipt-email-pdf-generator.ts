/**
 * 領収書専用のメール添付用PDF生成
 * 印刷ボタンと同じ美しいレイアウトを実現
 */

import { Receipt } from '@/types/receipt';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';

/**
 * 領収書のHTMLからメール用PDFを生成
 * Puppeteerライクな処理をエミュレート
 */
export async function generateReceiptEmailPDF(receipt: Receipt): Promise<Blob> {
  try {
    logger.debug('Generating beautiful receipt PDF for email:', receipt.receiptNumber);
    
    // 美しいHTMLを生成（印刷ボタンと同じ）
    const htmlContent = generateReceiptHTML(receipt);
    
    // HTMLを完全なドキュメントとして構築
    const fullHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>領収書 ${receipt.receiptNumber}</title>
    <style>
        @media print {
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        /* フォント設定 */
        body {
            font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
        }
        
        /* 印刷時のスタイル調整 */
        .receipt-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            background: white;
        }
        
        /* 領収書のスタイルを保持 */
        .receipt-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .receipt-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .customer-info {
            flex: 1;
        }
        
        .company-info {
            flex: 1;
            text-align: right;
        }
        
        .amount-box {
            background: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        
        .amount-label {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .amount-value {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .stamp-area {
            margin-top: 30px;
            text-align: right;
        }
        
        .stamp-image {
            width: 80px;
            height: 80px;
        }
        
        .footer-note {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        ${htmlContent}
    </div>
</body>
</html>`;
    
    // HTMLをBlobに変換（ブラウザ環境でのみ動作）
    if (typeof window === 'undefined') {
      throw new Error('This function must be called in browser environment');
    }
    
    // iframe を使用してHTMLをレンダリング
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '210mm';  // A4幅
    iframe.style.height = '297mm'; // A4高さ
    document.body.appendChild(iframe);
    
    // iframeにHTMLを書き込み
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      throw new Error('Failed to access iframe document');
    }
    
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();
    
    // 少し待機してレンダリングを完了させる
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // html2canvasとjsPDFを使用してPDFを生成
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    
    // iframeの内容をキャンバスに描画（高品質設定）
    const canvas = await html2canvas(iframeDoc.body, {
      scale: 3, // 高解像度
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 794, // A4のピクセル幅（210mm）
      windowHeight: 1123, // A4のピクセル高さ（297mm）
    });
    
    // PDFを生成（高品質設定）
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false // 圧縮しない（品質優先）
    });
    
    // キャンバスをPDFに追加
    const imgWidth = 210; // A4の幅（mm）
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // 高品質な画像として追加
    const imgData = canvas.toDataURL('image/png', 1.0); // 最高品質
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, '', 'FAST');
    
    // 複数ページの場合の処理
    let heightLeft = imgHeight - 297; // A4の高さを超える部分
    if (heightLeft > 0) {
      let position = -297;
      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= 297;
        position -= 297;
      }
    }
    
    // PDFの情報を設定
    pdf.setProperties({
      title: `領収書 ${receipt.receiptNumber}`,
      subject: '領収書',
      author: receipt.issuerName || '株式会社EFFECT',
      keywords: 'receipt, 領収書',
      creator: 'AAM Accounting System'
    });
    
    // PDFをBlobに変換
    const blob = pdf.output('blob');
    
    // iframeを削除
    document.body.removeChild(iframe);
    
    logger.debug('Beautiful receipt PDF generated successfully', {
      receiptNumber: receipt.receiptNumber,
      pdfSize: blob.size,
      expectedSize: '約310KB'
    });
    
    return blob;
  } catch (error) {
    logger.error('Failed to generate beautiful receipt PDF:', error);
    throw error;
  }
}