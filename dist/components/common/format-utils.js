"use strict";
// 共通フォーマット関数
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateShort = formatDateShort;
exports.formatAmount = formatAmount;
exports.formatCurrency = formatCurrency;
exports.formatPercentage = formatPercentage;
exports.formatPhoneNumber = formatPhoneNumber;
exports.formatPostalCode = formatPostalCode;
/**
 * 日付をフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列（YYYY年MM月DD日）
 */
function formatDate(date) {
    if (!date)
        return '-';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return '-';
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(d);
    }
    catch {
        return '-';
    }
}
/**
 * 日付を短い形式でフォーマット
 * @param date 日付文字列またはDateオブジェクト
 * @returns フォーマットされた日付文字列（YYYY/MM/DD）
 */
function formatDateShort(date) {
    if (!date)
        return '-';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime()))
            return '-';
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    }
    catch {
        return '-';
    }
}
/**
 * 金額をフォーマット（通貨記号なし）
 * @param amount 金額
 * @returns フォーマットされた金額文字列
 */
function formatAmount(amount) {
    if (amount == null)
        return '0';
    return new Intl.NumberFormat('ja-JP').format(amount);
}
/**
 * 金額を通貨記号付きでフォーマット
 * @param amount 金額
 * @param currency 通貨コード（デフォルト: 'JPY'）
 * @returns フォーマットされた金額文字列（¥1,234）
 */
function formatCurrency(amount, currency = 'JPY') {
    if (amount == null)
        return '¥0';
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: currency
    }).format(amount);
}
/**
 * パーセンテージをフォーマット
 * @param value 値（0-1の範囲または0-100の範囲）
 * @param isDecimal trueの場合は0-1の範囲、falseの場合は0-100の範囲
 * @returns フォーマットされたパーセンテージ文字列
 */
function formatPercentage(value, isDecimal = true) {
    if (value == null)
        return '0%';
    const percentage = isDecimal ? value * 100 : value;
    return `${Math.round(percentage)}%`;
}
/**
 * 電話番号をフォーマット
 * @param phoneNumber 電話番号
 * @returns フォーマットされた電話番号
 */
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber)
        return '-';
    // 数字以外を除去
    const digits = phoneNumber.replace(/\D/g, '');
    // 日本の電話番号形式に変換
    if (digits.length === 10) {
        // 市外局番が2桁の場合（例：03-1234-5678）
        if (digits.startsWith('03') || digits.startsWith('06')) {
            return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
        }
        // 市外局番が3桁の場合（例：090-1234-5678）
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    else if (digits.length === 11) {
        // 携帯電話番号（例：090-1234-5678）
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    return phoneNumber;
}
/**
 * 郵便番号をフォーマット
 * @param postalCode 郵便番号
 * @returns フォーマットされた郵便番号（〒123-4567）
 */
function formatPostalCode(postalCode) {
    if (!postalCode)
        return '-';
    // 数字以外を除去
    const digits = postalCode.replace(/\D/g, '');
    if (digits.length === 7) {
        return `〒${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return postalCode;
}
