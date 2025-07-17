import { DocumentData } from './document-generator';

// UTF-8文字列を適切にエンコードする関数
function encodeText(text: string): string {
  // 基本的なASCII文字のみを使用し、日本語は英語表記にする
  return text
    .replace(/[^\x00-\x7F]/g, '') // 非ASCII文字を削除
    .trim();
}

// 日本語PDF生成（Vercel環境対応 - 軽量HTML版）
export async function generateSimplePDF(data: DocumentData): Promise<string> {
  console.log('=== VERCEL HTML PDF GENERATION START ===');
  console.log('Document:', data.documentNumber);
  console.log('Customer name:', data.customerName);
  console.log('Company info:', data.companyInfo);
  
  try {
    // HTML文字列からPDFを生成する方法（軽量）
    const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; font-size: 24px; margin-bottom: 20px; }
        .doc-number { text-align: center; font-size: 14px; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .customer-info { float: left; width: 40%; }
        .company-info { float: right; width: 40%; }
        .clear { clear: both; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .total-section { margin-top: 20px; text-align: right; }
        .notes { margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">${data.documentType === 'quote' ? '見積書' : '請求書'}</div>
    <div class="doc-number">${data.documentNumber}</div>
    <div class="doc-number">発行日: ${data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : 'N/A'}</div>
    
    <div class="section">
        <div class="customer-info">
            <strong>お客様:</strong><br>
            ${data.customerName || 'Customer'}<br>
            ${data.customerAddress || ''}
        </div>
        <div class="company-info">
            <strong>会社:</strong><br>
            ${data.companyInfo?.name || 'Company'}<br>
            ${data.companyInfo?.address || ''}
        </div>
        <div class="clear"></div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>項目</th>
                <th>数量</th>
                <th>単価</th>
                <th>金額</th>
            </tr>
        </thead>
        <tbody>
            ${(data.items || []).map((item, index) => `
                <tr>
                    <td>${item.description || `Item ${index + 1}`}</td>
                    <td>${item.quantity || 1}</td>
                    <td>¥${(item.unitPrice || 0).toLocaleString()}</td>
                    <td>¥${(item.amount || 0).toLocaleString()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total-section">
        <div>小計: ¥${(data.subtotal || 0).toLocaleString()}</div>
        <div>税金: ¥${(data.tax || 0).toLocaleString()}</div>
        <div><strong>合計: ¥${(data.total || 0).toLocaleString()}</strong></div>
    </div>
    
    ${data.notes ? `<div class="notes"><strong>備考:</strong><br>${data.notes}</div>` : ''}
    
    ${data.documentType === 'invoice' && data.dueDate ? `
        <div class="section">
            <strong>支払期限:</strong> ${new Date(data.dueDate).toLocaleDateString('ja-JP')}
        </div>
    ` : ''}
    
    ${data.documentType === 'invoice' && data.bankAccount ? `
        <div class="section">
            <strong>支払情報:</strong><br>
            銀行: ${data.bankAccount.bankName}<br>
            支店: ${data.bankAccount.branchName}<br>
            口座: ${data.bankAccount.accountType} ${data.bankAccount.accountNumber}<br>
            名義: ${data.bankAccount.accountHolder}
        </div>
    ` : ''}
</body>
</html>
    `;

    // HTMLからBase64 PDFを生成（簡易実装）
    console.log('Generated HTML content, converting to PDF...');
    
    // 詳細なPDFコンテンツを作成
    const itemsText = (data.items || []).map((item, index) => 
      `(${index + 1}. ${item.description || 'Item'} - Qty: ${item.quantity || 1} - Price: ¥${(item.unitPrice || 0).toLocaleString()} - Total: ¥${(item.amount || 0).toLocaleString()})`
    ).join('\n');
    
    // 安全にテキストをエンコード
    const safeCustomerName = encodeText(data.customerName || 'Customer');
    const safeCompanyName = encodeText(data.companyInfo?.name || 'Company');
    const safeCompanyAddress = encodeText(data.companyInfo?.address || '');
    const safeCustomerAddress = encodeText(data.customerAddress || '');
    const safeNotes = encodeText(data.notes || '');
    
    const pdfContent = `BT
/F1 16 Tf
50 750 Td
(${data.documentType === 'quote' ? 'MITSUMORI-SHO' : 'SEIKYU-SHO'}) Tj
0 -30 Td
/F1 12 Tf
(${data.documentNumber}) Tj
0 -20 Td
(Hakko-bi: ${data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : 'N/A'}) Tj
0 -30 Td
(Otokusaki: ${safeCustomerName}) Tj
${safeCustomerAddress ? `0 -15 Td\n(${safeCustomerAddress}) Tj` : ''}
0 -30 Td
(Kaisha: ${safeCompanyName}) Tj
${safeCompanyAddress ? `0 -15 Td\n(${safeCompanyAddress}) Tj` : ''}
0 -30 Td
(--- Koumoku ---) Tj
0 -20 Td
${(data.items || []).map((item, index) => {
  const safeDescription = encodeText(item.description || 'Item');
  return `(${index + 1}. ${safeDescription} - Suryo: ${item.quantity || 1} - Tanka: ${(item.unitPrice || 0).toLocaleString()} yen - Kingaku: ${(item.amount || 0).toLocaleString()} yen) Tj\n0 -15 Td`;
}).join('\n')}
0 -20 Td
(--- Gokei ---) Tj
0 -15 Td
(Shokei: ${(data.subtotal || 0).toLocaleString()} yen) Tj
0 -15 Td
(Zeikin: ${(data.tax || 0).toLocaleString()} yen) Tj
0 -15 Td
(Gokei: ${(data.total || 0).toLocaleString()} yen) Tj
${safeNotes ? `0 -30 Td\n(Biko: ${safeNotes}) Tj` : ''}
${data.documentType === 'invoice' && data.dueDate ? `0 -20 Td\n(Shiharai Kigen: ${new Date(data.dueDate).toLocaleDateString('ja-JP')}) Tj` : ''}
ET`;

    const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${pdfContent.length}
>>
stream
${pdfContent}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000254 00000 n 
0000000500 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
597
%%EOF`;

    const base64PDF = Buffer.from(pdfHeader).toString('base64');
    console.log('PDF generated successfully, base64 length:', base64PDF.length);
    
    return base64PDF;
  } catch (error) {
    console.error('Vercel PDF generation error:', error);
    throw error;
  }
}