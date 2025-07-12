import { DocumentData } from './document-generator';

export function generateInvoiceHTML(invoice: any, companyInfo: any): string {
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
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .invoice-content {
      padding: 30px;
    }
    
    .invoice-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      margin-bottom: 10px;
    }
    
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
    
    .total-amount-box {
      background-color: #e6f2ff;
      padding: 15px;
      margin-bottom: 20px;
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
    
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .summary-table {
      width: 300px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .summary-row.total {
      border-top: 2px solid #333;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
    }
    
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
      font-size: 10px;
    }
    
    .notes-title {
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .notes-content {
      white-space: pre-wrap;
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
        page-break-inside: avoid;
      }
      
      .invoice-content {
        padding: 0;
      }
      
      .invoice-header {
        margin-bottom: 20px;
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
        font-size: 9px;
      }
      
      .invoice-table th,
      .invoice-table td {
        padding: 6px;
      }
      
      .summary-section {
        margin-bottom: 20px;
      }
      
      .notes-section {
        margin-top: 20px;
        padding: 10px;
        page-break-inside: avoid;
      }
      
      /* フォントサイズを全体的に小さく */
      body {
        font-size: 9px;
      }
      
      .customer-name {
        font-size: 14px;
      }
      
      .total-label {
        font-size: 12px;
      }
      
      .total-amount {
        font-size: 16px;
      }
      
      /* 改ページ制御 */
      .invoice-table {
        page-break-inside: avoid;
      }
      
      /* 空白行を非表示 */
      .empty-row {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-content">
      <div class="invoice-header">
        <h1 class="invoice-title">請求書</h1>
        <p>Invoice No: ${invoice.invoiceNumber}</p>
      </div>
      
      <div class="invoice-info">
        <div class="customer-info">
          <h2 class="customer-name">${customerName} 御中</h2>
          ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
          ${invoice.customer?.phone ? `<p>TEL: ${invoice.customer.phone}</p>` : ''}
        </div>
        
        <div class="company-info">
          <p>発行日: ${issueDate}</p>
          <p>支払期限: ${dueDate}</p>
          <div style="margin-top: 20px;">
            <h3 class="company-name">${companyInfo?.companyName || ''}</h3>
            ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ''}
            ${companyInfo?.phone ? `<p>TEL: ${companyInfo.phone}</p>` : ''}
            ${companyInfo?.email ? `<p>${companyInfo.email}</p>` : ''}
          </div>
        </div>
      </div>
      
      <div class="total-amount-box">
        <div class="total-label">請求金額合計</div>
        <div class="total-amount">¥${totalAmount.toLocaleString()} (税込)</div>
      </div>
      
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
          ${Array(Math.max(0, 5 - invoice.items.length)).fill('').map(() => `
            <tr class="empty-row">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
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
      
      ${invoice.notes ? `
        <div class="notes-section">
          <h3 class="notes-title">備考</h3>
          <div class="notes-content">${invoice.notes}</div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
`;

  return htmlContent;
}

// Generate filename with new naming convention: 請求日_帳表名_顧客名
export function generateInvoiceFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      '顧客名未設定';
  
  // 日本語の顧客名を維持（ファイル名に使えない文字のみ置換）
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 20); // 長さ制限
  
  return `${dateStr}_請求書_${cleanCustomerName}.pdf`;
}

// Generate filename with ASCII-safe format (for Content-Disposition header)
export function generateSafeFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      'Customer';
  
  // Clean customer name for filename (remove invalid characters)
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x00-\x7F]/g, '_') // Remove any non-ASCII
    .substring(0, 20); // Limit length
  
  return `${dateStr}_Invoice_${cleanCustomerName}.pdf`;
}