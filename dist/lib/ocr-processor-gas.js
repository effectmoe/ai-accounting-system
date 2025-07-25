"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GASWebAppOCRProcessor = void 0;
const logger_1 = require("@/lib/logger");
class GASWebAppOCRProcessor {
    gasOcrUrl;
    constructor() {
        this.gasOcrUrl = process.env.GAS_OCR_URL || '';
        if (!this.gasOcrUrl) {
            throw new Error('GAS_OCR_URL環境変数が設定されていません');
        }
    }
    async processFile(fileBuffer, fileName = 'document.pdf') {
        try {
            // ファイルをBase64エンコード
            const base64File = fileBuffer.toString('base64');
            // GAS Web AppにPOSTリクエスト
            const response = await fetch(this.gasOcrUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    file: base64File,
                    fileName: fileName,
                }),
            });
            if (!response.ok) {
                throw new Error(`GAS OCR APIエラー: ${response.status} ${response.statusText}`);
            }
            let result;
            try {
                result = await response.json();
            }
            catch (jsonError) {
                // JSONパースに失敗した場合、レスポンスをテキストとして取得してエラーを詳しく記録
                const responseText = await response.text();
                logger_1.logger.error('GAS OCR Response (not JSON):', responseText.substring(0, 200));
                throw new Error(`GAS OCRがJSONを返しませんでした: ${responseText.substring(0, 100)}...`);
            }
            if (!result.success) {
                throw new Error(`OCR処理エラー: ${result.error}`);
            }
            // OCR結果から構造化データを抽出
            const structuredData = this.extractStructuredData(result.text);
            return {
                text: result.text,
                confidence: 0.95, // GAS OCRは信頼度を返さないため固定値
                ...structuredData,
            };
        }
        catch (error) {
            logger_1.logger.error('GAS OCR処理エラー:', error);
            throw new Error(`OCR処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async processReceiptImage(imageBuffer) {
        return this.processFile(imageBuffer, 'receipt.jpg');
    }
    async processPDF(pdfBuffer) {
        return this.processFile(pdfBuffer, 'document.pdf');
    }
    extractStructuredData(text) {
        const result = {
            items: []
        };
        // 駐車場領収書かどうかを判定
        const isParkingReceipt = this.isParkingReceipt(text);
        if (isParkingReceipt) {
            // 駐車場領収書専用の解析
            return this.parseParkingReceipt(text);
        }
        // テキストを行ごとに分割
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        // 店舗名の抽出（通常最初の数行に含まれる）
        if (lines.length > 0) {
            // 日付や時刻、金額を含まない最初の行を店舗名として扱う
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i];
                if (!this.isDateLine(line) && !this.isAmountLine(line) && !this.isTimeLine(line)) {
                    result.vendor = line;
                    break;
                }
            }
        }
        // 日付の抽出
        result.date = this.extractDate(text);
        // 合計金額の抽出
        const amounts = this.extractAmounts(text);
        if (amounts.total) {
            result.amount = amounts.total;
        }
        if (amounts.tax) {
            result.taxAmount = amounts.tax;
        }
        // 商品明細の抽出
        result.items = this.extractItems(lines);
        return result;
    }
    isDateLine(line) {
        return /\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}/.test(line) ||
            /\d{1,2}[月\/]\d{1,2}/.test(line);
    }
    isTimeLine(line) {
        return /\d{1,2}[:：]\d{2}/.test(line);
    }
    isAmountLine(line) {
        return /[¥￥]\s*[\d,]+/.test(line) || /[\d,]+\s*円/.test(line);
    }
    extractDate(text) {
        // 年月日形式
        const fullDateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
        if (fullDateMatch) {
            return `${fullDateMatch[1]}-${fullDateMatch[2].padStart(2, '0')}-${fullDateMatch[3].padStart(2, '0')}`;
        }
        // 月日形式（現在の年を使用）
        const monthDayMatch = text.match(/(\d{1,2})[月\/](\d{1,2})/);
        if (monthDayMatch) {
            const currentYear = new Date().getFullYear();
            return `${currentYear}-${monthDayMatch[1].padStart(2, '0')}-${monthDayMatch[2].padStart(2, '0')}`;
        }
        return undefined;
    }
    extractAmounts(text) {
        const amounts = {};
        // 合計金額のパターン
        const totalPatterns = [
            /合計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /total\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /お会計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
        ];
        for (const pattern of totalPatterns) {
            const match = text.match(pattern);
            if (match) {
                amounts.total = parseInt(match[1].replace(/,/g, ''));
                break;
            }
        }
        // 消費税のパターン
        const taxPatterns = [
            /(?:消費税|税)\s*(?:\(?\d+%\)?)?\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /内税\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /tax\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
        ];
        for (const pattern of taxPatterns) {
            const match = text.match(pattern);
            if (match) {
                amounts.tax = parseInt(match[1].replace(/,/g, ''));
                break;
            }
        }
        // 小計のパターン
        const subtotalPatterns = [
            /小計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
            /subtotal\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
        ];
        for (const pattern of subtotalPatterns) {
            const match = text.match(pattern);
            if (match) {
                amounts.subtotal = parseInt(match[1].replace(/,/g, ''));
                break;
            }
        }
        return amounts;
    }
    extractItems(lines) {
        const items = [];
        // 商品行のパターン（商品名と金額が同じ行にある場合）
        const itemPattern = /^(.+?)\s+[¥￥]?\s*([\d,]+)\s*円?$/;
        for (const line of lines) {
            const match = line.match(itemPattern);
            if (match) {
                const name = match[1].trim();
                const amount = parseInt(match[2].replace(/,/g, ''));
                // 合計や税などの行は除外
                if (!name.match(/合計|計|小計|税|total|subtotal|tax/i)) {
                    items.push({ name, amount });
                }
            }
        }
        return items;
    }
    async close() {
        // GAS Web Appは接続を保持しないため、何もしない
    }
    // 駐車場領収書かどうかを判定
    isParkingReceipt(text) {
        const parkingKeywords = [
            'タイムズ',
            'times',
            'TIMES',
            'パーキング',
            'parking',
            'PARKING',
            '駐車場',
            '入庫',
            '出庫',
            '駐車時間',
            '駐車料金',
            'パーク24',
            'タイムズ24株式会社'
        ];
        const lowerText = text.toLowerCase();
        return parkingKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }
    // 駐車場領収書専用の解析
    parseParkingReceipt(text) {
        const result = {
            receiptType: 'parking',
            items: []
        };
        const lines = text.split('\n').filter(line => line.trim());
        // 運営会社名と施設名の分離
        // タイムズ24株式会社が運営会社、駐車場名が施設名
        const timesPattern = /タイムズ24株式会社|times\s*24|パーク24/i;
        const timesMatch = text.match(timesPattern);
        if (timesMatch) {
            result.companyName = 'タイムズ24株式会社';
        }
        // 施設名（駐車場名）の抽出
        for (const line of lines) {
            if (line.includes('タイムズ') && !line.includes('タイムズ24株式会社')) {
                result.facilityName = line.trim();
                result.vendor = line.trim(); // 互換性のため
                break;
            }
        }
        // 日付の抽出
        result.date = this.extractDate(text);
        // 入庫・出庫時刻の抽出
        const entryPattern = /入庫[:：]?\s*(\d{1,2}[:：]\d{2})/;
        const exitPattern = /出庫[:：]?\s*(\d{1,2}[:：]\d{2})/;
        const entryMatch = text.match(entryPattern);
        if (entryMatch) {
            result.entryTime = entryMatch[1];
        }
        const exitMatch = text.match(exitPattern);
        if (exitMatch) {
            result.exitTime = exitMatch[1];
        }
        // 駐車時間の抽出
        const durationPattern = /駐車時間[:：]?\s*(\d+時間\d+分|\d+分)/;
        const durationMatch = text.match(durationPattern);
        if (durationMatch) {
            result.parkingDuration = durationMatch[1];
        }
        // 料金の抽出
        const amounts = this.extractAmounts(text);
        result.amount = amounts.total || 0;
        result.taxAmount = 0; // 駐車場は通常内税
        // アイテムとして駐車料金を追加
        if (result.amount) {
            result.items = [{
                    name: `駐車料金（${result.facilityName || '駐車場'}）`,
                    amount: result.amount
                }];
        }
        return result;
    }
}
exports.GASWebAppOCRProcessor = GASWebAppOCRProcessor;
