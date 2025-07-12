export function generateCompactInvoiceHTML(invoice: any, companyInfo: any): string {
  const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toISOString().split('T')[0];
  const dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
  
  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount || 0;
  const totalAmount = invoice.totalAmount || 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書 ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
    }
    
    .invoice-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 15mm;
    }
    
    /* ヘッダー */
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    
    .invoice-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 3px;
    }
    
    .invoice-meta {
      text-align: right;
      font-size: 10px;
    }
    
    .invoice-number {
      font-weight: 700;
      margin-bottom: 3px;
    }
    
    /* 顧客・会社情報 */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      gap: 20px;
    }
    
    .customer-info {
      flex: 1;
    }
    
    .customer-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .company-info {
      flex: 1;
      text-align: right;
      font-size: 10px;
    }
    
    .company-name {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    
    /* 合計金額 */
    .total-box {
      background-color: #e6f2ff;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-label {
      font-size: 12px;
      font-weight: 700;
    }
    
    .total-amount {
      font-size: 18px;
      font-weight: 700;
      color: #0066cc;
    }
    
    /* テーブル */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10px;
    }
    
    .invoice-table th {
      background-color: #34495e;
      color: white;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
    }
    
    .invoice-table th:last-child,
    .invoice-table td:last-child {
      text-align: right;
    }
    
    .invoice-table th:nth-child(2),
    .invoice-table td:nth-child(2) {
      text-align: center;
      width: 60px;
    }
    
    .invoice-table th:nth-child(3),
    .invoice-table td:nth-child(3) {
      text-align: right;
      width: 90px;
    }
    
    .invoice-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #ddd;
    }
    
    /* 合計セクション */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 15px;
    }
    
    .summary-table {
      width: 220px;
      font-size: 11px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
    }
    
    .summary-row.total {
      border-top: 2px solid #333;
      padding-top: 5px;
      margin-top: 3px;
      font-weight: 700;
      font-size: 12px;
    }
    
    /* 備考 */
    .notes-section {
      margin-top: 15px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 3px;
      font-size: 10px;
    }
    
    .notes-title {
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .notes-content {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    
    @media print {
      @page {
        size: A4;
        margin: 10mm;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
      
      .invoice-container {
        padding: 0;
        max-width: none;
      }
      
      /* 改ページ防止 */
      .invoice-table,
      .summary-section,
      .notes-section {
        page-break-inside: avoid;
      }
      
      /* より小さなフォントサイズ */
      body {
        font-size: 10px;
      }
      
      .invoice-title {
        font-size: 20px;
      }
      
      .customer-name {
        font-size: 14px;
      }
      
      .total-amount {
        font-size: 16px;
      }
      
      .invoice-table {
        font-size: 9px;
      }
      
      .invoice-table th,
      .invoice-table td {
        padding: 4px 6px;
      }
      
      .notes-section {
        font-size: 9px;
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- ヘッダー -->
    <div class="header-section">
      <h1 class="invoice-title">請求書</h1>
      <div class="invoice-meta">
        <div class="invoice-number">No: ${invoice.invoiceNumber}</div>
        <div>発行日: ${issueDate}</div>
        <div>支払期限: ${dueDate}</div>
      </div>
    </div>
    
    <!-- 顧客・会社情報 -->
    <div class="info-section">
      <div class="customer-info">
        <div class="customer-name">${customerName} 御中</div>
        ${invoice.customer?.address ? `<div>${invoice.customer.address}</div>` : ''}
        ${invoice.customer?.phone ? `<div>TEL: ${invoice.customer.phone}</div>` : ''}
      </div>
      
      <div class="company-info">
        <div class="company-name">${companyInfo?.companyName || ''}</div>
        ${companyInfo?.address ? `<div>${companyInfo.address}</div>` : ''}
        ${companyInfo?.phone ? `<div>TEL: ${companyInfo.phone}</div>` : ''}
        ${companyInfo?.email ? `<div>${companyInfo.email}</div>` : ''}
      </div>
    </div>
    
    <!-- 合計金額 -->
    <div class="total-box">
      <div class="total-label">請求金額合計（税込）</div>
      <div class="total-amount">¥${totalAmount.toLocaleString()}</div>
    </div>
    
    <!-- 明細テーブル -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th>品目・仕様</th>
          <th>数量</th>
          <th>単価</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((item: any) => `
          <tr>
            <td>${item.description || item.itemName || ''}</td>
            <td>${item.quantity}</td>
            <td>¥${(item.unitPrice || 0).toLocaleString()}</td>
            <td>¥${(item.amount || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <!-- 合計 -->
    <div class="summary-section">
      <div class="summary-table">
        <div class="summary-row">
          <div>小計:</div>
          <div>¥${subtotal.toLocaleString()}</div>
        </div>
        <div class="summary-row">
          <div>消費税 (10%):</div>
          <div>¥${taxAmount.toLocaleString()}</div>
        </div>
        <div class="summary-row total">
          <div>合計金額:</div>
          <div>¥${totalAmount.toLocaleString()}</div>
        </div>
      </div>
    </div>
    
    <!-- 備考 -->
    ${invoice.notes ? `
      <div class="notes-section">
        <div class="notes-title">備考</div>
        <div class="notes-content">${invoice.notes}</div>
      </div>
    ` : ''}
  </div>
</body>
</html>
`;

  return htmlContent;
}

// ファイル名生成関数は既存のものを再利用
export { generateInvoiceFilename, generateSafeFilename } from './pdf-html-generator';