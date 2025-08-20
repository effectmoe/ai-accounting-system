import { Receipt } from '@/types/receipt';

/**
 * 領収書のHTMLを生成する
 */
export function generateReceiptHTML(receipt: Receipt): string {
  const issueDate = new Date(receipt.issueDate).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subtotal = (receipt.subtotal ?? 0).toLocaleString('ja-JP');
  const taxAmount = (receipt.taxAmount ?? 0).toLocaleString('ja-JP');
  const totalAmount = (receipt.totalAmount ?? 0).toLocaleString('ja-JP');
  const taxRate = Math.round((receipt.taxRate || 0.1) * 100);

  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>領収書 ${receipt.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      padding: 40px;
    }
    
    /* ヘッダー */
    .receipt-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px;
      border-bottom: 3px double #333;
    }
    
    .receipt-title {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      margin: 0;
    }
    
    .receipt-number {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
    }
    
    .receipt-date {
      margin-top: 5px;
      font-size: 14px;
      color: #666;
    }
    
    /* 宛名 */
    .customer-section {
      margin-bottom: 30px;
    }
    
    .customer-name {
      font-size: 24px;
      font-weight: 700;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
      margin-bottom: 20px;
    }
    
    /* 金額表示 */
    .amount-section {
      background-color: #f8f8f8;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 5px;
      text-align: center;
    }
    
    .amount-label {
      font-size: 16px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .amount-value {
      font-size: 48px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 2px;
    }
    
    /* 但し書き */
    .subject-section {
      margin-bottom: 30px;
      padding: 15px;
      background-color: #fff8dc;
      border-left: 4px solid #fbbf24;
    }
    
    .subject-label {
      font-size: 14px;
      font-weight: 700;
      color: #666;
      margin-bottom: 5px;
    }
    
    .subject-text {
      font-size: 16px;
      color: #333;
    }
    
    /* 内訳テーブル */
    .breakdown-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 2px solid #333;
    }
    
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .breakdown-table th {
      background-color: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #d1d5db;
    }
    
    .breakdown-table td {
      padding: 10px 12px;
      border: 1px solid #d1d5db;
    }
    
    .breakdown-table .text-right {
      text-align: right;
    }
    
    .breakdown-table .text-center {
      text-align: center;
    }
    
    .summary-row {
      background-color: #f9fafb;
      font-weight: 600;
    }
    
    .total-row {
      background-color: #e6f2ff;
      font-weight: 700;
      font-size: 16px;
    }
    
    /* 発行者情報 */
    .issuer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #333;
    }
    
    .issuer-info {
      flex: 1;
    }
    
    .issuer-name {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .issuer-details {
      font-size: 13px;
      color: #666;
      line-height: 1.8;
    }
    
    
    /* 備考 */
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 5px;
    }
    
    .notes-title {
      font-size: 14px;
      font-weight: 700;
      color: #666;
      margin-bottom: 10px;
    }
    
    .notes-text {
      font-size: 13px;
      color: #333;
      white-space: pre-wrap;
    }
    
    /* フッター */
    .receipt-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    
    .digital-notice {
      background-color: #eff6ff;
      padding: 10px;
      border-radius: 5px;
      margin-top: 10px;
    }
    
    /* 印刷用スタイル */
    @media print {
      body {
        background-color: white;
      }
      
      .receipt-container {
        box-shadow: none;
        padding: 20px;
        max-width: 100%;
      }
      
      .receipt-header {
        padding: 20px;
      }
      
      .amount-section {
        background-color: #f8f8f8 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .subject-section {
        background-color: #fff8dc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .breakdown-table th {
        background-color: #f3f4f6 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .summary-row {
        background-color: #f9fafb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .total-row {
        background-color: #e6f2ff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    
    @page {
      size: A4;
      margin: 10mm;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- ヘッダー -->
    <div class="receipt-header">
      <h1 class="receipt-title">領 収 書</h1>
      <div class="receipt-number">No. ${receipt.receiptNumber}</div>
      <div class="receipt-date">${issueDate}</div>
    </div>
    
    <!-- 宛名 -->
    <div class="customer-section">
      <div class="customer-name">${receipt.customerName || '様'}</div>
    </div>
    
    <!-- 金額 -->
    <div class="amount-section">
      <div class="amount-label">領収金額</div>
      <div class="amount-value">¥ ${totalAmount}</div>
    </div>
    
    <!-- 但し書き -->
    <div class="subject-section">
      <div class="subject-label">但し書き</div>
      <div class="subject-text">${receipt.subject || 'お品代として'}</div>
    </div>
    
    <!-- 内訳 -->
    <div class="breakdown-section">
      <h2 class="section-title">内訳明細</h2>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th style="width: 50%;">摘要</th>
            <th class="text-center" style="width: 15%;">数量</th>
            <th class="text-right" style="width: 15%;">単価</th>
            <th class="text-right" style="width: 20%;">金額</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items.map(item => `
          <tr>
            <td>${item.description || '-'}</td>
            <td class="text-center">${(item.quantity ?? 1).toLocaleString('ja-JP')} ${item.unit || '式'}</td>
            <td class="text-right">¥${(item.unitPrice ?? 0).toLocaleString('ja-JP')}</td>
            <td class="text-right">¥${(item.amount ?? 0).toLocaleString('ja-JP')}</td>
          </tr>
          `).join('')}
          <tr class="summary-row">
            <td colspan="3" class="text-right">小計</td>
            <td class="text-right">¥${subtotal}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="3" class="text-right">消費税（${taxRate}%）</td>
            <td class="text-right">¥${taxAmount}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" class="text-right">合計金額</td>
            <td class="text-right">¥${totalAmount}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 発行者情報 -->
    <div class="issuer-section">
      <div class="issuer-info">
        <div class="issuer-name">${receipt.issuerName || '発行者名'}</div>
        <div class="issuer-details">
          ${receipt.issuerAddress ? `${receipt.issuerAddress}<br>` : ''}
          ${receipt.issuerPhone ? `TEL: ${receipt.issuerPhone}<br>` : ''}
          ${receipt.issuerEmail ? `Email: ${receipt.issuerEmail}<br>` : ''}
          ${receipt.issuerRegistrationNumber ? `登録番号: ${receipt.issuerRegistrationNumber}` : ''}
        </div>
      </div>
    </div>
    
    <!-- 備考 -->
    ${receipt.notes ? `
    <div class="notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-text">${receipt.notes}</div>
    </div>
    ` : ''}
    
    <!-- フッター -->
    <div class="receipt-footer">
      <div class="digital-notice">
        この領収書は電子的に発行されたものです。<br>
        印紙税法第5条により収入印紙の貼付は不要です。
      </div>
      ${receipt.invoiceNumber ? `<div style="margin-top: 10px;">関連請求書番号: ${receipt.invoiceNumber}</div>` : ''}
    </div>
  </div>
</body>
</html>
  `;

  return htmlContent;
}

/**
 * 領収書のファイル名を生成する
 */
export function generateReceiptFilename(receipt: Receipt): string {
  const date = new Date(receipt.issueDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 顧客名から特殊文字を除去
  const customerName = receipt.customerName
    .replace(/[\s　]/g, '_')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]/g, '');
  
  return `${year}${month}${day}_領収書_${customerName}.pdf`;
}

/**
 * ASCII文字のみのセーフなファイル名を生成する
 */
export function generateSafeReceiptFilename(receipt: Receipt): string {
  return `receipt_${receipt.receiptNumber}.pdf`;
}