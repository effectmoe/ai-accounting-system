import { Quote } from '@/types';
import { logger } from './logger';

export async function generateQuotePDF(quote: any): Promise<Buffer> {
  try {
    // 簡単なHTMLを生成
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 40px; }
          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .items-table th { background-color: #f5f5f5; }
          .total-section { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
          .stamp { text-align: center; margin-top: 40px; padding: 20px; border: 2px solid #4CAF50; background: #f0f8ff; }
        </style>
      </head>
      <body>
        <h1>見積書</h1>
        <div class="stamp">【承認済み】${new Date().toLocaleDateString('ja-JP')}</div>
        
        <div class="info-section">
          <div class="info-row">
            <div>見積書番号: ${quote.quoteNumber || ''}</div>
            <div>発行日: ${quote.issueDate ? new Date(quote.issueDate).toLocaleDateString('ja-JP') : ''}</div>
          </div>
          <div class="info-row">
            <div>お客様: ${quote.customer?.companyName || ''}</div>
            <div>有効期限: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('ja-JP') : ''}</div>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>品目</th>
              <th>数量</th>
              <th>単価</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.items || []).map((item: any) => `
              <tr>
                <td>${item.description || ''}</td>
                <td>${item.quantity || 0}</td>
                <td>¥${(item.unitPrice || 0).toLocaleString()}</td>
                <td>¥${(item.amount || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div>小計: ¥${(quote.subtotal || 0).toLocaleString()}</div>
          <div>消費税: ¥${(quote.tax || 0).toLocaleString()}</div>
          <div>合計金額: ¥${(quote.totalAmount || 0).toLocaleString()}</div>
        </div>
      </body>
      </html>
    `;

    // HTMLをバッファとして返す（実際のPDF変換は後で実装）
    // 今は簡単にHTMLをBufferとして返す
    return Buffer.from(html, 'utf-8');
  } catch (error) {
    logger.error('Error generating quote PDF:', error);
    throw error;
  }
}