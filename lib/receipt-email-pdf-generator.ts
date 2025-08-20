/**
 * 領収書専用のメール添付用PDF生成
 * 印刷ボタンと同じ美しいレイアウトを実現
 */

import { Receipt } from '@/types/receipt';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';

/**
 * 領収書のHTMLからメール用PDFを生成
 * 印刷ボタンと同じ方法でPDFを生成
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
      container.innerHTML = fullHtml;
      document.body.appendChild(container);
      
      // 少し待機してレンダリングを完了させる
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 領収書コンテナを取得
      const receiptContainer = container.querySelector('.receipt-container') || container;
      
      // html2canvasでキャンバスに変換（高品質設定）
      const canvas = await html2canvas(receiptContainer as HTMLElement, {
        scale: 2, // 高解像度（3だとメモリ不足の可能性があるため2に調整）
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4のピクセル幅
        height: 1123, // A4のピクセル高さ
      });
      
      // PDFを生成
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // 適度な圧縮
      });
      
      // キャンバスをPDFに追加
      const imgWidth = 210; // A4の幅（mm）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4の高さ（mm）
      
      // 画像データを取得
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEGで少し圧縮
      
      // 1ページ目を追加（1ページに収める）
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      
      // 複数ページの処理は無効化（領収書は1ページで十分）
      // if (imgHeight > pageHeight) {
      //   let position = -pageHeight;
      //   let remainingHeight = imgHeight - pageHeight;
      //   
      //   while (remainingHeight > 0) {
      //     pdf.addPage();
      //     pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      //     position -= pageHeight;
      //     remainingHeight -= pageHeight;
      //   }
      // }
      
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
      
      // コンテナを削除
      document.body.removeChild(container);
    
      logger.debug('Beautiful receipt PDF generated successfully', {
        receiptNumber: receipt.receiptNumber,
        pdfSize: blob.size,
        expectedSize: '約200-300KB'
      });
      
      return blob;
    } catch (innerError) {
      // エラーの詳細をログに記録
      logger.error('PDF generation inner error:', innerError);
      throw innerError;
    }
  } catch (error) {
    logger.error('Failed to generate beautiful receipt PDF:', error);
    // エラーメッセージを改善
    if (error instanceof Error) {
      throw new Error(`領収書PDF生成エラー: ${error.message}`);
    }
    throw new Error('領収書のPDF生成に失敗しました');
  }
}