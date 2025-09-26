import { cleanDuplicateSignatures } from './utils/clean-duplicate-signatures';
import { getItemDescription } from './item-utils';

// 住所情報を組み立てるヘルパー関数
function buildCustomerAddress(invoice: any): string {
  const customer = invoice.customer || {};
  const customerSnapshot = invoice.customerSnapshot || {};

  let fullAddress = '';

  // パターン1: customer.address (単一フィールド)
  if (customer.address) {
    fullAddress = customer.address;
  }
  // パターン2: customerSnapshot.address (単一フィールド)
  else if (customerSnapshot.address) {
    fullAddress = customerSnapshot.address;
  }
  // パターン3: 分割フィールドから組み立て (customer)
  else if (customer.postalCode || customer.prefecture || customer.city || customer.address1 || customer.address2) {
    fullAddress = [
      customer.postalCode,
      customer.prefecture,
      customer.city,
      customer.address1,
      customer.address2
    ].filter(Boolean).join(' ');
  }
  // パターン4: 分割フィールドから組み立て (customerSnapshot)
  else if (customerSnapshot.postalCode || customerSnapshot.prefecture || customerSnapshot.city || customerSnapshot.address1 || customerSnapshot.address2) {
    fullAddress = [
      customerSnapshot.postalCode,
      customerSnapshot.prefecture,
      customerSnapshot.city,
      customerSnapshot.address1,
      customerSnapshot.address2
    ].filter(Boolean).join(' ');
  }

  return fullAddress;
}

// 担当者情報を取得するヘルパー関数
function getContactPerson(invoice: any): string {
  const customer = invoice.customer || {};
  const customerSnapshot = invoice.customerSnapshot || {};

  let contactPerson = '';

  // パターン1: customer.contactPerson
  if (customer.contactPerson) {
    contactPerson = customer.contactPerson;
  }
  // パターン2: customerSnapshot.contactPerson
  else if (customerSnapshot.contactPerson) {
    contactPerson = customerSnapshot.contactPerson;
  }
  // パターン3: customer.contacts配列から主担当者を取得
  else if (customer.contacts && customer.contacts.length > 0) {
    const primaryContact = customer.contacts.find((c: any) => c.isPrimary) || customer.contacts[0];
    if (primaryContact && primaryContact.name) {
      contactPerson = primaryContact.name;
    }
  }
  // パターン4: customerSnapshot.contactName
  else if (customerSnapshot.contactName) {
    contactPerson = customerSnapshot.contactName;
  }

  return contactPerson;
}

// 請求書HTMLを生成する関数
export function generateCompactInvoiceHTML(invoice: any, companyInfo: any, showDescriptions: boolean = true): string {
  // 完全なデータ構造をログ出力
  console.log('=== FULL INVOICE DATA FOR PDF GENERATION ===');
  console.log('Invoice Number:', invoice.invoiceNumber);
  console.log('Customer Data:', JSON.stringify(invoice.customer, null, 2));
  console.log('Customer Snapshot:', JSON.stringify(invoice.customerSnapshot, null, 2));
  console.log('Items Data:', JSON.stringify(invoice.items?.map((item: any, index: number) => ({
    index,
    itemName: item.itemName,
    description: item.description,
    notes: item.notes,
    allKeys: Object.keys(item)
  })), null, 2));
  console.log('=======================================');

  const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toISOString().split('T')[0];
  const dueDate = new Date(invoice.dueDate || new Date()).toISOString().split('T')[0];

  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount || 0;
  const totalAmount = invoice.totalAmount || 0;

  // 住所情報を事前に組み立て
  const customerAddress = buildCustomerAddress(invoice);

  // 担当者情報を事前に取得
  const contactPerson = getContactPerson(invoice);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>請求書 ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Noto Sans JP", "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", "メイリオ", Meiryo, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: white;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      min-height: 297mm;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .invoice-number {
      font-size: 12px;
      margin-bottom: 10px;
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .customer-info, .company-info {
      width: 48%;
    }

    .company-info {
      text-align: right;
    }

    .info-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
    }

    .dates-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 8px;
      background-color: #f5f5f5;
    }

    .date-item {
      text-align: center;
    }

    .date-label {
      font-size: 10px;
      color: #666;
      margin-bottom: 3px;
    }

    .date-value {
      font-weight: bold;
      font-size: 11px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }

    .items-table th, .items-table td {
      border: 1px solid #333;
      padding: 6px 4px;
      text-align: center;
    }

    .items-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 9px;
    }

    .description-cell {
      text-align: left;
      min-width: ${showDescriptions ? '150px' : '100px'};
    }

    .item-name {
      font-weight: bold;
      margin-bottom: 2px;
    }

    .item-description {
      color: #666;
      font-size: 9px;
      margin-bottom: 2px;
    }

    .item-notes {
      color: #888;
      font-size: 8px;
      font-style: italic;
    }

    .number-cell {
      text-align: right;
      font-family: 'Courier New', monospace;
      width: 60px;
    }

    .wide-number-cell {
      text-align: right;
      font-family: 'Courier New', monospace;
      width: 80px;
    }

    .quantity-cell {
      width: 40px;
    }

    .unit-cell {
      width: 35px;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .totals-table {
      border-collapse: collapse;
      font-size: 11px;
    }

    .totals-table td {
      border: 1px solid #333;
      padding: 6px 12px;
    }

    .totals-table .label {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: left;
      min-width: 80px;
    }

    .totals-table .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      min-width: 100px;
    }

    .total-amount {
      font-size: 14px;
      background-color: #e6f3ff !important;
    }

    .payment-info {
      margin-top: 20px;
      font-size: 10px;
    }

    .payment-title {
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
    }

    .notes-section {
      margin-top: 20px;
      font-size: 10px;
    }

    .notes-title {
      font-weight: bold;
      margin-bottom: 5px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
    }

    .seal-image {
      max-width: 60px;
      max-height: 60px;
      margin-top: 10px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">請求書</div>
      <div class="invoice-number">請求書番号: ${invoice.invoiceNumber}</div>
      ${invoice.title ? `<div style="font-size: 14px; margin-top: 5px; font-weight: bold;">${invoice.title}</div>` : ''}
    </div>

    <div class="info-section">
      <div class="customer-info">
        <div class="info-title">請求先</div>
        <div style="font-weight: bold; margin-bottom: 3px;">${customerName}</div>
        ${contactPerson ? `<div style="margin-bottom: 3px;">${contactPerson} 様</div>` : ''}
        <div style="margin-bottom: 3px;">${customerAddress}</div>
        ${invoice.customerSnapshot?.phone ? `<div style="margin-bottom: 3px;">TEL: ${invoice.customerSnapshot.phone}</div>` : ''}
        ${invoice.customerSnapshot?.email ? `<div>Email: ${invoice.customerSnapshot.email}</div>` : ''}
      </div>

      <div class="company-info">
        <div class="info-title">請求元</div>
        <div style="font-weight: bold; margin-bottom: 3px;">${companyInfo?.companyName || invoice.companySnapshot?.companyName || ''}</div>
        <div style="margin-bottom: 3px;">${companyInfo?.address || invoice.companySnapshot?.address || ''}</div>
        ${(companyInfo?.phone || invoice.companySnapshot?.phone) ? `<div style="margin-bottom: 3px;">TEL: ${companyInfo?.phone || invoice.companySnapshot?.phone}</div>` : ''}
        ${(companyInfo?.email || invoice.companySnapshot?.email) ? `<div style="margin-bottom: 3px;">Email: ${companyInfo?.email || invoice.companySnapshot?.email}</div>` : ''}
        ${(companyInfo?.invoiceRegistrationNumber || invoice.companySnapshot?.invoiceRegistrationNumber) ? `<div style="margin-bottom: 3px;">登録番号: ${companyInfo?.invoiceRegistrationNumber || invoice.companySnapshot?.invoiceRegistrationNumber}</div>` : ''}
        ${(companyInfo?.sealImageUrl || invoice.companySnapshot?.sealImageUrl) ? `<img src="${companyInfo?.sealImageUrl || invoice.companySnapshot?.sealImageUrl}" alt="社印" class="seal-image" />` : ''}
      </div>
    </div>

    <div class="dates-section">
      <div class="date-item">
        <div class="date-label">発行日</div>
        <div class="date-value">${issueDate}</div>
      </div>
      <div class="date-item">
        <div class="date-label">支払期限</div>
        <div class="date-value">${dueDate}</div>
      </div>
      ${invoice.paidDate ? `
      <div class="date-item">
        <div class="date-label">支払日</div>
        <div class="date-value">${new Date(invoice.paidDate).toISOString().split('T')[0]}</div>
      </div>
      ` : ''}
    </div>

    <table class="items-table">
      <thead>
        <tr>
          ${showDescriptions ? '<th class="description-cell">項目</th>' : ''}
          <th class="quantity-cell">数量</th>
          <th class="unit-cell">単位</th>
          <th class="number-cell">単価</th>
          <th class="number-cell">小計</th>
          <th class="number-cell">消費税</th>
          <th class="wide-number-cell">金額</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items?.map((item: any) => {
          const itemDescription = getItemDescription(item);
          return `
            <tr>
              ${showDescriptions ? `
              <td class="description-cell">
                ${item.itemName ? `<div class="item-name">${item.itemName}</div>` : ''}
                ${itemDescription && itemDescription !== item.itemName ? `<div class="item-description">${itemDescription}</div>` : ''}
                ${item.notes ? `<div class="item-notes">※ ${item.notes}</div>` : ''}
              </td>
              ` : ''}
              <td class="quantity-cell">${item.quantity || 1}</td>
              <td class="unit-cell">${item.unit || '個'}</td>
              <td class="number-cell">¥${(item.unitPrice || 0).toLocaleString()}</td>
              <td class="number-cell">¥${(item.amount || 0).toLocaleString()}</td>
              <td class="number-cell">¥${(item.taxAmount || 0).toLocaleString()}</td>
              <td class="wide-number-cell">¥${((item.amount || 0) + (item.taxAmount || 0)).toLocaleString()}</td>
            </tr>
          `;
        }).join('') || ''}
      </tbody>
    </table>

    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">小計</td>
          <td class="amount">¥${subtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">消費税</td>
          <td class="amount">¥${taxAmount.toLocaleString()}</td>
        </tr>
        <tr class="total-amount">
          <td class="label">合計金額</td>
          <td class="amount">¥${totalAmount.toLocaleString()}</td>
        </tr>
        ${invoice.paidAmount > 0 && invoice.paidAmount < totalAmount ? `
        <tr>
          <td class="label">支払済み</td>
          <td class="amount" style="color: #28a745;">¥${invoice.paidAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">残額</td>
          <td class="amount" style="color: #dc3545; font-weight: bold;">¥${(totalAmount - invoice.paidAmount).toLocaleString()}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${(invoice.paymentMethod === 'bank_transfer' && (companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)) ? `
    <div class="payment-info">
      <div class="payment-title">お振込先</div>
      <div>${(companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)?.bankName} ${(companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)?.branchName}</div>
      <div>${(companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)?.accountType} ${(companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)?.accountNumber}</div>
      <div>${(companyInfo?.bankAccount || invoice.companySnapshot?.bankAccount)?.accountHolder}</div>
    </div>
    ` : ''}

    ${invoice.notes ? `
    <div class="notes-section">
      <div class="notes-title">備考</div>
      <div style="white-space: pre-wrap;">${invoice.notes}</div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

// 請求書ファイル名を生成する関数
export function generateInvoiceFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0];
  const customerName = invoice.customer?.companyName || invoice.customerSnapshot?.companyName || '顧客名未設定';
  const safeCustomerName = customerName.replace(/[^\w\-. ]/g, '_').substring(0, 20);

  return `${dateStr}_請求書_${safeCustomerName}.pdf`;
}

// ファイル名を安全に生成する関数（HTTPヘッダー用）
export function generateSafeInvoiceFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0];
  const customerName = invoice.customer?.companyName || invoice.customerSnapshot?.companyName || 'customer';
  const safeCustomerName = customerName.replace(/[^\w\-]/g, '_').substring(0, 20);

  return `${dateStr}_invoice_${safeCustomerName}.pdf`;
}