"use strict";
// date-fnsの個別インポートを使用した日付ヘルパー関数
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateFormats = void 0;
exports.formatDate = formatDate;
exports.getMonthRange = getMonthRange;
exports.addBusinessDays = addBusinessDays;
exports.isOverdue = isOverdue;
exports.isValidDate = isValidDate;
const date_fns_1 = require("date-fns");
const date_fns_2 = require("date-fns");
const date_fns_3 = require("date-fns");
const date_fns_4 = require("date-fns");
const date_fns_5 = require("date-fns");
const date_fns_6 = require("date-fns");
const date_fns_7 = require("date-fns");
const locale_1 = require("date-fns/locale");
// 日付フォーマット関数
function formatDate(date, formatStr = 'yyyy年MM月dd日') {
    const dateObj = typeof date === 'string' ? (0, date_fns_2.parseISO)(date) : date;
    if (!(0, date_fns_7.isValid)(dateObj))
        return '無効な日付';
    return (0, date_fns_1.format)(dateObj, formatStr, { locale: locale_1.ja });
}
// 日付範囲ヘルパー
function getMonthRange(date = new Date()) {
    return {
        start: (0, date_fns_3.startOfMonth)(date),
        end: (0, date_fns_4.endOfMonth)(date)
    };
}
// 日付計算ヘルパー
function addBusinessDays(date, days) {
    let result = date;
    let daysToAdd = Math.abs(days);
    const direction = days > 0 ? 1 : -1;
    while (daysToAdd > 0) {
        result = (0, date_fns_5.addDays)(result, direction);
        const dayOfWeek = result.getDay();
        // 土日をスキップ
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysToAdd--;
        }
    }
    return result;
}
// 期限チェック
function isOverdue(dueDate) {
    const due = typeof dueDate === 'string' ? (0, date_fns_2.parseISO)(dueDate) : dueDate;
    return (0, date_fns_6.differenceInDays)(new Date(), due) > 0;
}
// 日付の妥当性チェック
function isValidDate(date) {
    if (!date)
        return false;
    const dateObj = typeof date === 'string' ? (0, date_fns_2.parseISO)(date) : date;
    return (0, date_fns_7.isValid)(dateObj);
}
// よく使う日付フォーマット
exports.dateFormats = {
    japanese: 'yyyy年MM月dd日',
    japaneseShort: 'M月d日',
    iso: 'yyyy-MM-dd',
    datetime: 'yyyy-MM-dd HH:mm:ss',
    time: 'HH:mm',
    yearMonth: 'yyyy年MM月',
};
// デフォルトのエクスポート（必要に応じて削除可能）
exports.default = {
    formatDate,
    getMonthRange,
    addBusinessDays,
    isOverdue,
    isValidDate,
    dateFormats: exports.dateFormats,
};
