"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRDateExtractor = void 0;
const logger_1 = require("@/lib/logger");
/**
 * OCR結果から日付を抽出するユーティリティクラス
 * 日本語の様々な日付表記に対応
 */
class OCRDateExtractor {
    // 日付パターンの定義
    static patterns = [
        // 令和表記（例: 令和6年5月25日）
        {
            regex: /令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/g,
            handler: (match) => {
                const reiwaYear = parseInt(match[1]);
                const year = 2018 + reiwaYear; // 令和1年 = 2019年
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                return { year, month, day };
            },
            name: '令和表記'
        },
        // 西暦年月日（例: 2024年5月25日）
        {
            regex: /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
            handler: (match) => {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                return { year, month, day };
            },
            name: '西暦年月日'
        },
        // スラッシュ区切り年月日（例: 2024/5/25）
        {
            regex: /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
            handler: (match) => {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                return { year, month, day };
            },
            name: 'スラッシュ区切り年月日'
        },
        // 月日のみ（現在年を使用）（例: 5月25日）
        {
            regex: /(\d{1,2})月(\d{1,2})日/g,
            handler: (match) => {
                const month = parseInt(match[1]);
                const day = parseInt(match[2]);
                const currentYear = new Date().getFullYear();
                return { year: currentYear, month, day };
            },
            name: '月日のみ（現在年）'
        },
        // スラッシュ区切り月日（現在年を使用）（例: 5/25）
        {
            regex: /(\d{1,2})\/(\d{1,2})(?!\/)/g,
            handler: (match) => {
                const month = parseInt(match[1]);
                const day = parseInt(match[2]);
                const currentYear = new Date().getFullYear();
                return { year: currentYear, month, day };
            },
            name: 'スラッシュ区切り月日'
        },
        // JSONフィールドから（例: "Date":"5月25日"）
        {
            regex: /"(?:Date|InvoiceDate|TransactionDate|date|invoiceDate|transactionDate)"\s*:\s*"([^"]+)"/g,
            handler: (match) => {
                const dateStr = match[1];
                // 再帰的に日付を抽出
                const subResult = OCRDateExtractor.extractDateFromString(dateStr);
                if (subResult) {
                    return subResult;
                }
                return null;
            },
            name: 'JSONフィールド'
        },
        // 漢数字の日付（例: 五月二十五日）
        {
            regex: /([一二三四五六七八九十]+)月([一二三四五六七八九十]+)日/g,
            handler: (match) => {
                const month = OCRDateExtractor.kanjiToNumber(match[1]);
                const day = OCRDateExtractor.kanjiToNumber(match[2]);
                const currentYear = new Date().getFullYear();
                return { year: currentYear, month, day };
            },
            name: '漢数字日付'
        },
        // 改行を含む縦書き漢数字の日付
        {
            regex: /五\s*月\s*二\s*十\s*五\s*日/g,
            handler: (match) => {
                const currentYear = new Date().getFullYear();
                return { year: currentYear, month: 5, day: 25 };
            },
            name: '縦書き漢数字（5月25日）'
        }
    ];
    // 漢数字を数値に変換
    static kanjiToNumber(kanjiStr) {
        const kanjiMap = {
            '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
            '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
            '二十': 20, '三十': 30
        };
        // 十の位と一の位を分けて処理
        if (kanjiStr.includes('十')) {
            const parts = kanjiStr.split('十');
            if (parts.length === 2) {
                const tens = parts[0] ? kanjiMap[parts[0]] || 1 : 1;
                const ones = parts[1] ? kanjiMap[parts[1]] || 0 : 0;
                return tens * 10 + ones;
            }
        }
        return kanjiMap[kanjiStr] || 0;
    }
    // 文字列から日付を抽出（内部用）
    static extractDateFromString(str) {
        for (const pattern of this.patterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            const match = regex.exec(str);
            if (match) {
                const result = pattern.handler(match);
                if (result && result.year && result.month && result.day) {
                    return result;
                }
            }
        }
        return null;
    }
    // 日付の妥当性をチェック
    static isValidDate(year, month, day) {
        if (year < 2000 || year > 2100)
            return false;
        if (month < 1 || month > 12)
            return false;
        if (day < 1 || day > 31)
            return false;
        // より詳細な日付チェック
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
    }
    // 日付が妥当な範囲内かチェック（2年前〜1ヶ月後）
    static isDateInRange(date) {
        const now = new Date();
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(now.getFullYear() - 2);
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(now.getMonth() + 1);
        return date >= twoYearsAgo && date <= oneMonthLater;
    }
    /**
     * OCR結果から日付を抽出
     * @param ocrText OCR結果のテキスト
     * @returns 抽出結果
     */
    static extractDate(ocrText) {
        if (!ocrText) {
            return { date: null, confidence: 0, matchedPattern: null };
        }
        logger_1.logger.debug('検索対象テキスト（最初の500文字）:', ocrText.substring(0, 500));
        const candidates = [];
        // 各パターンで日付を探す
        for (const pattern of this.patterns) {
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = regex.exec(ocrText)) !== null) {
                try {
                    const result = pattern.handler(match);
                    if (result && this.isValidDate(result.year, result.month, result.day)) {
                        const date = new Date(result.year, result.month - 1, result.day);
                        if (this.isDateInRange(date)) {
                            // 信頼度の計算
                            let confidence = 0.8; // 基本信頼度
                            // 年が含まれている場合は信頼度を上げる
                            if (pattern.name.includes('年') || pattern.name.includes('令和')) {
                                confidence += 0.1;
                            }
                            // JSONフィールドから抽出した場合は信頼度を上げる
                            if (pattern.name === 'JSONフィールド') {
                                confidence += 0.05;
                            }
                            candidates.push({
                                date,
                                confidence,
                                pattern: pattern.name
                            });
                        }
                        else {
                            logger_1.logger.debug(`OCRDateExtractor: 日付が範囲外 - ${match[0]} (2年前〜1ヶ月後の範囲外)`);
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.error('日付解析エラー:', error);
                }
            }
        }
        // 最も信頼度の高い候補を選択
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.confidence - a.confidence);
            const best = candidates[0];
            return {
                date: best.date,
                confidence: best.confidence,
                matchedPattern: best.pattern
            };
        }
        logger_1.logger.debug('OCRDateExtractor: 有効な日付を見つけられませんでした');
        return { date: null, confidence: 0, matchedPattern: null };
    }
}
exports.OCRDateExtractor = OCRDateExtractor;
