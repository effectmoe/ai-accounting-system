import { Receipt } from '@/types/receipt';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';

/**
 * 領収書のHTMLをPDFとして保存可能な形式で生成
 * ブラウザの印刷機能を使用してPDFに変換することを前提としている
 */
export async function generateReceiptPDFContent(receipt: Receipt): Promise<Buffer> {
  try {
    logger.debug('Generating receipt PDF content for:', receipt.receiptNumber);
    
    // 美しいHTMLを生成
    const htmlContent = generateReceiptHTML(receipt);
    
    // HTMLにPDF印刷用のスタイルと自動印刷スクリプトを追加
    const pdfReadyHtml = `
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
                margin: 0;
            }
            body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    
    // HTMLをBufferとして返す
    return Buffer.from(pdfReadyHtml, 'utf-8');
  } catch (error) {
    logger.error('Failed to generate receipt PDF content:', error);
    throw error;
  }
}

/**
 * 領収書のHTMLをBase64エンコードされた文字列として返す
 */
export async function generateReceiptPDFBase64(receipt: Receipt): Promise<string> {
  const buffer = await generateReceiptPDFContent(receipt);
  return buffer.toString('base64');
}