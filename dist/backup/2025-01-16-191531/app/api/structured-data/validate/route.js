"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const structured_data_service_1 = require("@/services/structured-data.service");
// 構造化データサービスのインスタンス
let structuredDataService;
const getStructuredDataService = () => {
    if (!structuredDataService) {
        structuredDataService = new structured_data_service_1.StructuredDataService();
    }
    return structuredDataService;
};
/**
 * POST /api/structured-data/validate
 * 構造化データの検証
 */
async function POST(request) {
    try {
        const body = await request.json();
        const { data, schemaType, strictMode = false, checkRequired = true } = body;
        // 入力検証
        if (!data || !schemaType) {
            return server_1.NextResponse.json({
                success: false,
                error: 'data and schemaType are required'
            }, { status: 400 });
        }
        // サポートされているスキーマタイプかチェック
        const supportedTypes = [
            'Invoice', 'Quotation', 'DeliveryNote', 'FAQPage',
            'Article', 'BusinessEvent', 'Organization', 'Person'
        ];
        if (!supportedTypes.includes(schemaType)) {
            return server_1.NextResponse.json({
                success: false,
                error: `Unsupported schema type: ${schemaType}. Supported types: ${supportedTypes.join(', ')}`
            }, { status: 400 });
        }
        const service = getStructuredDataService();
        // JSON Schema検証
        const validationResult = service.validateSchema(data, schemaType);
        // 追加検証
        const additionalChecks = performAdditionalValidation(data, schemaType, { strictMode, checkRequired });
        // 結果を統合
        const combinedResult = {
            isValid: validationResult.isValid && additionalChecks.isValid,
            errors: [...(validationResult.errors || []), ...(additionalChecks.errors || [])],
            warnings: [...(validationResult.warnings || []), ...(additionalChecks.warnings || [])]
        };
        // レスポンス
        return server_1.NextResponse.json({
            success: true,
            validation: combinedResult,
            details: {
                schemaValidation: validationResult,
                additionalChecks: additionalChecks,
                dataSize: JSON.stringify(data).length,
                schemaType,
                strictMode,
                checkRequired
            },
            suggestions: generateSuggestions(data, schemaType, combinedResult)
        });
    }
    catch (error) {
        console.error('Validation error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            validation: {
                isValid: false,
                errors: [error instanceof Error ? error.message : 'Validation failed']
            }
        }, { status: 500 });
    }
}
/**
 * GET /api/structured-data/validate
 * 検証ルールとサンプルデータの取得
 */
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schemaType = searchParams.get('schemaType');
        const validationRules = {
            'Invoice': {
                requiredFields: ['@context', '@type', 'identifier', 'customer', 'provider', 'paymentDueDate', 'totalPaymentDue'],
                contextMustBe: 'https://schema.org',
                typeMustBe: 'Invoice',
                validationRules: [
                    'identifier must be non-empty string',
                    'totalPaymentDue must have valid MonetaryAmount structure',
                    'paymentDueDate must be valid date (YYYY-MM-DD format)',
                    'customer must be Organization or Person'
                ],
                sampleValid: {
                    '@context': 'https://schema.org',
                    '@type': 'Invoice',
                    'identifier': 'INV-2025-001',
                    'customer': {
                        '@type': 'Organization',
                        'name': '株式会社サンプル'
                    },
                    'provider': {
                        '@type': 'Organization',
                        'name': 'Your Company'
                    },
                    'paymentDueDate': '2025-01-31',
                    'totalPaymentDue': {
                        '@type': 'MonetaryAmount',
                        'currency': 'JPY',
                        'value': 10800
                    }
                }
            },
            'FAQPage': {
                requiredFields: ['@context', '@type', 'mainEntity'],
                contextMustBe: 'https://schema.org',
                typeMustBe: 'FAQPage',
                validationRules: [
                    'mainEntity must be array of Question objects',
                    'each Question must have name and acceptedAnswer',
                    'acceptedAnswer must have text field'
                ],
                sampleValid: {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    'mainEntity': [{
                            '@type': 'Question',
                            'name': '消費税の計算方法は？',
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': '消費税は商品価格に税率（10%または8%）を掛けて計算します。'
                            }
                        }]
                }
            },
            'Organization': {
                requiredFields: ['@type', 'name'],
                typeMustBe: 'Organization',
                validationRules: [
                    'name must be non-empty string',
                    'if email provided, must be valid email format',
                    'if url provided, must be valid URL format'
                ],
                sampleValid: {
                    '@type': 'Organization',
                    'name': '株式会社サンプル',
                    'email': 'info@sample.co.jp',
                    'url': 'https://sample.co.jp'
                }
            }
        };
        if (schemaType) {
            // 特定のスキーマタイプの検証ルールを返す
            const rules = validationRules[schemaType];
            if (!rules) {
                return server_1.NextResponse.json({
                    success: false,
                    error: `Validation rules not found for schema type: ${schemaType}`
                }, { status: 404 });
            }
            return server_1.NextResponse.json({
                success: true,
                schemaType,
                validationRules: rules
            });
        }
        // すべてのスキーマタイプの検証ルールを返す
        return server_1.NextResponse.json({
            success: true,
            validationRules,
            supportedTypes: Object.keys(validationRules)
        });
    }
    catch (error) {
        console.error('Validation rules error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
/**
 * 追加検証を実行
 */
function performAdditionalValidation(data, schemaType, options) {
    const errors = [];
    const warnings = [];
    try {
        // 共通検証
        if (options.checkRequired) {
            if (!data['@type']) {
                errors.push('@type field is required');
            }
            else if (data['@type'] !== schemaType) {
                errors.push(`@type must be '${schemaType}', got '${data['@type']}'`);
            }
            if (data['@context'] && data['@context'] !== 'https://schema.org') {
                warnings.push('Recommended @context is "https://schema.org"');
            }
        }
        // スキーマタイプ別の追加検証
        switch (schemaType) {
            case 'Invoice':
            case 'Quotation':
                validateInvoiceQuotation(data, errors, warnings, options.strictMode);
                break;
            case 'FAQPage':
                validateFAQPage(data, errors, warnings, options.strictMode);
                break;
            case 'Organization':
                validateOrganization(data, errors, warnings, options.strictMode);
                break;
            case 'Person':
                validatePerson(data, errors, warnings, options.strictMode);
                break;
        }
    }
    catch (error) {
        errors.push(`Additional validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
/**
 * 請求書・見積書の追加検証
 */
function validateInvoiceQuotation(data, errors, warnings, strictMode) {
    // 金額の検証
    if (data.totalPaymentDue || data.totalPrice) {
        const amount = data.totalPaymentDue || data.totalPrice;
        if (!amount.value || amount.value <= 0) {
            errors.push('Total amount must be positive number');
        }
        if (!amount.currency) {
            errors.push('Currency is required for monetary amount');
        }
        else if (amount.currency !== 'JPY') {
            warnings.push('Currency should typically be JPY for Japanese invoices');
        }
    }
    // 日付の検証
    if (data.paymentDueDate || data.validThrough) {
        const dateStr = data.paymentDueDate || data.validThrough;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            errors.push('Date must be in YYYY-MM-DD format');
        }
    }
    // 顧客情報の検証
    if (data.customer && (!data.customer.name || data.customer.name.trim() === '')) {
        errors.push('Customer name is required');
    }
}
/**
 * FAQページの追加検証
 */
function validateFAQPage(data, errors, warnings, strictMode) {
    if (!data.mainEntity || !Array.isArray(data.mainEntity)) {
        errors.push('mainEntity must be an array');
        return;
    }
    if (data.mainEntity.length === 0) {
        errors.push('At least one question is required');
    }
    data.mainEntity.forEach((question, index) => {
        if (!question.name || question.name.trim() === '') {
            errors.push(`Question ${index + 1}: name is required`);
        }
        if (!question.acceptedAnswer || !question.acceptedAnswer.text) {
            errors.push(`Question ${index + 1}: acceptedAnswer.text is required`);
        }
    });
}
/**
 * 組織の追加検証
 */
function validateOrganization(data, errors, warnings, strictMode) {
    if (!data.name || data.name.trim() === '') {
        errors.push('Organization name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }
    if (data.url && !/^https?:\/\/.+$/.test(data.url)) {
        errors.push('Invalid URL format');
    }
}
/**
 * 人物の追加検証
 */
function validatePerson(data, errors, warnings, strictMode) {
    if (!data.name || data.name.trim() === '') {
        errors.push('Person name is required');
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Invalid email format');
    }
}
/**
 * 改善提案の生成
 */
function generateSuggestions(data, schemaType, validation) {
    const suggestions = [];
    if (!validation.isValid) {
        suggestions.push('Fix validation errors before using this structured data');
    }
    if (!data['@context']) {
        suggestions.push('Add @context field with value "https://schema.org"');
    }
    if (schemaType === 'Invoice' || schemaType === 'Quotation') {
        if (!data.lineItems) {
            suggestions.push('Consider adding lineItems for detailed invoice/quotation information');
        }
        if (!data.provider?.address) {
            suggestions.push('Add provider address information for better SEO');
        }
    }
    if (schemaType === 'FAQPage') {
        if (data.mainEntity && data.mainEntity.length === 1) {
            suggestions.push('Consider adding more questions for a comprehensive FAQ page');
        }
    }
    return suggestions;
}
