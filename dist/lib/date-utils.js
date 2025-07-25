"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeCreateDate = exports.isValidDate = exports.safeFormatDate = void 0;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const logger_1 = require("@/lib/logger");
/**
 * 安全な日付フォーマット関数
 * 無効な日付値が渡された場合は '-' を返す
 */
const safeFormatDate = (dateValue, formatString = 'yyyy/MM/dd') => {
    if (!dateValue)
        return '-';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) {
        return '-';
    }
    try {
        return (0, date_fns_1.format)(date, formatString, { locale: locale_1.ja });
    }
    catch (error) {
        logger_1.logger.warn('Date formatting error:', error, 'for value:', dateValue);
        return '-';
    }
};
exports.safeFormatDate = safeFormatDate;
/**
 * 日付値が有効かどうかを判定
 */
const isValidDate = (dateValue) => {
    if (!dateValue)
        return false;
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
/**
 * 安全にDateオブジェクトを作成
 */
const safeCreateDate = (dateValue) => {
    if (!dateValue)
        return null;
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
};
exports.safeCreateDate = safeCreateDate;
