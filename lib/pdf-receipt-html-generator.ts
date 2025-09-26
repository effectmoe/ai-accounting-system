import { cleanDuplicateSignatures } from './utils/clean-duplicate-signatures';
import { getItemDescription } from './item-utils';

// 住所情報を組み立てるヘルパー関数
function buildCustomerAddress(receipt: any): string {
  const customerSnapshot = receipt.customerSnapshot || {};

  let fullAddress = '';

  // パターン1: customerSnapshot.address (単一フィールド)
  if (customerSnapshot.address) {
    fullAddress = customerSnapshot.address;
  }
  // パターン2: 分割フィールドから組み立て (customerSnapshot)
  else if (customerSnapshot.postalCode || customerSnapshot.prefecture || customerSnapshot.city || customerSnapshot.address1 || customerSnapshot.address2) {
    fullAddress = [
      customerSnapshot.postalCode,
      customerSnapshot.prefecture,
      customerSnapshot.city,
      customerSnapshot.address1,
      customerSnapshot.address2
    ].filter(Boolean).join(' ');
  }
  // パターン3: customerAddress (レガシー)
  else if (receipt.customerAddress) {
    fullAddress = receipt.customerAddress;
  }

  return fullAddress;
}

// 担当者情報を取得するヘルパー関数
function getContactPerson(receipt: any): string {
  const customerSnapshot = receipt.customerSnapshot || {};

  let contactPerson = '';

  // パターン1: customerSnapshot.contactName
  if (customerSnapshot.contactName) {
    contactPerson = customerSnapshot.contactName;
  }

  return contactPerson;
}

// 顧客名を取得するヘルパー関数
function getCustomerName(receipt: any): string {
  const customerSnapshot = receipt.customerSnapshot || {};

  // パターン1: customerSnapshot.companyName
  if (customerSnapshot.companyName) {
    return customerSnapshot.companyName;
  }
  // パターン2: customerName (レガシー)
  else if (receipt.customerName) {
    return receipt.customerName;
  }

  return '顧客名未設定';
}

// ファイル名生成: 発行日_領収書_顧客名.pdf
export function generateReceiptFilename(receipt: any): string {
  const issueDate = receipt.issueDate ? new Date(receipt.issueDate) : new Date();
  const dateStr = issueDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const customerName = getCustomerName(receipt).replace(/[<>:"/\\|?*]/g, '_').substring(0, 50); // 不正文字除去、50文字制限

  return `${dateStr}_領収書_${customerName}.pdf`;
}

// 安全なファイル名生成（ヘッダー用）
export function generateSafeReceiptFilename(receipt: any): string {
  const issueDate = receipt.issueDate ? new Date(receipt.issueDate) : new Date();
  const dateStr = issueDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const customerName = getCustomerName(receipt).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50); // ASCII文字のみ

  return `${dateStr}_receipt_${customerName}.pdf`;
}

export function generateCompactReceiptHTML(receipt: any, companyInfo: any, showDescriptions: boolean = true): string {
  logger.debug('=== FULL RECEIPT DATA FOR PDF GENERATION ===');
  logger.debug('Receipt Number:', receipt.receiptNumber);
  logger.debug('Customer Snapshot:', receipt.customerSnapshot);
  logger.debug('=======================================');

  const issueDate = receipt.issueDate ? new Date(receipt.issueDate) : new Date();
  const paidDate = receipt.paidDate ? new Date(receipt.paidDate) : issueDate;

  const customerName = getCustomerName(receipt);
  const customerAddress = buildCustomerAddress(receipt);
  const contactPerson = getContactPerson(receipt);

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined) return '¥0';
    return `¥${amount.toLocaleString('ja-JP')}`;
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>領収書 ${receipt.receiptNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }

        body {
            font-family: 'Hiragino Sans', 'ヒラギノ角ゴシック', 'Yu Gothic Medium', '游ゴシック Medium', 'Yu Gothic', '游ゴシック', sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
            background: white;
        }

        .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }

        .header-left h1 {
            font-size: 28px;
            font-weight: bold;
            margin: 0 0 5px 0;
            color: #333;
        }

        .header-left .receipt-number {
            font-size: 14px;
            color: #666;
            margin: 0;
        }

        .header-right {
            text-align: right;
            font-size: 12px;
        }

        .company-info {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
        }

        .company-left, .company-right {
            flex: 1;
        }

        .company-right {
            text-align: right;
        }

        .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .bill-to {
            margin-bottom: 20px;
        }

        .bill-to-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
        }

        .customer-info {
            padding-left: 10px;
        }

        .amount-section {
            margin: 30px 0;
            text-align: center;
        }

        .amount-box {
            border: 2px solid #333;
            padding: 20px;
            display: inline-block;
            min-width: 300px;
        }

        .amount-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .amount-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }

        .details-section {
            margin-bottom: 30px;
        }

        .details-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
        }

        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
        }

        .detail-label {
            font-weight: bold;
        }

        .purpose-section {
            margin-bottom: 30px;
        }

        .purpose-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .purpose-content {
            border: 1px solid #ddd;
            padding: 10px;
            min-height: 40px;
            background: #f9f9f9;
        }

        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .receipt-container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- ヘッダー -->
        <div class="header">
            <div class="header-left">
                <h1>領 収 書</h1>
                <p class="receipt-number">No. ${receipt.receiptNumber}</p>
            </div>
            <div class="header-right">
                <div>発行日: ${formatDate(issueDate)}</div>
            </div>
        </div>

        <!-- 宛先 -->
        <div class="bill-to">
            <div class="bill-to-title">宛先</div>
            <div class="customer-info">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
                    ${customerName}${contactPerson ? ' ' + contactPerson : ''} 様
                </div>
                ${customerAddress ? `<div style="margin-bottom: 5px;">${customerAddress}</div>` : ''}
            </div>
        </div>

        <!-- 金額 -->
        <div class="amount-section">
            <div class="amount-box">
                <div class="amount-title">領収金額</div>
                <div class="amount-value">${formatCurrency(receipt.totalAmount || 0)}</div>
            </div>
        </div>

        <!-- 詳細情報 -->
        <div class="details-section">
            <div class="details-title">詳細情報</div>
            <div class="details-grid">
                <div>
                    <div class="detail-item">
                        <span class="detail-label">支払日:</span>
                        <span>${formatDate(paidDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">支払方法:</span>
                        <span>${receipt.paymentMethod === 'bank_transfer' ? '銀行振込' :
                                receipt.paymentMethod === 'credit_card' ? 'クレジットカード' :
                                receipt.paymentMethod === 'cash' ? '現金' : 'その他'}</span>
                    </div>
                    ${receipt.invoiceNumber ? `
                    <div class="detail-item">
                        <span class="detail-label">請求書番号:</span>
                        <span>${receipt.invoiceNumber}</span>
                    </div>
                    ` : ''}
                </div>
                <div>
                    <div class="detail-item">
                        <span class="detail-label">小計:</span>
                        <span>${formatCurrency(receipt.subtotal || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">消費税:</span>
                        <span>${formatCurrency(receipt.taxAmount || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">合計:</span>
                        <span style="font-weight: bold;">${formatCurrency(receipt.totalAmount || 0)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 但し書き -->
        <div class="purpose-section">
            <div class="purpose-title">但し書き</div>
            <div class="purpose-content">
                ${receipt.purpose || receipt.notes || '上記の通り正に領収いたしました。'}
            </div>
        </div>

        <!-- 発行者情報 -->
        <div class="company-info">
            <div class="company-left">
                ${receipt.companySnapshot?.invoiceRegistrationNumber ? `
                <div style="font-size: 10px; margin-bottom: 5px;">
                    登録番号: ${receipt.companySnapshot.invoiceRegistrationNumber}
                </div>
                ` : ''}
            </div>
            <div class="company-right">
                <div class="company-name">${receipt.companySnapshot?.companyName || companyInfo?.company_name || '会社名未設定'}</div>
                <div>${receipt.companySnapshot?.address || companyInfo?.address || ''}</div>
                ${receipt.companySnapshot?.phone ? `<div>TEL: ${receipt.companySnapshot.phone}</div>` : ''}
                ${receipt.companySnapshot?.email ? `<div>Email: ${receipt.companySnapshot.email}</div>` : ''}

                ${receipt.companySnapshot?.sealImageUrl || receipt.companySnapshot?.stampImage ? `
                <div style="margin-top: 15px;">
                    <img src="${receipt.companySnapshot.sealImageUrl || receipt.companySnapshot.stampImage}"
                         alt="社印" style="width: 60px; height: 60px; object-fit: contain;" />
                </div>
                ` : ''}
            </div>
        </div>

        <div class="footer">
            <p>この領収書は ${receipt.receiptNumber} として発行されました。</p>
        </div>
    </div>
</body>
</html>`;
}

// loggerインポート（必要に応じて追加）
import { logger } from '@/lib/logger';