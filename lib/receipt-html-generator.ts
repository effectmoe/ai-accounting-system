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
      padding: 20px;
    }
    
    /* ヘッダー */
    .receipt-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 15px;
      border-bottom: 3px double #333;
    }
    
    .receipt-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 6px;
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
      margin-bottom: 20px;
    }
    
    .customer-name {
      font-size: 20px;
      font-weight: 700;
      border-bottom: 2px solid #333;
      padding-bottom: 3px;
      margin-bottom: 15px;
    }
    
    /* 金額表示 */
    .amount-section {
      background-color: #f8f8f8;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 5px;
      text-align: center;
      border: 2px solid #2563eb;
    }
    
    .amount-label {
      font-size: 18px;
      color: #666;
      margin-bottom: 15px;
    }
    
    .amount-value {
      font-size: 36px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 1px;
    }
    
    /* 但し書き */
    .subject-section {
      margin-bottom: 20px;
      padding: 10px;
      background-color: #fff8dc;
      border-left: 4px solid #fbbf24;
      border-radius: 5px;
    }
    
    .subject-label {
      font-size: 16px;
      font-weight: 700;
      color: #666;
      margin-bottom: 8px;
    }
    
    .subject-text {
      font-size: 18px;
      color: #333;
    }
    
    /* 発行者情報 */
    .issuer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #333;
    }
    
    .issuer-info {
      flex: 1;
    }
    
    .issuer-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .issuer-details {
      font-size: 12px;
      color: #666;
      line-height: 1.6;
    }
    
    /* 印鑑スペース */
    .stamp-area {
      width: 80px;
      height: 80px;
      border: 2px solid #ccc;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 12px;
    }
    
    
    /* 備考 */
    .notes-section {
      margin-top: 20px;
      padding: 12px;
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
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    
    .digital-notice {
      background-color: #eff6ff;
      padding: 5px;
      border-radius: 3px;
      margin-top: 5px;
      font-size: 9px;
    }
    
    /* 印刷用スタイル */
    @media print {
      body {
        background-color: white;
      }
      
      .receipt-container {
        box-shadow: none;
        padding: 10px;
        max-width: 100%;
      }
      
      .receipt-header {
        padding: 10px;
        margin-bottom: 15px;
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
      margin: 5mm;
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
    
    <!-- 税額情報 -->
    <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 20px;">
      <div style="text-align: center;">
        <div style="font-size: 12px; color: #666; margin-bottom: 3px;">税抜金額</div>
        <div style="font-size: 16px; font-weight: 600;">¥${subtotal}</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 12px; color: #666; margin-bottom: 3px;">消費税（${taxRate}%）</div>
        <div style="font-size: 16px; font-weight: 600;">¥${taxAmount}</div>
      </div>
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
      <div class="stamp-area">
        印
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