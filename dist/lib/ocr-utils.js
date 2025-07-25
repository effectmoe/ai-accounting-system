"use strict";
/**
 * OCR Utility Functions and Types
 *
 * This module provides shared utilities for OCR data processing,
 * including field mapping, data transformation, and type definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToSnakeCase = convertToSnakeCase;
exports.copyAllFields = copyAllFields;
exports.getDocumentPrefix = getDocumentPrefix;
exports.generateDocumentNumber = generateDocumentNumber;
exports.extractPartnerName = extractPartnerName;
exports.calculateSubtotal = calculateSubtotal;
exports.buildComprehensiveNotes = buildComprehensiveNotes;
exports.validateOCRData = validateOCRData;
exports.logOCRProcessing = logOCRProcessing;
const logger_1 = require("@/lib/logger");
/**
 * Converts a string from camelCase to snake_case
 *
 * @param str - The string to convert
 * @returns The snake_case version of the string
 *
 * @example
 * convertToSnakeCase('documentType') // returns 'document_type'
 * convertToSnakeCase('receiptNumber') // returns 'receipt_number'
 */
function convertToSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
/**
 * Recursively copies all fields from source object to target object
 * with optional transformations
 *
 * @param source - The source object to copy from
 * @param target - The target object to copy to (defaults to new object)
 * @param config - Configuration options for copying behavior
 * @param parentKey - Used internally for nested object flattening
 * @returns The target object with copied fields
 *
 * @example
 * const source = { documentType: 'invoice', vendor: { name: 'ABC Corp' } };
 * const result = copyAllFields(source, {}, { convertToSnakeCase: true });
 * // result: { document_type: 'invoice', vendor_name: 'ABC Corp' }
 */
function copyAllFields(source, target = {}, config = {}, parentKey = '') {
    const { convertToSnakeCase: shouldConvertCase = true, excludeFields = [], flattenObjects = true, arrayHandling = 'stringify' } = config;
    for (const key in source) {
        if (!source.hasOwnProperty(key) || excludeFields.includes(key)) {
            continue;
        }
        const value = source[key];
        const transformedKey = shouldConvertCase ? convertToSnakeCase(key) : key;
        if (value === null || value === undefined) {
            continue;
        }
        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Handle nested objects
            if (flattenObjects) {
                const prefix = parentKey ? `${parentKey}_` : '';
                copyAllFields(value, target, config, prefix + transformedKey);
            }
            else {
                target[transformedKey] = copyAllFields(value, {}, config, '');
            }
        }
        else if (Array.isArray(value)) {
            // Handle arrays based on configuration
            switch (arrayHandling) {
                case 'stringify':
                    target[transformedKey] = JSON.stringify(value);
                    break;
                case 'keep':
                    target[transformedKey] = value;
                    break;
                case 'exclude':
                    // Skip arrays entirely
                    break;
            }
        }
        else {
            // Copy primitive values and dates
            target[transformedKey] = value;
        }
    }
    return target;
}
/**
 * Determines the document type prefix based on the document type
 *
 * @param documentType - The type of document
 * @returns The appropriate prefix for the document number
 */
function getDocumentPrefix(documentType) {
    const prefixMap = {
        receipt: 'REC',
        invoice: 'INV',
        estimate: 'EST',
        delivery_note: 'DLV',
        quotation: 'QUO',
        purchase_order: 'PO'
    };
    return prefixMap[documentType] || 'DOC';
}
/**
 * Generates a unique document number with appropriate prefix
 *
 * @param documentType - The type of document
 * @param existingNumber - Optional existing number to use
 * @returns A formatted document number
 */
function generateDocumentNumber(documentType, existingNumber) {
    if (existingNumber) {
        return existingNumber;
    }
    const prefix = getDocumentPrefix(documentType);
    const timestamp = new Date().getTime();
    return `${prefix}-${timestamp}`;
}
/**
 * Extracts partner/vendor name from various possible fields
 *
 * @param data - The OCR extracted data
 * @returns The most appropriate partner name or 'Unknown'
 */
function extractPartnerName(data) {
    return data.vendorName
        || data.vendor?.name
        || data.storeName
        || data.companyName
        || 'Unknown';
}
/**
 * Calculates subtotal from total and tax amounts
 *
 * @param totalAmount - The total amount
 * @param taxAmount - The tax amount
 * @param providedSubtotal - Optional provided subtotal
 * @returns The calculated or provided subtotal
 */
function calculateSubtotal(totalAmount, taxAmount, providedSubtotal) {
    if (providedSubtotal && providedSubtotal > 0) {
        return providedSubtotal;
    }
    return Math.max(0, totalAmount - taxAmount);
}
/**
 * Builds comprehensive notes from OCR data including all relevant information
 *
 * @param data - The OCR extracted data
 * @param additionalNotes - Additional notes to append
 * @returns Formatted notes string
 */
function buildComprehensiveNotes(data, additionalNotes = []) {
    const notes = [];
    // Basic notes
    if (data.subject)
        notes.push(`件名: ${data.subject}`);
    if (data.notes)
        notes.push(`備考: ${data.notes}`);
    // Payment information
    if (data.paymentAmount && data.paymentAmount > 0) {
        notes.push(`お預かり: ¥${data.paymentAmount.toLocaleString()}`);
    }
    if (data.changeAmount && data.changeAmount > 0) {
        notes.push(`お釣り: ¥${data.changeAmount.toLocaleString()}`);
    }
    if (data.receiptNumber) {
        notes.push(`領収書番号: ${data.receiptNumber}`);
    }
    // Parking-specific information
    if (data.receiptType === 'parking') {
        notes.push('【駐車場領収書】');
        if (data.companyName)
            notes.push(`運営会社: ${data.companyName}`);
        if (data.facilityName)
            notes.push(`施設名: ${data.facilityName}`);
        if (data.entryTime)
            notes.push(`入庫時刻: ${data.entryTime}`);
        if (data.exitTime)
            notes.push(`出庫時刻: ${data.exitTime}`);
        if (data.parkingDuration)
            notes.push(`駐車時間: ${data.parkingDuration}`);
        if (data.baseFee !== undefined && data.baseFee > 0) {
            notes.push(`基本料金: ¥${data.baseFee.toLocaleString()}`);
        }
        if (data.additionalFee !== undefined && data.additionalFee > 0) {
            notes.push(`追加料金: ¥${data.additionalFee.toLocaleString()}`);
        }
    }
    // Bank transfer information
    if (data.bankTransferInfo) {
        notes.push('【振込先情報】');
        const bankInfo = data.bankTransferInfo;
        if (bankInfo.bankName)
            notes.push(`銀行名: ${bankInfo.bankName}`);
        if (bankInfo.branchName)
            notes.push(`支店名: ${bankInfo.branchName}`);
        if (bankInfo.accountType)
            notes.push(`口座種別: ${bankInfo.accountType}`);
        if (bankInfo.accountNumber)
            notes.push(`口座番号: ${bankInfo.accountNumber}`);
        if (bankInfo.accountName)
            notes.push(`口座名義: ${bankInfo.accountName}`);
        if (bankInfo.swiftCode)
            notes.push(`SWIFTコード: ${bankInfo.swiftCode}`);
        if (bankInfo.additionalInfo)
            notes.push(`追加情報: ${bankInfo.additionalInfo}`);
    }
    // Add any additional notes
    notes.push(...additionalNotes);
    return notes.filter(Boolean).join('\n');
}
/**
 * Validates and sanitizes OCR extracted data
 *
 * @param data - The raw OCR data
 * @returns Validated and sanitized data
 */
function validateOCRData(data) {
    const validated = {};
    // Validate and copy fields with type checking
    if (typeof data.documentType === 'string')
        validated.documentType = data.documentType;
    if (typeof data.documentNumber === 'string')
        validated.documentNumber = data.documentNumber;
    if (typeof data.receiptNumber === 'string')
        validated.receiptNumber = data.receiptNumber;
    if (typeof data.issueDate === 'string')
        validated.issueDate = data.issueDate;
    // Validate numeric fields
    const numericFields = [
        'subtotalAmount', 'taxAmount', 'totalAmount',
        'paymentAmount', 'changeAmount', 'baseFee', 'additionalFee'
    ];
    for (const field of numericFields) {
        if (typeof data[field] === 'number' && !isNaN(data[field])) {
            validated[field] = data[field];
        }
        else if (typeof data[field] === 'string') {
            const parsed = parseFloat(data[field]);
            if (!isNaN(parsed)) {
                validated[field] = parsed;
            }
        }
    }
    // Validate vendor information
    if (data.vendor && typeof data.vendor === 'object') {
        validated.vendor = {};
        if (typeof data.vendor.name === 'string')
            validated.vendor.name = data.vendor.name;
        if (typeof data.vendor.address === 'string')
            validated.vendor.address = data.vendor.address;
        if (typeof data.vendor.phone === 'string')
            validated.vendor.phone = data.vendor.phone;
        if (typeof data.vendor.email === 'string')
            validated.vendor.email = data.vendor.email;
        if (typeof data.vendor.fax === 'string')
            validated.vendor.fax = data.vendor.fax;
    }
    // Validate items array
    if (Array.isArray(data.items)) {
        validated.items = data.items.map((item) => ({
            itemName: typeof item.itemName === 'string' ? item.itemName : '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            taxRate: typeof item.taxRate === 'number' ? item.taxRate : 0.1,
            amount: typeof item.amount === 'number' ? item.amount : 0
        }));
    }
    // Copy other string fields
    const stringFields = [
        'vendorName', 'storeName', 'storePhone', 'companyName',
        'subject', 'notes', 'fileName', 'receiptType',
        'facilityName', 'entryTime', 'exitTime', 'parkingDuration'
    ];
    for (const field of stringFields) {
        if (typeof data[field] === 'string') {
            validated[field] = data[field];
        }
    }
    return validated;
}
/**
 * Logs OCR processing details for debugging
 *
 * @param stage - The processing stage
 * @param data - The data to log
 * @param additionalInfo - Additional information to include
 */
function logOCRProcessing(stage, data, additionalInfo) {
    logger_1.logger.debug(`[OCR Processing - ${stage}]`, {
        timestamp: new Date().toISOString(),
        dataKeys: data ? Object.keys(data) : [],
        hasItems: Array.isArray(data?.items),
        itemCount: Array.isArray(data?.items) ? data.items.length : 0,
        ...additionalInfo
    });
}
