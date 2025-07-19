import { ObjectId } from 'mongodb';
import { 
  BaseDocument, 
  TimestampedDocument,
  ValidationError,
  ValidationResult 
} from '@/types/database';

// ObjectId型ガード
export function isObjectId(value: any): value is ObjectId {
  return value instanceof ObjectId;
}

// ObjectId文字列型ガード
export function isObjectIdString(value: any): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

// ObjectIdまたはその文字列表現の検証
export function isValidObjectId(value: any): boolean {
  if (isObjectId(value)) return true;
  if (isObjectIdString(value)) {
    try {
      new ObjectId(value);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// 日付型ガード
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// ISO日付文字列型ガード
export function isISODateString(value: any): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return isValidDate(date) && date.toISOString() === value;
}

// 基本ドキュメント型ガード
export function isBaseDocument(value: any): value is BaseDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    (!value._id || isValidObjectId(value._id)) &&
    (!value.createdAt || isValidDate(value.createdAt)) &&
    (!value.updatedAt || isValidDate(value.updatedAt))
  );
}

// タイムスタンプ付きドキュメント型ガード
export function isTimestampedDocument(value: any): value is TimestampedDocument {
  return (
    isBaseDocument(value) &&
    isValidDate(value.createdAt) &&
    isValidDate(value.updatedAt)
  );
}

// 配列型ガード
export function isArray<T>(value: any, itemGuard?: (item: any) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!itemGuard) return true;
  return value.every(itemGuard);
}

// null許容型ガード
export function isNullable<T>(value: any, guard: (value: any) => value is T): value is T | null | undefined {
  return value === null || value === undefined || guard(value);
}

// 文字列enum型ガード生成
export function createStringEnumGuard<T extends string>(enumValues: readonly T[]): (value: any) => value is T {
  const valueSet = new Set(enumValues);
  return (value: any): value is T => {
    return typeof value === 'string' && valueSet.has(value as T);
  };
}

// 数値範囲チェック
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

// Email検証
export function isValidEmail(value: any): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// 電話番号検証（日本）
export function isValidPhoneNumber(value: any): value is string {
  if (typeof value !== 'string') return false;
  // 数字、ハイフン、括弧、プラス記号を許可
  const phoneRegex = /^[\d\-\(\)\+\s]+$/;
  return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
}

// 郵便番号検証（日本）
export function isValidPostalCode(value: any): value is string {
  if (typeof value !== 'string') return false;
  const postalCodeRegex = /^\d{3}-?\d{4}$/;
  return postalCodeRegex.test(value);
}

// 必須フィールドの検証
export function validateRequired<T extends object>(
  obj: T, 
  requiredFields: (keyof T)[]
): ValidationResult {
  const errors: ValidationError[] = [];

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
export function validateStringLength(
  value: string, 
  field: string,
  minLength?: number, 
  maxLength?: number
): ValidationResult {
  const errors: ValidationError[] = [];

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
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results
    .filter(r => !r.isValid && r.errors)
    .flatMap(r => r.errors!);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined
  };
}

// 型変換ヘルパー
export function toObjectId(value: any): ObjectId | null {
  if (isObjectId(value)) return value;
  if (isObjectIdString(value)) {
    try {
      return new ObjectId(value);
    } catch {
      return null;
    }
  }
  return null;
}

// 日付変換ヘルパー
export function toDate(value: any): Date | null {
  if (isValidDate(value)) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
}

// 数値変換ヘルパー
export function toNumber(value: any, defaultValue?: number): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return defaultValue;
}

// ブール値変換ヘルパー
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}