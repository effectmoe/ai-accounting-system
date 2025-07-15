export function generateCompactQuoteHTML(quote: any, companyInfo: any): string {
  const customerName = quote.customer?.companyName || quote.customer?.name || quote.customerSnapshot?.companyName || '';
  const issueDate = new Date(quote.issueDate || new Date()).toISOString().split('T')[0];
  const validityDate = new Date(quote.validityDate || new Date()).toISOString().split('T')[0];
  
  const subtotal = quote.subtotal || 0;
  const taxAmount = quote.taxAmount || 0;
  const totalAmount = quote.totalAmount || 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>見積書 ${quote.quoteNumber}</title>
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
    
    .quote-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      padding: 40px;
    
    }
    
    /* ヘッダー */
    .quote-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
    }
    
    .quote-title {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      margin: 0;
    }
    
    .quote-number {
      display: none;
    }
    
    /* 顧客・会社情報 */
    .quote-info {
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
    
    .quote-dates {
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
      color: #2c3e50;
    }
    
    /* テーブル */
    .quote-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    
    .quote-table th {
      background-color: #34495e;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 700;
    }
    
    .quote-table th:last-child,
    .quote-table td:last-child {
      text-align: right;
    }
    
    .quote-table th:nth-child(2),
    .quote-table td:nth-child(2) {
      text-align: center;
      width: 80px;
    }
    
    .quote-table th:nth-child(3),
    .quote-table td:nth-child(3) {
      text-align: right;
      width: 120px;
    }
    
    .quote-table td {
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
    
    /* 有効期限情報 */
    .validity-info {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
      border-left: 4px solid #34495e;
    }
    
    .validity-info h3 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #34495e;
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
      
      .quote-container {
        box-shadow: none;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        page-break-inside: avoid;
      }
      
      .quote-header {
        margin-bottom: 20px;
        padding: 20px;
      }
      
      .quote-title {
        font-size: 24px;
        margin-bottom: 5px;
      }
      
      .quote-info {
        margin-bottom: 20px;
      }
      
      .total-amount-box {
        margin-bottom: 15px;
        padding: 10px;
      }
      
      .quote-table {
        margin-bottom: 15px;
        font-size: 10px;
      }
      
      .quote-table th,
      .quote-table td {
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
      
      .validity-info {
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
      .quote-table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="quote-container">
    <!-- ヘッダー -->
    <div class="quote-header">
      <h1 class="quote-title">見積書</h1>
    </div>
    
    <!-- 顧客・会社情報 -->
    <div class="quote-info">
      <div class="customer-info">
        <h2 class="customer-name">${customerName} 御中</h2>
        ${quote.customer?.address ? `<p>${quote.customer.address}</p>` : ''}
        ${quote.customer?.phone ? `<p>TEL: ${quote.customer.phone}</p>` : ''}
        ${quote.customer?.email ? `<p>Email: ${quote.customer.email}</p>` : ''}
      </div>
      
      <div class="company-info">
        <div class="quote-dates">
          <p>発行日: ${issueDate}</p>
          <p>有効期限: ${validityDate}</p>
          <p>見積書番号: ${quote.quoteNumber}</p>
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
      <div class="total-label">見積金額合計</div>
      <div class="total-amount">¥${totalAmount.toLocaleString()} (税込)</div>
    </div>
    
    <!-- 明細テーブル -->
    <table class="quote-table">
      <thead>
        <tr>
          <th>品目・仕様</th>
          <th>数量</th>
          <th>単価</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>
        ${quote.items.map((item: any) => `
          <tr>
            <td>${item.description || item.itemName || ''}</td>
            <td>${item.quantity || 0}</td>
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
    
    <!-- 有効期限情報 -->
    <div class="validity-info">
      <h3>見積書有効期限について</h3>
      <p>この見積書の有効期限は ${validityDate} までです。期限を過ぎた場合は改めてお見積りいたします。</p>
    </div>
    
    <!-- 備考 -->
    ${quote.notes ? `
      <div class="notes-section">
        <h3 class="notes-title">備考</h3>
        <div class="notes-content">${quote.notes}</div>
      </div>
    ` : ''}
  </div>
</body>
</html>
`;

  return htmlContent;
}

// Generate filename with new naming convention: 発行日_帳表名_顧客名
export function generateQuoteFilename(quote: any): string {
  const issueDate = new Date(quote.issueDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = quote.customer?.companyName || 
                      quote.customer?.name || 
                      quote.customerSnapshot?.companyName || 
                      '顧客名未設定';
  
  // 日本語の顧客名を維持（ファイル名に使えない文字のみ置換）
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 20); // 長さ制限
  
  return `${dateStr}_見積書_${cleanCustomerName}.pdf`;
}

// Generate filename with ASCII-safe format (for Content-Disposition header)
export function generateSafeQuoteFilename(quote: any): string {
  const issueDate = new Date(quote.issueDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = quote.customer?.companyName || 
                      quote.customer?.name || 
                      quote.customerSnapshot?.companyName || 
                      'Customer';
  
  // Clean customer name for filename (remove invalid characters)
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x00-\x7F]/g, '_') // Remove any non-ASCII
    .substring(0, 20); // Limit length
  
  return `${dateStr}_Quote_${cleanCustomerName}.pdf`;
}