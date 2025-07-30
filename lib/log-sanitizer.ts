/**
 * ログ出力時の機密情報サニタイズユーティリティ
 */

// 機密とされるフィールド名のパターン
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credit.*card/i,
  /ssn/i,
  /social.*security/i,
  /tax.*id/i,
  /bank.*account/i,
  /routing.*number/i,
  /mongodb.*uri/i,
  /database.*url/i,
  /api.*key/i
];

// デフォルトの機密フィールド名
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'privateKey',
  'creditCard',
  'ssn',
  'taxId',
  'bankAccount',
  'routingNumber',
  'MONGODB_URI',
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'DEEPSEEK_API_KEY'
];

/**
 * オブジェクトから機密情報をサニタイズ
 */
export function sanitizeForLogging(
  data: any, 
  additionalSensitiveFields: string[] = [],
  maskValue: string = '***REDACTED***'
): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const allSensitiveFields = [
    ...DEFAULT_SENSITIVE_FIELDS,
    ...additionalSensitiveFields
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  if (Array.isArray(sanitized)) {
    return sanitized.map(item => sanitizeForLogging(item, additionalSensitiveFields, maskValue));
  }

  Object.keys(sanitized).forEach(key => {
    // パターンマッチングによる機密フィールド検出
    const isSensitive = SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(key)) ||
                       allSensitiveFields.some(field => 
                         key.toLowerCase().includes(field.toLowerCase())
                       );

    if (isSensitive) {
      sanitized[key] = maskValue;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key], additionalSensitiveFields, maskValue);
    }
  });

  return sanitized;
}

/**
 * 顧客情報専用のサニタイズ関数
 */
export function sanitizeCustomerData(customerData: any): any {
  const customerSensitiveFields = [
    'taxId',
    'creditLimit',
    'bankAccount',
    'personalNumber',
    'internalNotes'
  ];

  return sanitizeForLogging(customerData, customerSensitiveFields);
}

/**
 * エラー情報のサニタイズ
 */
export function sanitizeErrorForLogging(error: any): any {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // スタックトレースから機密情報を除去
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    };
  }

  return sanitizeForLogging(error);
}

/**
 * MongoDBクエリ結果のサニタイズ
 */
export function sanitizeDatabaseResult(result: any): any {
  if (!result) return result;

  // _id フィールドは文字列化
  if (result._id) {
    result._id = result._id.toString();
  }

  // 配列の場合は各要素をサニタイズ
  if (Array.isArray(result)) {
    return result.map(item => sanitizeDatabaseResult(item));
  }

  return sanitizeForLogging(result);
}

/**
 * リクエスト情報のサニタイズ
 */
export function sanitizeRequestForLogging(request: any): any {
  const requestSensitiveFields = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ];

  return {
    method: request.method,
    url: request.url,
    headers: sanitizeForLogging(request.headers, requestSensitiveFields),
    // ボディは別途サニタイズする
    hasBody: !!request.body
  };
}