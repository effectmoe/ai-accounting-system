import { logger } from '@/lib/logger';
import { generateReceiptHTML } from './receipt-html-generator';

/**
 * 領収書のPDFを生成する簡易版
 * HTMLをそのまま返し、ブラウザのPDF保存機能を利用する
 */
export async function generateReceiptPDFWithPuppeteer(receipt: any): Promise<Buffer> {
  try {
    logger.debug('Generating receipt PDF (HTML-based) for:', receipt.receiptNumber);
    
    // HTMLコンテンツを生成
    const htmlContent = generateReceiptHTML(receipt);
    
    // HTMLにPDF用のスタイルを追加
    const pdfHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>領収書 ${receipt.receiptNumber}</title>
    <style>
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .no-print {
                display: none !important;
            }
            .page-break {
                page-break-before: always;
            }
        }
        
        /* PDF用の追加スタイル */
        body {
            font-family: 'Noto Sans JP', 'Hiragino Sans', 'MS Gothic', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    
    // HTMLをBufferとして返す（PDF変換はブラウザで行う）
    return Buffer.from(pdfHtml, 'utf-8');
  } catch (error) {
    logger.error('Error generating receipt PDF:', error);
    throw error;
  }
}