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
exports.generateInvoicePDFWithPuppeteer = generateInvoicePDFWithPuppeteer;
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const pdf_html_generator_1 = require("./pdf-html-generator");
// Vercel環境用の設定
chromium_1.default.setHeadlessMode = true;
chromium_1.default.setGraphicsMode = false;
async function generateInvoicePDFWithPuppeteer(invoice, companyInfo) {
    let browser = null;
    try {
        // 開発環境とVercel環境で異なる設定
        if (process.env.NODE_ENV === 'development') {
            // ローカル開発環境
            const puppeteerLocal = await Promise.resolve().then(() => __importStar(require('puppeteer')));
            browser = await puppeteerLocal.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        else {
            // Vercel環境
            browser = await puppeteer_core_1.default.launch({
                args: chromium_1.default.args,
                defaultViewport: chromium_1.default.defaultViewport,
                executablePath: await chromium_1.default.executablePath(),
                headless: chromium_1.default.headless,
            });
        }
        const page = await browser.newPage();
        // HTMLコンテンツを生成
        const htmlContent = (0, pdf_html_generator_1.generateInvoiceHTML)(invoice, companyInfo);
        // HTMLを設定
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });
        // PDFを生成（日本語も正しく表示される）
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });
        return Buffer.from(pdfBuffer);
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
