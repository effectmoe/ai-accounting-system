/**
 * 最もシンプルで確実な見積書PDF生成
 * PDFkitやPuppeteerが失敗した場合のフォールバック
 */

import { Quote } from '@/types';
import { CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';

/**
 * HTMLベースの見積書文字列を生成
 */
function generateQuoteHTML(quote: Quote, companyInfo: CompanyInfo): string {
  const items = quote.items || [];
  const itemsHTML = items.map((item: any, index: number) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName || `項目${index + 1}`}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${(item.unitPrice || 0).toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">¥${(item.amount || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>見積書 ${quote.quoteNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            font-size: 14px;
            line-height: 1.6;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .info-section { margin-bottom: 20px; }
        .customer-info { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; }
        .amount-highlight { 
            font-size: 18px; 
            font-weight: bold; 
            color: #d32f2f; 
            margin: 20px 0; 
            text-align: center;
            background-color: #fff3cd;
            padding: 15px;
            border: 2px solid #ffc107;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
        }
        th { 
            background-color: #f5f5f5; 
            padding: 10px; 
            border: 1px solid #ddd; 
            text-align: left; 
        }
        td { 
            padding: 8px; 
            border: 1px solid #ddd; 
        }
        .total-section { 
            text-align: right; 
            margin: 20px 0; 
            font-weight: bold;
        }
        .notes { 
            margin-top: 30px; 
            padding: 15px; 
            background-color: #f9f9f9; 
        }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 12px; 
        }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">見積書</div>
    </div>
    
    <div class="info-section">
        <p><strong>見積書番号:</strong> ${quote.quoteNumber}</p>
        <p><strong>発行日:</strong> ${new Date(quote.issueDate).toLocaleDateString('ja-JP')}</p>
        ${quote.validityDate ? `<p><strong>有効期限:</strong> ${new Date(quote.validityDate).toLocaleDateString('ja-JP')}</p>` : ''}
    </div>
    
    <div class="customer-info">
        <h3>宛先</h3>
        <p><strong>${quote.customer?.companyName || '顧客名未設定'}</strong></p>
        ${quote.customer ? `
        <p>${quote.customer.prefecture || ''}${quote.customer.city || ''}${quote.customer.address1 || ''}</p>
        ${quote.customer.contactPerson ? `<p>ご担当者: ${quote.customer.contactPerson}</p>` : ''}
        ` : ''}
    </div>
    
    <div class="amount-highlight">
        見積金額: ¥${(quote.total || 0).toLocaleString()}
    </div>
    
    <table>
        <thead>
            <tr>
                <th style="width: 40%;">品目</th>
                <th style="width: 15%; text-align: center;">数量</th>
                <th style="width: 20%; text-align: right;">単価</th>
                <th style="width: 25%; text-align: right;">金額</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>
    
    <div class="total-section">
        ${quote.subtotal !== undefined ? `<p>小計: ¥${quote.subtotal.toLocaleString()}</p>` : ''}
        ${quote.taxAmount !== undefined ? `<p>消費税: ¥${quote.taxAmount.toLocaleString()}</p>` : ''}
        <p style="font-size: 16px; color: #d32f2f;">合計: ¥${(quote.total || 0).toLocaleString()}</p>
    </div>
    
    ${quote.notes && quote.notes.trim() ? `
    <div class="notes">
        <h4>備考</h4>
        <p>${quote.notes.replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}
    
    <div class="footer">
        ${companyInfo?.companyName ? `
        <p><strong>${companyInfo.companyName}</strong></p>
        ${companyInfo.address ? `<p>${companyInfo.address}</p>` : ''}
        ${companyInfo.phone ? `<p>TEL: ${companyInfo.phone}</p>` : ''}
        ${companyInfo.email ? `<p>Email: ${companyInfo.email}</p>` : ''}
        ` : `
        <p><strong>株式会社EFFECT</strong></p>
        `}
    </div>
</body>
</html>
  `.trim();
}

/**
 * 最もシンプルなPDF生成
 * HTMLを文字列として返すか、可能ならPuppeteerでPDF変換
 */
export async function generateSimpleQuotePDF(
  quote: Quote,
  companyInfo: CompanyInfo
): Promise<Buffer> {
  try {
    logger.debug('[Simple PDF] Starting simple quote PDF generation', {
      quoteNumber: quote.quoteNumber,
      itemCount: quote.items?.length || 0
    });
    
    const htmlContent = generateQuoteHTML(quote, companyInfo);
    
    // まずPuppeteerを試す（利用可能な場合）
    try {
      const { convertQuoteHTMLtoPDF } = await import('@/lib/quote-html-to-pdf-server');
      const pdfBuffer = await convertQuoteHTMLtoPDF(quote, companyInfo, true);
      logger.debug('[Simple PDF] Puppeteer PDF generation successful');
      return pdfBuffer;
    } catch (puppeteerError) {
      logger.warn('[Simple PDF] Puppeteer not available, trying alternative:', puppeteerError);
    }
    
    // Puppeteerが使えない場合、HTMLを文字列としてBufferに変換
    // これは緊急時のフォールバック
    const htmlBuffer = Buffer.from(htmlContent, 'utf8');
    logger.warn('[Simple PDF] Returning HTML content as fallback (not a real PDF)', {
      size: htmlBuffer.length,
      quoteNumber: quote.quoteNumber
    });
    
    return htmlBuffer;
    
  } catch (error) {
    logger.error('[Simple PDF] Simple PDF generation failed:', {
      error: error instanceof Error ? error.message : String(error),
      quoteNumber: quote.quoteNumber
    });
    throw error;
  }
}

/**
 * HTMLコンテンツのみを生成（メール本文用）
 */
export function generateQuoteHTMLForEmail(quote: Quote, companyInfo: CompanyInfo): string {
  return generateQuoteHTML(quote, companyInfo);
}