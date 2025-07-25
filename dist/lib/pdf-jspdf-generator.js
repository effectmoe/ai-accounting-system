"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDF = generateInvoicePDF;
exports.generateInvoiceFilename = generateInvoiceFilename;
exports.generateSafeFilename = generateSafeFilename;
const jspdf_1 = __importDefault(require("jspdf"));
// 日本語フォントのBase64データ（NotoSansJP-Regular）
// 実際のプロダクションでは、外部ファイルから読み込むか、CDNから取得することを推奨
const JAPANESE_FONT_URL = 'https://fonts.gstatic.com/ea/notosansjp/v5/NotoSansJP-Regular.otf';
async function generateInvoicePDF(invoice, companyInfo) {
    const doc = new jspdf_1.default({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    // 日本語フォントの設定を回避し、代わりに英語で表記
    // または、Canvas APIを使用してHTMLをPDFに変換
    const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
    const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toISOString().split('T')[0];
    const dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
    const subtotal = invoice.subtotal || 0;
    const taxAmount = invoice.taxAmount || 0;
    const totalAmount = invoice.totalAmount || 0;
    // PDFのコンテンツを英語で作成（日本語フォントの問題を回避）
    let y = 20;
    // タイトル
    doc.setFontSize(24);
    doc.text('INVOICE', 105, y, { align: 'center' });
    y += 15;
    // 請求書番号
    doc.setFontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 105, y, { align: 'center' });
    y += 20;
    // 顧客情報
    doc.setFontSize(10);
    doc.text('Bill To:', 20, y);
    y += 7;
    doc.setFontSize(14);
    doc.text(customerName, 20, y);
    y += 7;
    if (invoice.customer?.address) {
        doc.setFontSize(10);
        doc.text(invoice.customer.address, 20, y);
        y += 5;
    }
    if (invoice.customer?.phone) {
        doc.text(`TEL: ${invoice.customer.phone}`, 20, y);
        y += 5;
    }
    // 会社情報（右側）
    let rightY = 50;
    doc.setFontSize(10);
    doc.text(`Issue Date: ${issueDate}`, 190, rightY, { align: 'right' });
    rightY += 5;
    doc.text(`Due Date: ${dueDate}`, 190, rightY, { align: 'right' });
    rightY += 10;
    if (companyInfo) {
        doc.setFontSize(12);
        doc.text(companyInfo.companyName || '', 190, rightY, { align: 'right' });
        rightY += 5;
        doc.setFontSize(10);
        if (companyInfo.address) {
            doc.text(companyInfo.address, 190, rightY, { align: 'right' });
            rightY += 5;
        }
        if (companyInfo.phone) {
            doc.text(`TEL: ${companyInfo.phone}`, 190, rightY, { align: 'right' });
            rightY += 5;
        }
        if (companyInfo.email) {
            doc.text(companyInfo.email, 190, rightY, { align: 'right' });
        }
    }
    y = Math.max(y + 10, rightY + 10);
    // 合計金額
    doc.setFillColor(230, 242, 255);
    doc.rect(20, y, 170, 15, 'F');
    doc.setFontSize(12);
    doc.text('Total Amount (Tax included)', 25, y + 10);
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.text(`JPY ${totalAmount.toLocaleString()}`, 185, y + 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 25;
    // 明細テーブル
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount'];
    const colWidths = [100, 20, 35, 35];
    let tableX = 20;
    // ヘッダー
    doc.setFillColor(52, 73, 94);
    doc.rect(tableX, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    let headerX = tableX;
    tableHeaders.forEach((header, index) => {
        doc.text(header, headerX + 2, y + 6);
        headerX += colWidths[index];
    });
    doc.setTextColor(0, 0, 0);
    y += 8;
    // 明細行
    invoice.items.forEach((item) => {
        let itemX = tableX;
        // 罫線
        doc.setDrawColor(221, 221, 221);
        doc.line(tableX, y + 8, tableX + 170, y + 8);
        // 内容
        doc.text(item.description || item.itemName || '', itemX + 2, y + 6);
        itemX += colWidths[0];
        doc.text(item.quantity.toString(), itemX + colWidths[1] - 2, y + 6, { align: 'right' });
        itemX += colWidths[1];
        doc.text(`JPY ${(item.unitPrice || 0).toLocaleString()}`, itemX + colWidths[2] - 2, y + 6, { align: 'right' });
        itemX += colWidths[2];
        doc.text(`JPY ${(item.amount || 0).toLocaleString()}`, itemX + colWidths[3] - 2, y + 6, { align: 'right' });
        y += 10;
    });
    y += 10;
    // 合計
    const summaryX = 120;
    doc.setFontSize(10);
    doc.text('Subtotal:', summaryX, y);
    doc.text(`JPY ${subtotal.toLocaleString()}`, 185, y, { align: 'right' });
    y += 6;
    doc.text('Tax (10%):', summaryX, y);
    doc.text(`JPY ${taxAmount.toLocaleString()}`, 185, y, { align: 'right' });
    y += 6;
    doc.setDrawColor(51, 51, 51);
    doc.line(summaryX, y, 190, y);
    y += 6;
    doc.setFontSize(12);
    doc.text('Total:', summaryX, y);
    doc.text(`JPY ${totalAmount.toLocaleString()}`, 185, y, { align: 'right' });
    // 備考
    if (invoice.notes) {
        y += 20;
        doc.setFontSize(10);
        doc.text('Notes:', 20, y);
        y += 6;
        // 備考は英語で表示するか、ASCIIのみの部分を表示
        const asciiNotes = invoice.notes.replace(/[^\x00-\x7F]/g, '?');
        const lines = doc.splitTextToSize(asciiNotes, 170);
        lines.forEach((line) => {
            doc.text(line, 20, y);
            y += 5;
        });
    }
    // PDFを生成
    const pdfData = doc.output('arraybuffer');
    return Buffer.from(pdfData);
}
// Generate filename with new naming convention: 請求日_帳表名_顧客名
function generateInvoiceFilename(invoice) {
    const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
    const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
    const customerName = invoice.customer?.companyName ||
        invoice.customer?.name ||
        invoice.customerSnapshot?.companyName ||
        '顧客名未設定';
    // 日本語の顧客名を維持（ファイル名に使えない文字のみ置換）
    const cleanCustomerName = customerName
        .replace(/[<>:"\/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 20); // 長さ制限
    return `${dateStr}_請求書_${cleanCustomerName}.pdf`;
}
// Generate filename with ASCII-safe format (for Content-Disposition header)
function generateSafeFilename(invoice) {
    const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
    const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
    const customerName = invoice.customer?.companyName ||
        invoice.customer?.name ||
        invoice.customerSnapshot?.companyName ||
        'Customer';
    // Clean customer name for filename (remove invalid characters)
    const cleanCustomerName = customerName
        .replace(/[<>:"\/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/[^\x00-\x7F]/g, '_') // Remove any non-ASCII
        .substring(0, 20); // Limit length
    return `${dateStr}_Invoice_${cleanCustomerName}.pdf`;
}
