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
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      padding: 40px;
    
    }
    
    /* ヘッダー */
    .invoice-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
    }
    
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      margin: 0;
    }
    
    .invoice-number {
      display: none;
    }
    
    /* 顧客・会社情報 */
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .customer-info {
      flex: 1;
    }
    
    .customer-name {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .company-info {
      text-align: right;
      flex: 1;
    }
    
    .company-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    .invoice-dates {
      margin-bottom: 10px;
      line-height: 1.8;
    }
    
    /* 合計金額 */
    .total-amount-box {
      background-color: #e6f2ff;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .total-label {
      font-size: 18px;
      font-weight: 700;
    }
    
    .total-amount {
      font-size: 24px;
      font-weight: 700;
      color: #0066cc;
    }
    
    /* テーブル */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .invoice-table th {
      background-color: #34495e;
      color: white;
      padding: 12px;
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
      width: 80px;
    }
    
    .invoice-table th:nth-child(3),
    .invoice-table td:nth-child(3) {
      text-align: right;
      width: 120px;
    }
    
    .invoice-table td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }
    
    /* 合計セクション */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .summary-table {
      width: 300px;
      padding: 20px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    
    .summary-row.total {
      border-top: 2px solid #333;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
    }
    
    /* 備考 */
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    
    .notes-title {
      font-weight: 700;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .notes-content {
      white-space: pre-wrap;
      line-height: 1.8;
    }
    
    /* 支払情報 */
    .payment-info {
      margin-top: 30px;
    }
    
    .payment-info h3 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .bank-info {
      margin-top: 10px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 5px;
      line-height: 1.8;
    }
    
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      
      body {
        background-color: white;
        margin: 0;
        padding: 0;
      }
      
      .invoice-container {
        box-shadow: none;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        page-break-inside: avoid;
      }
      
      .invoice-header {
        margin-bottom: 20px;
        padding: 20px;
      }
      
      .invoice-title {
        font-size: 24px;
        margin-bottom: 5px;
      }
      
      .invoice-info {
        margin-bottom: 20px;
      }
      
      .total-amount-box {
        margin-bottom: 15px;
        padding: 10px;
      }
      
      .invoice-table {
        margin-bottom: 15px;
        font-size: 10px;
      }
      
      .invoice-table th,
      .invoice-table td {
        padding: 6px;
      }
      
      .summary-section {
        margin-bottom: 20px;
      }
      
      .summary-table {
        padding: 15px;
      }
      
      .notes-section {
        margin-top: 20px;
        padding: 10px;
        page-break-inside: avoid;
      }
      
      /* フォントサイズを全体的に小さく */
      body {
        font-size: 10px;
      }
      
      .customer-name {
        font-size: 16px;
      }
      
      .total-label {
        font-size: 14px;
      }
      
      .total-amount {
        font-size: 18px;
      }
      
      /* 改ページ制御 */
      .invoice-table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- ヘッダー -->
    <div class="invoice-header">
      <h1 class="invoice-title">請求書</h1>
    </div>
    
    <!-- 顧客・会社情報 -->
    <div class="invoice-info">
      <div class="customer-info">
        <h2 class="customer-name">${customerName} 御中</h2>
        ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
        ${invoice.customer?.phone ? `<p>TEL: ${invoice.customer.phone}</p>` : ''}
        ${invoice.customer?.email ? `<p>Email: ${invoice.customer.email}</p>` : ''}
      </div>
      
      <div class="company-info">
        <div class="invoice-dates">
          <p>発行日: ${issueDate}</p>
          <p>支払期限: ${dueDate}</p>
        </div>
        <div style="margin-top: 20px;">
          <h3 class="company-name">${companyInfo?.companyName || ''}</h3>
          ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ''}
          ${companyInfo?.phone ? `<p>TEL: ${companyInfo.phone}</p>` : ''}
          ${companyInfo?.email ? `<p>${companyInfo.email}</p>` : ''}
        </div>
      </div>
    </div>
    
    <!-- 合計金額 -->
    <div class="total-amount-box">
      <div class="total-label">請求金額合計</div>
      <div class="total-amount">¥${totalAmount.toLocaleString()} (税込)</div>
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
    
    <!-- 支払情報 -->
    ${invoice.paymentMethod === 'bank_transfer' && companyInfo?.bankAccount ? `
      <div class="payment-info">
        <h3>振込先</h3>
        <div class="bank-info">
          <p>${companyInfo.bankAccount.bankName} ${companyInfo.bankAccount.branchName}</p>
          <p>${companyInfo.bankAccount.accountType} ${companyInfo.bankAccount.accountNumber}</p>
          <p>${companyInfo.bankAccount.accountHolder}</p>
        </div>
      </div>
    ` : ''}
    
    <!-- 備考 -->
    ${invoice.notes ? `
      <div class="notes-section">
        <h3 class="notes-title">備考</h3>
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