import { supabase } from './supabase';

export interface DocumentItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  amount: number;
}

export interface DocumentData {
  documentType: 'estimate' | 'invoice' | 'delivery_note' | 'receipt' | 'quote' | 'delivery-note';
  documentNumber: string;
  issueDate: string | Date;
  partner?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    postal_code?: string;
    registrationNumber?: string;
  };
  // 新しいフィールド（EmailSendModalで使用）
  customerName?: string;
  customerAddress?: string;
  customer?: any; // Customer型の完全なオブジェクト
  customerSnapshot?: any; // スナップショット
  validUntilDate?: Date; // 見積書有効期限
  
  items: DocumentItem[] | any[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  validUntil?: string;
  dueDate?: string | Date; // 支払期日・入金期日
  deliveryDate?: string | Date; // 納品日
  paidDate?: string | Date; // 支払日・領収日（領収書用）
  paymentMethod?: string; // 支払方法
  bankInfo?: { // 振込先情報
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountHolder?: string;
  };
  bankAccount?: any; // 別形式の銀行情報
  projectName?: string; // 件名・案件名
  deliveryInfo?: { // 納品情報
    deliveryDate?: string;
    deliveryLocation?: string;
  };
  company?: { // 自社情報
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
    bankAccount?: string;
    sealImageUrl?: string; // 社印画像URL
  };
  companyInfo?: { // 別形式の会社情報
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
    stampImage?: string;
  };
}

export class DocumentGenerator {
  async generateFromNaturalLanguage(input: string, companyId: string): Promise<DocumentData> {
    // 自然言語から文書タイプを判定
    const documentType = this.detectDocumentType(input);
    
    // 取引先を抽出
    const partner = await this.extractPartner(input, companyId);
    
    // 品目と金額を抽出
    const items = await this.extractItems(input, companyId);
    
    // 日付を抽出
    const dates = this.extractDates(input);
    
    // 金額を計算
    const { subtotal, tax, total } = this.calculateAmounts(items);
    
    // 文書番号を生成
    const documentNumber = await this.generateDocumentNumber(documentType, companyId);
    
    // 件名を抽出
    const projectName = this.extractProjectName(input, documentType);
    
    // 支払期日を設定
    const dueDate = this.calculateDueDate(dates.issueDate || new Date().toISOString().split('T')[0], documentType);
    
    return {
      documentType,
      documentNumber,
      issueDate: dates.issueDate || new Date().toISOString().split('T')[0],
      partner,
      items,
      subtotal,
      tax,
      total,
      notes: this.extractNotes(input),
      paymentTerms: this.extractPaymentTerms(input),
      validUntil: dates.validUntil,
      dueDate,
      paymentMethod: '銀行振込',
      bankInfo: {
        bankName: 'みずほ銀行',
        branchName: '渋谷支店',
        accountType: '普通',
        accountNumber: '1234567',
        accountHolder: 'カ)ビアソラ'
      },
      projectName,
      deliveryInfo: documentType === 'delivery_note' ? {
        deliveryDate: dates.issueDate || new Date().toISOString().split('T')[0],
        deliveryLocation: partner.address || '貴社指定場所'
      } : undefined
    };
  }
  
  private detectDocumentType(input: string): DocumentData['documentType'] {
    const text = input.toLowerCase();
    
    if (text.includes('見積') || text.includes('みつもり') || text.includes('estimate')) {
      return 'estimate';
    } else if (text.includes('請求') || text.includes('せいきゅう') || text.includes('invoice')) {
      return 'invoice';
    } else if (text.includes('納品') || text.includes('のうひん') || text.includes('delivery')) {
      return 'delivery_note';
    } else if (text.includes('領収') || text.includes('りょうしゅう') || text.includes('receipt')) {
      return 'receipt';
    }
    
    // デフォルトは請求書
    return 'invoice';
  }
  
  private async extractPartner(input: string, companyId: string): Promise<DocumentData['partner']> {
    // パートナー名を抽出する正規表現パターン
    const patterns = [
      /(?:(?:株式会社|有限会社|合同会社|株)\s*)?[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+(?:株式会社|有限会社|合同会社)?/g,
      /[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:Inc\.|Corp\.|Ltd\.|LLC))?/g
    ];
    
    for (const pattern of patterns) {
      const matches = input.match(pattern);
      if (matches) {
        // データベースから取引先を検索
        const { data: partners } = await supabase
          .from('partners')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${matches[0]}%`)
          .limit(1);
        
        if (partners && partners.length > 0) {
          const partner = partners[0];
          return {
            name: partner.display_name || partner.name,
            address: partner.address,
            phone: partner.phone,
            email: partner.email
          };
        }
        
        // 見つからない場合は抽出した名前をそのまま使用
        return { name: matches[0] };
      }
    }
    
    return { name: '取引先名' };
  }
  
  private async extractItems(input: string, companyId: string): Promise<DocumentItem[]> {
    const items: DocumentItem[] = [];
    
    // 金額パターン（税込み・税抜きの判定含む）
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*円(?:\s*(?:（|[\(])?\s*(?:税込|込み?|税抜|抜き?)?\s*(?:）|[\)])?)?/g;
    const quantityPattern = /(\d+)\s*(?:個|枚|本|件|時間|h)/g;
    
    // 品目名の候補を抽出
    const { data: dbItems } = await supabase
      .from('items')
      .select('*')
      .eq('company_id', companyId);
    
    // シンプルな実装：最初に見つかった金額を使用
    const amountMatches = input.match(amountPattern);
    if (amountMatches && amountMatches.length > 0) {
      const amountStr = amountMatches[0];
      const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));
      const isTaxIncluded = amountStr.includes('込') || amountStr.includes('税込');
      
      // 品目名を探す
      let itemName = 'サービス料';
      if (dbItems && dbItems.length > 0) {
        for (const dbItem of dbItems) {
          if (input.includes(dbItem.name)) {
            itemName = dbItem.name;
            break;
          }
        }
      }
      
      // 数量を探す
      let quantity = 1;
      const quantityMatches = input.match(quantityPattern);
      if (quantityMatches && quantityMatches.length > 0) {
        quantity = parseInt(quantityMatches[0].match(/\d+/)?.[0] || '1');
      }
      
      const taxRate = 0.10; // デフォルト10%
      let unitPrice: number;
      
      if (isTaxIncluded) {
        // 税込み価格から税抜き価格を計算
        unitPrice = amount / (1 + taxRate) / quantity;
      } else {
        unitPrice = amount / quantity;
      }
      
      items.push({
        name: itemName,
        quantity,
        unitPrice: Math.round(unitPrice),
        taxRate,
        amount: Math.round(unitPrice * quantity)
      });
    }
    
    return items.length > 0 ? items : [{
      name: 'サービス料',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.10,
      amount: 0
    }];
  }
  
  private extractDates(input: string): { issueDate?: string; validUntil?: string } {
    const dates: { issueDate?: string; validUntil?: string } = {};
    
    // 日付パターン
    const datePatterns = [
      /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/g,
      /(\d{1,2})[月\/](\d{1,2})日?/g
    ];
    
    for (const pattern of datePatterns) {
      const matches = [...input.matchAll(pattern)];
      if (matches.length > 0) {
        const match = matches[0];
        if (match[3]) {
          // YYYY-MM-DD形式
          dates.issueDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        } else if (match[2]) {
          // MM-DD形式（今年と仮定）
          const year = new Date().getFullYear();
          dates.issueDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
        }
        break;
      }
    }
    
    // 有効期限の抽出
    if (input.includes('有効期限') || input.includes('期限')) {
      // 簡易実装：発行日から30日後
      if (dates.issueDate) {
        const issueDate = new Date(dates.issueDate);
        issueDate.setDate(issueDate.getDate() + 30);
        dates.validUntil = issueDate.toISOString().split('T')[0];
      }
    }
    
    return dates;
  }
  
  private calculateAmounts(items: DocumentItem[]): { subtotal: number; tax: number; total: number } {
    // TypeScript税制ライブラリを使用してインボイス制度対応の税計算
    const { TaxCalculator } = require('./tax-calculator');
    
    const taxItems = items.map(item => ({
      amount: item.amount,
      taxRate: item.taxRate !== undefined ? item.taxRate : 0.10,
      isTaxIncluded: false // 単価は税抜きとして扱う
    }));
    
    const result = TaxCalculator.calculateInvoiceTax(taxItems);
    
    return {
      subtotal: result.subtotal,
      tax: result.taxAmount,
      total: result.total
    };
  }
  
  private async generateDocumentNumber(documentType: DocumentData['documentType'], companyId: string): Promise<string> {
    const prefix = {
      estimate: 'EST',
      invoice: 'INV',
      delivery_note: 'DLV',
      receipt: 'RCP'
    }[documentType];
    
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // 簡易実装：ランダムな番号
    const random = Math.floor(Math.random() * 9999) + 1;
    
    return `${prefix}-${dateStr}-${String(random).padStart(4, '0')}`;
  }
  
  private extractNotes(input: string): string {
    // 備考や注記を抽出
    const notePatterns = [
      /備考[:：]\s*(.+)/,
      /注記[:：]\s*(.+)/,
      /※\s*(.+)/
    ];
    
    for (const pattern of notePatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  private extractPaymentTerms(input: string): string {
    // 支払条件を抽出
    const termsPatterns = [
      /支払[いい]?条件[:：]\s*(.+)/,
      /振込期限[:：]\s*(.+)/,
      /月末締め翌月末/,
      /即日払い/
    ];
    
    for (const pattern of termsPatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[0].replace(/支払[いい]?条件[:：]\s*/, '').trim();
      }
    }
    
    return '請求書発行後30日以内';
  }
  
  private extractProjectName(input: string, documentType: DocumentData['documentType']): string {
    // 件名を抽出
    const projectPatterns = [
      /件名[:：]\s*(.+)/,
      /案件[:：]\s*(.+)/,
      /プロジェクト[:：]\s*(.+)/,
      /(.+)の見積/,
      /(.+)について/
    ];
    
    for (const pattern of projectPatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // デフォルトの件名
    const defaults = {
      estimate: 'お見積りの件',
      invoice: 'ご請求の件', 
      delivery_note: '納品の件',
      receipt: '領収書発行の件'
    };
    
    return defaults[documentType];
  }
  
  private calculateDueDate(issueDate: string, documentType: DocumentData['documentType']): string {
    const date = new Date(issueDate);
    
    if (documentType === 'invoice') {
      // 請求書の場合は月末締め翌月末払い
      date.setMonth(date.getMonth() + 2, 0); // 翌月末
    } else {
      // その他は30日後
      date.setDate(date.getDate() + 30);
    }
    
    return date.toISOString().split('T')[0];
  }
}

export function generateDocumentHTML(data: DocumentData): string {
  const typeLabels = {
    estimate: '見積書',
    invoice: '請求書',
    delivery_note: '納品書',
    receipt: '領収書'
  };
  
  // 会社情報（デモ用）
  const companyInfo = {
    name: '株式会社ビアソラ',
    postal: '〒802-0978',
    address: '福岡県北九州市小倉南区蒲生2-3-3',
    phone: 'TEL: 093-123-4567',
    fax: 'FAX: 093-123-4568',
    email: 'info@biasora.co.jp',
    registrationNumber: 'T1234567890123'
  };
  
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabels[data.documentType]}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: 'Hiragino Sans', 'Meiryo', sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      position: relative;
      margin-bottom: 30px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30px;
      color: #2c3e50;
    }
    .partner-section {
      margin-bottom: 20px;
    }
    .partner-name {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
    }
    .document-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .left-meta {
      flex: 1;
    }
    .right-meta {
      text-align: right;
      font-size: 14px;
    }
    .company-info {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 5px;
      font-size: 14px;
    }
    .amount-highlight {
      background-color: #e3f2fd;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
    }
    .amount-label {
      font-size: 16px;
      color: #666;
      margin-bottom: 5px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: bold;
      color: #1976d2;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .table th {
      background-color: #34495e;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: normal;
    }
    .table td {
      border-bottom: 1px solid #ecf0f1;
      padding: 12px;
    }
    .table tbody tr:hover {
      background-color: #f8f9fa;
    }
    .table .quantity, .table .unit-price, .table .amount {
      text-align: right;
    }
    .table .item-name {
      font-weight: 500;
    }
    .summary {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 8px;
      border-bottom: 1px solid #ecf0f1;
    }
    .summary-table .label {
      text-align: left;
      color: #666;
    }
    .summary-table .value {
      text-align: right;
      font-weight: bold;
    }
    .summary-table .total td {
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      font-size: 18px;
      padding: 12px 8px;
    }
    .notes-section {
      margin-top: 40px;
      padding: 20px;
      background-color: #f8f9fa;
      border-left: 4px solid #3498db;
      border-radius: 0 5px 5px 0;
    }
    .notes-title {
      font-weight: bold;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      font-size: 12px;
      color: #7f8c8d;
      text-align: center;
    }
    .stamp-area {
      margin-top: 30px;
      text-align: right;
    }
    .stamp-box {
      display: inline-block;
      width: 80px;
      height: 80px;
      border: 2px solid #7f8c8d;
      text-align: center;
      line-height: 80px;
      color: #bdc3c7;
      border-radius: 5px;
    }
    .qr-code {
      position: absolute;
      top: 0;
      right: 0;
      width: 100px;
      height: 100px;
      border: 1px solid #ddd;
      padding: 5px;
      background: white;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">${typeLabels[data.documentType]}</h1>
    
    <div class="header">
      <div class="qr-code">
        <div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">
          QRコード
        </div>
      </div>
    </div>
    
    <div class="partner-section">
      <div class="partner-name">${data.partner.name} 御中</div>
      ${data.partner.address ? `<div>〒${data.partner.postal_code || ''} ${data.partner.address}</div>` : ''}
      ${data.partner.phone ? `<div>TEL: ${data.partner.phone}</div>` : ''}
      ${data.partner.registrationNumber ? `<div>登録番号: ${data.partner.registrationNumber}</div>` : ''}
    </div>
    
    ${data.projectName ? `
      <div style="margin: 20px 0; padding: 15px; background: #f0f7ff; border-left: 4px solid #2196f3;">
        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">件名</div>
        <div style="font-size: 18px; font-weight: bold; color: #333;">${data.projectName}</div>
      </div>
    ` : ''}
    
    <div class="document-meta">
      <div class="left-meta">
        <div class="amount-highlight">
          <div class="amount-label">${data.documentType === 'estimate' ? 'お見積金額' : '合計金額'}</div>
          <div class="amount-value">¥${data.total.toLocaleString()}</div>
          <div style="font-size: 14px; color: #666; margin-top: 5px;">（税込）</div>
        </div>
      </div>
      <div class="right-meta">
        <div><strong>発行日:</strong> ${data.issueDate}</div>
        <div><strong>文書番号:</strong> ${data.documentNumber}</div>
        ${data.validUntil ? `<div><strong>有効期限:</strong> ${data.validUntil}</div>` : ''}
        ${data.dueDate && data.documentType === 'invoice' ? `<div><strong>お支払期日:</strong> ${data.dueDate}</div>` : ''}
        <div class="company-info">
          <div style="font-weight: bold; margin-bottom: 10px;">${companyInfo.name}</div>
          <div>${companyInfo.postal}</div>
          <div>${companyInfo.address}</div>
          <div>${companyInfo.phone}</div>
          <div>${companyInfo.email}</div>
          <div style="margin-top: 5px;">登録番号: ${companyInfo.registrationNumber}</div>
        </div>
      </div>
    </div>
    
    <table class="table">
      <thead>
        <tr>
          <th style="width: 50%">品目・仕様</th>
          <th style="width: 15%" class="quantity">数量</th>
          <th style="width: 15%" class="unit-price">単価</th>
          <th style="width: 20%" class="amount">金額</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map((item, index) => `
          <tr>
            <td class="item-name">${item.name}</td>
            <td class="quantity">${item.quantity.toLocaleString()}</td>
            <td class="unit-price">¥${item.unitPrice.toLocaleString()}</td>
            <td class="amount">¥${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
        ${Array(Math.max(10 - data.items.length, 0)).fill(0).map(() => `
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="summary">
      <table class="summary-table">
        <tr>
          <td class="label">小計</td>
          <td class="value">¥${data.subtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">消費税（10%）</td>
          <td class="value">¥${data.tax.toLocaleString()}</td>
        </tr>
        <tr class="total">
          <td class="label">合計金額</td>
          <td class="value">¥${data.total.toLocaleString()}</td>
        </tr>
      </table>
    </div>
    
    ${data.notes || data.paymentTerms || data.bankInfo ? `
      <div class="notes-section">
        ${data.paymentTerms ? `
          <div>
            <div class="notes-title">お支払条件</div>
            <div>${data.paymentTerms}</div>
          </div>
        ` : ''}
        ${data.bankInfo && data.documentType === 'invoice' ? `
          <div style="margin-top: 15px;">
            <div class="notes-title">お振込先</div>
            <div style="margin-top: 10px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px;">
              <div>銀行名: ${data.bankInfo.bankName} ${data.bankInfo.branchName}</div>
              <div>口座種別: ${data.bankInfo.accountType}</div>
              <div>口座番号: ${data.bankInfo.accountNumber}</div>
              <div>口座名義: ${data.bankInfo.accountHolder}</div>
            </div>
          </div>
        ` : ''}
        ${data.deliveryInfo && data.documentType === 'delivery_note' ? `
          <div style="margin-top: 15px;">
            <div class="notes-title">納品情報</div>
            <div>納品日: ${data.deliveryInfo.deliveryDate}</div>
            <div>納品場所: ${data.deliveryInfo.deliveryLocation}</div>
          </div>
        ` : ''}
        ${data.notes ? `
          <div style="margin-top: 15px;">
            <div class="notes-title">備考</div>
            <div>${data.notes}</div>
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    ${data.documentType === 'receipt' ? `
      <div class="stamp-area">
        <div class="stamp-box">収入印紙</div>
      </div>
    ` : ''}
    
    <div class="footer">
      <p>この${typeLabels[data.documentType]}に関するお問い合わせは、上記連絡先までお願いいたします。</p>
    </div>
  </div>
</body>
</html>
  `;
}