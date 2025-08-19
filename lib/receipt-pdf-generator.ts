import { Receipt, ReceiptItem } from '@/types/receipt';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * 領収書のHTMLテンプレートを生成
 */
export function generateReceiptHTML(receipt: Receipt): string {
  const issueDate = formatDate(receipt.issueDate);
  const totalAmountFormatted = formatCurrency(receipt.totalAmount);
  const subtotalFormatted = formatCurrency(receipt.subtotal);
  const taxAmountFormatted = formatCurrency(receipt.taxAmount);

  // 明細行を生成
  const itemRows = receipt.items.map(item => generateItemRow(item)).join('');

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>領収書 - ${receipt.receiptNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', 'Yu Gothic', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: white;
    }
    
    .container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 20mm;
      background: white;
    }
    
    @media print {
      body {
        margin: 0;
      }
      .container {
        margin: 0;
        padding: 15mm;
      }
    }
    
    /* ヘッダー */
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .title {
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 8px;
      margin-bottom: 10px;
    }
    
    /* 宛名 */
    .recipient {
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    
    .recipient-name {
      font-size: 20px;
      font-weight: bold;
    }
    
    /* 基本情報 */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .info-left {
      flex: 1;
    }
    
    .info-right {
      text-align: right;
    }
    
    .info-item {
      margin-bottom: 8px;
    }
    
    .info-label {
      display: inline-block;
      min-width: 80px;
      font-weight: bold;
    }
    
    /* 金額セクション */
    .amount-section {
      background: #f8f8f8;
      padding: 20px;
      margin-bottom: 30px;
      border: 2px solid #333;
    }
    
    .total-amount {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 15px;
    }
    
    .amount-breakdown {
      display: flex;
      justify-content: center;
      gap: 30px;
    }
    
    .amount-item {
      text-align: center;
    }
    
    .amount-label {
      font-size: 12px;
      color: #666;
    }
    
    .amount-value {
      font-size: 18px;
      font-weight: bold;
    }
    
    /* 明細テーブル */
    .items-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      background: #f0f0f0;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #ddd;
    }
    
    td {
      padding: 8px;
      border: 1px solid #ddd;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    /* 発行者情報 */
    .issuer-section {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .issuer-info {
      flex: 1;
    }
    
    .issuer-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .issuer-detail {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    
    /* 印影 */
    .stamp-area {
      width: 80px;
      height: 80px;
      border: 2px solid #ff0000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff0000;
      font-weight: bold;
      font-size: 12px;
      text-align: center;
      padding: 10px;
    }
    
    .stamp-image {
      max-width: 80px;
      max-height: 80px;
    }
    
    /* 備考 */
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background: #f8f8f8;
      border: 1px solid #ddd;
    }
    
    .notes-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .notes-content {
      white-space: pre-wrap;
    }
    
    /* フッター */
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ヘッダー -->
    <div class="header">
      <h1 class="title">領収書</h1>
    </div>
    
    <!-- 宛名 -->
    <div class="recipient">
      <div class="recipient-name">${receipt.customerName}</div>
    </div>
    
    <!-- 基本情報 -->
    <div class="info-section">
      <div class="info-left">
        ${receipt.subject ? `<div class="info-item"><span class="info-label">件名:</span> ${receipt.subject}</div>` : ''}
      </div>
      <div class="info-right">
        <div class="info-item"><span class="info-label">領収日:</span> ${issueDate}</div>
        <div class="info-item"><span class="info-label">領収書番号:</span> ${receipt.receiptNumber}</div>
      </div>
    </div>
    
    <!-- 金額セクション -->
    <div class="amount-section">
      <div class="total-amount">
        ￥${totalAmountFormatted}
      </div>
      <div class="amount-breakdown">
        <div class="amount-item">
          <div class="amount-label">内訳</div>
          <div class="amount-value">￥${subtotalFormatted}</div>
        </div>
        <div class="amount-item">
          <div class="amount-label">${Math.round(receipt.taxRate * 100)}%消費税</div>
          <div class="amount-value">￥${taxAmountFormatted}</div>
        </div>
      </div>
    </div>
    
    <!-- 明細 -->
    <div class="items-section">
      <h2 class="section-title">内訳</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40%">摘要</th>
            <th style="width: 15%" class="text-center">数量</th>
            <th style="width: 20%" class="text-right">単価</th>
            <th style="width: 25%" class="text-right">明細金額</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="text-right"><strong>10%対象(税抜)</strong></td>
            <td class="text-right"><strong>￥${subtotalFormatted}</strong></td>
          </tr>
          <tr>
            <td colspan="3" class="text-right"><strong>10%消費税</strong></td>
            <td class="text-right"><strong>￥${taxAmountFormatted}</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <!-- 備考 -->
    ${receipt.notes ? `
    <div class="notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-content">${receipt.notes}</div>
    </div>
    ` : ''}
    
    <!-- 発行者情報 -->
    <div class="issuer-section">
      <div class="issuer-info">
        <div class="issuer-name">${receipt.issuerName}</div>
        ${receipt.issuerAddress ? `<div class="issuer-detail">${receipt.issuerAddress}</div>` : ''}
        ${receipt.issuerPhone ? `<div class="issuer-detail">TEL: ${receipt.issuerPhone}</div>` : ''}
        ${receipt.issuerEmail ? `<div class="issuer-detail">Email: ${receipt.issuerEmail}</div>` : ''}
      </div>
      <div class="stamp-area">
        ${receipt.issuerStamp ? 
          `<img src="${receipt.issuerStamp}" alt="印影" class="stamp-image" />` :
          `<div>印</div>`
        }
      </div>
    </div>
    
    <!-- フッター -->
    <div class="footer">
      <p>この領収書は電子的に発行されたものです。印紙税法第5条により収入印紙の貼付は不要です。</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 明細行のHTMLを生成
 */
function generateItemRow(item: ReceiptItem): string {
  const unitPriceFormatted = formatCurrency(item.unitPrice);
  const amountFormatted = formatCurrency(item.amount);
  const unit = item.unit || '個';
  
  return `
    <tr>
      <td>${item.description}</td>
      <td class="text-center">${item.quantity} ${unit}</td>
      <td class="text-right">￥${unitPriceFormatted}</td>
      <td class="text-right">￥${amountFormatted}</td>
    </tr>
  `;
}