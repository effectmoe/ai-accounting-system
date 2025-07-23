/**
 * OCR Utility Functions and Types
 * 
 * This module provides shared utilities for OCR data processing,
 * including field mapping, data transformation, and type definitions.
 */

import { logger } from '@/lib/logger';

/**
 * Represents the common structure for OCR-extracted data
 */
export interface OCRExtractedData {
  // Basic document info
  documentType?: string;
  documentNumber?: string;
  receiptNumber?: string;
  issueDate?: string;
  
  // Vendor/Partner info
  vendorName?: string;
  vendor?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
  };
  storeName?: string;
  storePhone?: string;
  companyName?: string;
  
  // Financial data
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  paymentAmount?: number;
  changeAmount?: number;
  baseFee?: number;
  additionalFee?: number;
  
  // Document content
  subject?: string;
  notes?: string;
  fileName?: string;
  
  // Parking-specific fields
  receiptType?: 'parking' | 'general' | string;
  facilityName?: string;
  entryTime?: string;
  exitTime?: string;
  parkingDuration?: string;
  
  // Additional structured data
  items?: Array<{
    itemName?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
    amount?: number;
  }>;
  
  // Bank transfer info
  bankTransferInfo?: {
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountName?: string;
    swiftCode?: string;
    additionalInfo?: string;
  };
  
  // Metadata
  [key: string]: any;
}

/**
 * Configuration for field copying behavior
 */
export interface FieldCopyConfig {
  /**
   * Whether to convert field names to snake_case
   */
  convertToSnakeCase?: boolean;
  
  /**
   * Fields to exclude from copying
   */
  excludeFields?: string[];
  
  /**
   * Whether to flatten nested objects
   */
  flattenObjects?: boolean;
  
  /**
   * How to handle arrays (stringify, keep, or exclude)
   */
  arrayHandling?: 'stringify' | 'keep' | 'exclude';
}

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
export function convertToSnakeCase(str: string): string {
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
export function copyAllFields(
  source: any,
  target: any = {},
  config: FieldCopyConfig = {},
  parentKey: string = ''
): any {
  const {
    convertToSnakeCase: shouldConvertCase = true,
    excludeFields = [],
    flattenObjects = true,
    arrayHandling = 'stringify'
  } = config;

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
      } else {
        target[transformedKey] = copyAllFields(value, {}, config, '');
      }
    } else if (Array.isArray(value)) {
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
    } else {
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
export function getDocumentPrefix(documentType: string): string {
  const prefixMap: Record<string, string> = {
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
export function generateDocumentNumber(documentType: string, existingNumber?: string): string {
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
export function extractPartnerName(data: OCRExtractedData): string {
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
export function calculateSubtotal(
  totalAmount: number,
  taxAmount: number,
  providedSubtotal?: number
): number {
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
export function buildComprehensiveNotes(
  data: OCRExtractedData,
  additionalNotes: string[] = []
): string {
  const notes: string[] = [];
  
  // Basic notes
  if (data.subject) notes.push(`件名: ${data.subject}`);
  if (data.notes) notes.push(`備考: ${data.notes}`);
  
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
    if (data.companyName) notes.push(`運営会社: ${data.companyName}`);
    if (data.facilityName) notes.push(`施設名: ${data.facilityName}`);
    if (data.entryTime) notes.push(`入庫時刻: ${data.entryTime}`);
    if (data.exitTime) notes.push(`出庫時刻: ${data.exitTime}`);
    if (data.parkingDuration) notes.push(`駐車時間: ${data.parkingDuration}`);
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
    if (bankInfo.bankName) notes.push(`銀行名: ${bankInfo.bankName}`);
    if (bankInfo.branchName) notes.push(`支店名: ${bankInfo.branchName}`);
    if (bankInfo.accountType) notes.push(`口座種別: ${bankInfo.accountType}`);
    if (bankInfo.accountNumber) notes.push(`口座番号: ${bankInfo.accountNumber}`);
    if (bankInfo.accountName) notes.push(`口座名義: ${bankInfo.accountName}`);
    if (bankInfo.swiftCode) notes.push(`SWIFTコード: ${bankInfo.swiftCode}`);
    if (bankInfo.additionalInfo) notes.push(`追加情報: ${bankInfo.additionalInfo}`);
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
export function validateOCRData(data: any): OCRExtractedData {
  const validated: OCRExtractedData = {};
  
  // Validate and copy fields with type checking
  if (typeof data.documentType === 'string') validated.documentType = data.documentType;
  if (typeof data.documentNumber === 'string') validated.documentNumber = data.documentNumber;
  if (typeof data.receiptNumber === 'string') validated.receiptNumber = data.receiptNumber;
  if (typeof data.issueDate === 'string') validated.issueDate = data.issueDate;
  
  // Validate numeric fields
  const numericFields = [
    'subtotalAmount', 'taxAmount', 'totalAmount', 
    'paymentAmount', 'changeAmount', 'baseFee', 'additionalFee'
  ];
  
  for (const field of numericFields) {
    if (typeof data[field] === 'number' && !isNaN(data[field])) {
      validated[field] = data[field];
    } else if (typeof data[field] === 'string') {
      const parsed = parseFloat(data[field]);
      if (!isNaN(parsed)) {
        validated[field] = parsed;
      }
    }
  }
  
  // Validate vendor information
  if (data.vendor && typeof data.vendor === 'object') {
    validated.vendor = {};
    if (typeof data.vendor.name === 'string') validated.vendor.name = data.vendor.name;
    if (typeof data.vendor.address === 'string') validated.vendor.address = data.vendor.address;
    if (typeof data.vendor.phone === 'string') validated.vendor.phone = data.vendor.phone;
    if (typeof data.vendor.email === 'string') validated.vendor.email = data.vendor.email;
    if (typeof data.vendor.fax === 'string') validated.vendor.fax = data.vendor.fax;
  }
  
  // Validate items array
  if (Array.isArray(data.items)) {
    validated.items = data.items.map((item: any) => ({
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
export function logOCRProcessing(
  stage: string,
  data: any,
  additionalInfo?: Record<string, any>
): void {
  logger.debug(`[OCR Processing - ${stage}]`, {
    timestamp: new Date().toISOString(),
    dataKeys: data ? Object.keys(data) : [],
    hasItems: Array.isArray(data?.items),
    itemCount: Array.isArray(data?.items) ? data.items.length : 0,
    ...additionalInfo
  });
}