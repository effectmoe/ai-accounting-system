"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDFWithAPI = generateInvoicePDFWithAPI;
const pdf_html_generator_1 = require("./pdf-html-generator");
// 外部API（例：Browserless.io）を使用したPDF生成
async function generateInvoicePDFWithAPI(invoice, companyInfo) {
    const htmlContent = (0, pdf_html_generator_1.generateInvoiceHTML)(invoice, companyInfo);
    // Browserless.ioのAPIを使用する例
    const response = await fetch('https://chrome.browserless.io/pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
            html: htmlContent,
            options: {
                displayHeaderFooter: false,
                printBackground: true,
                format: 'A4',
                margin: {
                    top: '20mm',
                    right: '20mm',
                    bottom: '20mm',
                    left: '20mm'
                }
            }
        })
    });
    if (!response.ok) {
        throw new Error('PDF generation failed');
    }
    const pdfBuffer = await response.arrayBuffer();
    return Buffer.from(pdfBuffer);
}
