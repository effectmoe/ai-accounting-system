"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObjectId = isObjectId;
exports.isObjectIdString = isObjectIdString;
exports.isValidObjectId = isValidObjectId;
exports.isValidDate = isValidDate;
exports.isISODateString = isISODateString;
exports.isBaseDocument = isBaseDocument;
exports.isTimestampedDocument = isTimestampedDocument;
exports.isArray = isArray;
exports.isNullable = isNullable;
exports.createStringEnumGuard = createStringEnumGuard;
exports.isInRange = isInRange;
exports.isValidEmail = isValidEmail;
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.isValidPostalCode = isValidPostalCode;
exports.validateRequired = validateRequired;
exports.validateStringLength = validateStringLength;
exports.mergeValidationResults = mergeValidationResults;
exports.toObjectId = toObjectId;
exports.toDate = toDate;
exports.toNumber = toNumber;
exports.toBoolean = toBoolean;
const mongodb_1 = require("mongodb");
// ObjectId型ガード
function isObjectId(value) {
    return value instanceof mongodb_1.ObjectId;
}
// ObjectId文字列型ガード
function isObjectIdString(value) {
    return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}
// ObjectIdまたはその文字列表現の検証
function isValidObjectId(value) {
    if (isObjectId(value))
        return true;
    if (isObjectIdString(value)) {
        try {
            new mongodb_1.ObjectId(value);
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
// 日付型ガード
function isValidDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
}
// ISO日付文字列型ガード
function isISODateString(value) {
    if (typeof value !== 'string')
        return false;
    const date = new Date(value);
    return isValidDate(date) && date.toISOString() === value;
}
// 基本ドキュメント型ガード
function isBaseDocument(value) {
    return (typeof value === 'object' &&
        value !== null &&
        (!value._id || isValidObjectId(value._id)) &&
        (!value.createdAt || isValidDate(value.createdAt)) &&
        (!value.updatedAt || isValidDate(value.updatedAt)));
}
// タイムスタンプ付きドキュメント型ガード
function isTimestampedDocument(value) {
    return (isBaseDocument(value) &&
        isValidDate(value.createdAt) &&
        isValidDate(value.updatedAt));
}
// 配列型ガード
function isArray(value, itemGuard) {
    if (!Array.isArray(value))
        return false;
    if (!itemGuard)
        return true;
    return value.every(itemGuard);
}
// null許容型ガード
function isNullable(value, guard) {
    return value === null || value === undefined || guard(value);
}
// 文字列enum型ガード生成
function createStringEnumGuard(enumValues) {
    const valueSet = new Set(enumValues);
    return (value) => {
        return typeof value === 'string' && valueSet.has(value);
    };
}
// 数値範囲チェック
function isInRange(value, min, max) {
    if (typeof value !== 'number' || isNaN(value))
        return false;
    if (min !== undefined && value < min)
        return false;
    if (max !== undefined && value > max)
        return false;
    return true;
}
// Email検証
function isValidEmail(value) {
    if (typeof value !== 'string')
        return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
}
// 電話番号検証（日本）
function isValidPhoneNumber(value) {
    if (typeof value !== 'string')
        return false;
    // 数字、ハイフン、括弧、プラス記号を許可
    const phoneRegex = /^[\d\-\(\)\+\s]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
}
// 郵便番号検証（日本）
function isValidPostalCode(value) {
    if (typeof value !== 'string')
        return false;
    const postalCodeRegex = /^\d{3}-?\d{4}$/;
    return postalCodeRegex.test(value);
}
// 必須フィールドの検証
function validateRequired(obj, requiredFields) {
    const errors = [];
    for (const field of requiredFields) {
        const value = obj[field];
        if (value === undefined || value === null || value === '') {
            errors.push({
                field: String(field),
                message: `${String(field)}は必須項目です`,
                code: 'REQUIRED_FIELD',
                value
            });
        }
    }
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
// 文字列長の検証
function validateStringLength(value, field, minLength, maxLength) {
    const errors = [];
    if (typeof value !== 'string') {
        errors.push({
            field,
            message: `${field}は文字列である必要があります`,
            code: 'INVALID_TYPE',
            value
        });
        return { isValid: false, errors };
    }
    if (minLength !== undefined && value.length < minLength) {
        errors.push({
            field,
            message: `${field}は${minLength}文字以上である必要があります`,
            code: 'MIN_LENGTH',
            value
        });
    }
    if (maxLength !== undefined && value.length > maxLength) {
        errors.push({
            field,
            message: `${field}は${maxLength}文字以下である必要があります`,
            code: 'MAX_LENGTH',
            value
        });
    }
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
// 複合バリデーション結果のマージ
function mergeValidationResults(...results) {
    const allErrors = results
        .filter(r => !r.isValid && r.errors)
        .flatMap(r => r.errors);
    return {
        isValid: allErrors.length === 0,
        errors: allErrors.length > 0 ? allErrors : undefined
    };
}
// 型変換ヘルパー
function toObjectId(value) {
    if (isObjectId(value))
        return value;
    if (isObjectIdString(value)) {
        try {
            return new mongodb_1.ObjectId(value);
        }
        catch {
            return null;
        }
    }
    return null;
}
// 日付変換ヘルパー
function toDate(value) {
    if (isValidDate(value))
        return value;
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isValidDate(date) ? date : null;
    }
    return null;
}
// 数値変換ヘルパー
function toNumber(value, defaultValue) {
    if (typeof value === 'number' && !isNaN(value))
        return value;
    if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num))
            return num;
    }
    return defaultValue;
}
// ブール値変換ヘルパー
function toBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return false;
}
