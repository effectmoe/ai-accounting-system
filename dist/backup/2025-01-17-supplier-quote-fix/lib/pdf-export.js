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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePDFBlob = generatePDFBlob;
exports.downloadPDF = downloadPDF;
exports.generatePDFBase64 = generatePDFBase64;
exports.getPDFSize = getPDFSize;
exports.generatePDFPreviewURL = generatePDFPreviewURL;
const renderer_1 = require("@react-pdf/renderer");
const react_1 = __importDefault(require("react"));
const pdf_generator_1 = require("./pdf-generator");
async function generatePDFBlob(data) {
    const pdfDocument = react_1.default.createElement(pdf_generator_1.DocumentPDF, { data });
    const blob = await (0, renderer_1.pdf)(pdfDocument).toBlob();
    return blob;
}
async function downloadPDF(data) {
    try {
        const blob = await generatePDFBlob(data);
        // BlobをダウンロードするためのURLを作成
        const url = URL.createObjectURL(blob);
        // ダウンロードリンクを作成
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.documentNumber}.pdf`;
        // リンクをクリックしてダウンロードを開始
        document.body.appendChild(a);
        a.click();
        // クリーンアップ
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    catch (error) {
        console.error('PDF生成エラー:', error);
        throw new Error('PDFの生成に失敗しました');
    }
}
// Base64エンコードされたPDFを生成（メール送信などに使用）
async function generatePDFBase64(data) {
    console.log('generatePDFBase64 called, window check:', typeof window === 'undefined');
    // サーバーサイドで実行される場合
    if (typeof window === 'undefined') {
        console.log('Running on server side, attempting PDF generation...');
        // jsPDFを使用したサーバーサイドPDF生成
        const { generateJsPDFDocument } = await Promise.resolve().then(() => __importStar(require('./jspdf-server-generator')));
        return await generateJsPDFDocument(data);
    }
    // クライアントサイドで実行される場合
    const blob = await generatePDFBlob(data);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            // data:application/pdf;base64, を削除して純粋なBase64文字列を返す
            const base64 = base64String.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
// PDFのサイズを取得（バイト単位）
async function getPDFSize(data) {
    const blob = await generatePDFBlob(data);
    return blob.size;
}
// PDFのプレビューURL（一時的なURL）を生成
async function generatePDFPreviewURL(data) {
    const blob = await generatePDFBlob(data);
    return URL.createObjectURL(blob);
}
