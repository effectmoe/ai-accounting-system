"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateServerSidePDF = generateServerSidePDF;
// 日本語対応のPDF生成（pdfkitベース）
async function generateServerSidePDF(data) {
    console.log('PDF generation started for document:', data.documentNumber);
    try {
        const PDFDocument = await Promise.resolve().then(() => __importStar(require('pdfkit')));
        console.log('PDFDocument imported successfully');
        return new Promise((resolve, reject) => {
            try {
                console.log('Creating PDF document...');
                // Vercelのサーバーレス環境向けの設定
                const doc = new (PDFDocument.default)({
                    size: 'A4',
                    margin: 40,
                    info: {
                        Title: data.documentNumber,
                        Author: data.companyInfo?.name || '',
                        Subject: data.documentType === 'quote' ? '見積書' : '請求書',
                        Creator: 'AI会計システム',
                    }
                });
                const chunks = [];
                doc.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                doc.on('end', () => {
                    console.log('PDF generation completed, chunks:', chunks.length);
                    const pdfBuffer = Buffer.concat(chunks);
                    const base64 = pdfBuffer.toString('base64');
                    console.log('PDF base64 length:', base64.length);
                    resolve(base64);
                });
                doc.on('error', (error) => {
                    console.error('PDF generation error:', error);
                    reject(error);
                });
                // 日本語対応のPDF生成
                console.log('Starting PDF content generation...');
                try {
                    doc.fontSize(24)
                        .text(data.documentType === 'quote' ? '見積書' : '請求書', { align: 'center' });
                    console.log('Title added successfully');
                }
                catch (error) {
                    console.error('Error adding title:', error);
                    throw error;
                }
                doc.moveDown()
                    .fontSize(12)
                    .text(data.documentNumber, { align: 'center' });
                doc.moveDown(2)
                    .fontSize(14)
                    .text(`${data.customerName} 様`);
                doc.moveDown()
                    .fontSize(18)
                    .fillColor('#0066cc')
                    .text(`${data.documentType === 'quote' ? '見積' : '請求'}金額合計: ¥${(data.total || 0).toLocaleString()}`, { align: 'right' });
                doc.fillColor('black')
                    .moveDown()
                    .fontSize(10)
                    .text('明細:');
                (data.items || []).forEach((item, index) => {
                    doc.text(`${index + 1}. ${item.description || ''} - 数量: ${item.quantity} - 金額: ¥${(item.amount || 0).toLocaleString()}`);
                });
                doc.moveDown()
                    .fontSize(10)
                    .text(`小計: ¥${(data.subtotal || 0).toLocaleString()}`, { align: 'right' })
                    .text(`消費税: ¥${(data.tax || 0).toLocaleString()}`, { align: 'right' })
                    .fontSize(12)
                    .text(`合計: ¥${(data.total || 0).toLocaleString()}`, { align: 'right' });
                if (data.notes) {
                    doc.moveDown()
                        .fontSize(10)
                        .text('備考:')
                        .text(data.notes);
                }
                if (data.documentType === 'invoice' && data.bankAccount) {
                    doc.moveDown()
                        .fontSize(10)
                        .text('振込先:')
                        .text(`${data.bankAccount.bankName} ${data.bankAccount.branchName}`)
                        .text(`${data.bankAccount.accountType} ${data.bankAccount.accountNumber}`)
                        .text(data.bankAccount.accountHolder);
                }
                console.log('Finalizing PDF document...');
                doc.end();
            }
            catch (error) {
                console.error('PDF creation error:', error);
                reject(error);
            }
        });
    }
    catch (error) {
        console.error('PDF generation outer error:', error);
        throw error;
    }
}
