"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredDataService = void 0;
const mongodb_1 = require("mongodb");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const structured_data_1 = require("@/types/structured-data");
class StructuredDataService {
    client;
    db;
    structuredDataCollection;
    ajv;
    options;
    cache = new Map();
    constructor(options) {
        // MongoDB接続設定
        const connectionString = process.env.MONGODB_URI ||
            'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
        this.client = new mongodb_1.MongoClient(connectionString);
        this.db = this.client.db('accounting');
        this.structuredDataCollection = this.db.collection('structuredData');
        // AJV JSON Schema バリデーター設定
        this.ajv = new ajv_1.default({
            allErrors: true,
            verbose: true,
            strict: false,
            removeAdditional: true
        });
        (0, ajv_formats_1.default)(this.ajv);
        // スキーマ定義を登録
        this.registerSchemas();
        // デフォルトオプション設定
        this.options = {
            defaultContext: 'https://schema.org',
            enableValidation: true,
            enableCaching: true,
            cacheTimeout: 300000, // 5分
            generationConfig: {
                includeCompanyInfo: true,
                includeCustomerInfo: true,
                includeTaxInfo: true,
                includeLineItems: true,
                language: 'ja',
                context: 'https://schema.org'
            },
            validationConfig: {
                strictMode: false,
                requiredFields: ['@context', '@type'],
                allowedTypes: ['Invoice', 'Quotation', 'DeliveryNote', 'FAQPage', 'Article', 'BusinessEvent', 'Organization', 'Person']
            },
            ...options
        };
    }
    registerSchemas() {
        // JSON Schema定義を登録
        Object.entries(structured_data_1.SCHEMA_DEFINITIONS).forEach(([name, schema]) => {
            this.ajv.addSchema(schema, `#/definitions/${name}`);
        });
    }
    /**
     * 構造化データを生成
     */
    async generateStructuredData(input, schemaType, config) {
        const startTime = Date.now();
        try {
            const mergedConfig = { ...this.options.generationConfig, ...config };
            let structuredData;
            // キャッシュチェック
            const cacheKey = this.generateCacheKey(input, schemaType, mergedConfig);
            if (this.options.enableCaching && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                return {
                    success: true,
                    data: cached,
                    metadata: {
                        generatedAt: new Date(),
                        processingTime: Date.now() - startTime,
                        schemaVersion: '1.0.0',
                        dataSize: JSON.stringify(cached).length
                    }
                };
            }
            // スキーマタイプに応じて構造化データを生成
            switch (schemaType) {
                case 'Invoice':
                    structuredData = this.generateInvoiceSchema(input, mergedConfig);
                    break;
                case 'Quotation':
                    structuredData = this.generateQuotationSchema(input, mergedConfig);
                    break;
                case 'DeliveryNote':
                    structuredData = this.generateDeliveryNoteSchema(input, mergedConfig);
                    break;
                case 'FAQPage':
                    structuredData = this.generateFAQPageSchema(input, mergedConfig);
                    break;
                case 'Article':
                    structuredData = this.generateArticleSchema(input, mergedConfig);
                    break;
                case 'BusinessEvent':
                    structuredData = this.generateBusinessEventSchema(input, mergedConfig);
                    break;
                case 'Organization':
                    structuredData = this.generateOrganizationSchema(input, mergedConfig);
                    break;
                case 'Person':
                    structuredData = this.generatePersonSchema(input, mergedConfig);
                    break;
                default:
                    throw new Error(`Unsupported schema type: ${schemaType}`);
            }
            // バリデーション実行
            let validationResult = { isValid: true, errors: [] };
            if (this.options.enableValidation) {
                validationResult = this.validateSchema(structuredData, schemaType);
            }
            // キャッシュに保存
            if (this.options.enableCaching && validationResult.isValid) {
                this.cache.set(cacheKey, structuredData);
                setTimeout(() => {
                    this.cache.delete(cacheKey);
                }, this.options.cacheTimeout);
            }
            const processingTime = Date.now() - startTime;
            const dataSize = JSON.stringify(structuredData).length;
            return {
                success: validationResult.isValid,
                data: structuredData,
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                metadata: {
                    generatedAt: new Date(),
                    processingTime,
                    schemaVersion: '1.0.0',
                    dataSize
                }
            };
        }
        catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
                metadata: {
                    generatedAt: new Date(),
                    processingTime: Date.now() - startTime,
                    schemaVersion: '1.0.0',
                    dataSize: 0
                }
            };
        }
    }
    /**
     * 請求書のSchema.org構造化データを生成
     */
    generateInvoiceSchema(invoice, config) {
        const helpers = this.getHelpers();
        return {
            '@context': config.context,
            '@type': 'Invoice',
            identifier: invoice.invoiceNumber,
            accountId: invoice.customerId.toString(),
            customer: config.includeCustomerInfo && invoice.customer ?
                helpers.createOrganization({
                    _id: new mongodb_1.ObjectId(),
                    companyName: invoice.customer.companyName,
                    email: invoice.customer.email,
                    phone: invoice.customer.phone,
                    website: invoice.customer.website,
                    address1: invoice.customer.address1,
                    city: invoice.customer.city,
                    prefecture: invoice.customer.prefecture,
                    postalCode: invoice.customer.postalCode,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }) :
                { '@type': 'Organization', name: 'Customer' },
            provider: helpers.createOrganization({
                _id: new mongodb_1.ObjectId(),
                companyName: 'Your Company Name',
                createdAt: new Date(),
                updatedAt: new Date()
            }),
            paymentDueDate: helpers.formatDate(invoice.dueDate),
            totalPaymentDue: helpers.createMonetaryAmount(invoice.totalAmount),
            minimumPaymentDue: helpers.createMonetaryAmount(invoice.totalAmount),
            billingPeriod: helpers.formatDate(invoice.issueDate),
            paymentStatus: this.mapInvoiceStatus(invoice.status),
            totalTax: config.includeTaxInfo ? helpers.createMonetaryAmount(invoice.taxAmount) : undefined,
            subtotal: helpers.createMonetaryAmount(invoice.subtotal),
            lineItems: config.includeLineItems ? invoice.items.map(item => ({
                '@type': 'LineItem',
                name: item.itemName,
                description: item.description,
                quantity: item.quantity,
                price: helpers.createMonetaryAmount(item.unitPrice),
                totalPrice: helpers.createMonetaryAmount(item.amount),
                taxRate: item.taxRate,
                taxAmount: item.taxAmount ? helpers.createMonetaryAmount(item.taxAmount) : undefined
            })) : undefined,
            dateCreated: helpers.formatDate(invoice.createdAt || new Date()),
            dateModified: helpers.formatDate(invoice.updatedAt || new Date()),
            url: `${process.env.NEXT_PUBLIC_BASE_URL}/invoices/${invoice._id}`,
            name: `請求書 ${invoice.invoiceNumber}`,
            description: `${invoice.customer?.companyName || 'Customer'}様への請求書`
        };
    }
    /**
     * 見積書のSchema.org構造化データを生成
     */
    generateQuotationSchema(quote, config) {
        const helpers = this.getHelpers();
        return {
            '@context': config.context,
            '@type': 'Quotation',
            identifier: quote.quoteNumber,
            customer: config.includeCustomerInfo && quote.customer ?
                helpers.createOrganization({
                    _id: new mongodb_1.ObjectId(),
                    companyName: quote.customer.companyName,
                    email: quote.customer.email,
                    phone: quote.customer.phone,
                    website: quote.customer.website,
                    address1: quote.customer.address1,
                    city: quote.customer.city,
                    prefecture: quote.customer.prefecture,
                    postalCode: quote.customer.postalCode,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }) :
                { '@type': 'Organization', name: 'Customer' },
            provider: helpers.createOrganization({
                _id: new mongodb_1.ObjectId(),
                companyName: 'Your Company Name',
                createdAt: new Date(),
                updatedAt: new Date()
            }),
            validThrough: helpers.formatDate(quote.validityDate),
            totalPrice: helpers.createMonetaryAmount(quote.totalAmount),
            subtotal: helpers.createMonetaryAmount(quote.subtotal),
            totalTax: config.includeTaxInfo ? helpers.createMonetaryAmount(quote.taxAmount) : undefined,
            lineItems: config.includeLineItems ? quote.items.map(item => ({
                '@type': 'LineItem',
                name: item.itemName,
                description: item.description,
                quantity: item.quantity,
                price: helpers.createMonetaryAmount(item.unitPrice),
                totalPrice: helpers.createMonetaryAmount(item.amount),
                taxRate: item.taxRate,
                taxAmount: item.taxAmount ? helpers.createMonetaryAmount(item.taxAmount) : undefined
            })) : undefined,
            dateCreated: helpers.formatDate(quote.createdAt || new Date()),
            dateModified: helpers.formatDate(quote.updatedAt || new Date()),
            url: `${process.env.NEXT_PUBLIC_BASE_URL}/quotes/${quote._id}`,
            name: `見積書 ${quote.quoteNumber}`,
            description: `${quote.customer?.companyName || 'Customer'}様への見積書`
        };
    }
    /**
     * 納品書のSchema.org構造化データを生成
     */
    generateDeliveryNoteSchema(deliveryNote, config) {
        const helpers = this.getHelpers();
        return {
            '@context': config.context,
            '@type': 'DeliveryNote',
            identifier: deliveryNote.deliveryNoteNumber,
            customer: config.includeCustomerInfo && deliveryNote.customer ?
                helpers.createOrganization({
                    _id: new mongodb_1.ObjectId(),
                    companyName: deliveryNote.customer.companyName,
                    email: deliveryNote.customer.email,
                    phone: deliveryNote.customer.phone,
                    website: deliveryNote.customer.website,
                    address1: deliveryNote.customer.address1,
                    city: deliveryNote.customer.city,
                    prefecture: deliveryNote.customer.prefecture,
                    postalCode: deliveryNote.customer.postalCode,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }) :
                { '@type': 'Organization', name: 'Customer' },
            provider: helpers.createOrganization({
                _id: new mongodb_1.ObjectId(),
                companyName: 'Your Company Name',
                createdAt: new Date(),
                updatedAt: new Date()
            }),
            deliveryDate: helpers.formatDate(deliveryNote.deliveryDate),
            deliveryLocation: deliveryNote.deliveryLocation ?
                helpers.createPostalAddress(deliveryNote.deliveryLocation) : undefined,
            deliveryMethod: deliveryNote.deliveryMethod,
            totalPrice: helpers.createMonetaryAmount(deliveryNote.totalAmount),
            subtotal: helpers.createMonetaryAmount(deliveryNote.subtotal),
            totalTax: config.includeTaxInfo ? helpers.createMonetaryAmount(deliveryNote.taxAmount) : undefined,
            lineItems: config.includeLineItems ? deliveryNote.items.map(item => ({
                '@type': 'LineItem',
                name: item.itemName,
                description: item.description,
                quantity: item.quantity,
                price: helpers.createMonetaryAmount(item.unitPrice),
                totalPrice: helpers.createMonetaryAmount(item.amount),
                taxRate: item.taxRate,
                taxAmount: item.taxAmount ? helpers.createMonetaryAmount(item.taxAmount) : undefined
            })) : undefined,
            deliveryStatus: this.mapDeliveryStatus(deliveryNote.status),
            dateCreated: helpers.formatDate(deliveryNote.createdAt || new Date()),
            dateModified: helpers.formatDate(deliveryNote.updatedAt || new Date()),
            url: `${process.env.NEXT_PUBLIC_BASE_URL}/delivery-notes/${deliveryNote._id}`,
            name: `納品書 ${deliveryNote.deliveryNoteNumber}`,
            description: `${deliveryNote.customer?.companyName || 'Customer'}様への納品書`
        };
    }
    /**
     * FAQページのSchema.org構造化データを生成
     */
    generateFAQPageSchema(faq, config) {
        const helpers = this.getHelpers();
        const question = {
            '@type': 'Question',
            name: faq.question,
            text: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
                dateCreated: helpers.formatDate(faq.createdAt),
                upvoteCount: faq.usageStats.helpfulVotes
            },
            dateCreated: helpers.formatDate(faq.createdAt),
            category: faq.category,
            keywords: faq.tags
        };
        return {
            '@context': config.context,
            '@type': 'FAQPage',
            mainEntity: [question],
            dateCreated: helpers.formatDate(faq.createdAt),
            dateModified: helpers.formatDate(faq.updatedAt),
            url: `${process.env.NEXT_PUBLIC_BASE_URL}/faq/${faq._id}`,
            name: `FAQ: ${faq.question}`,
            description: faq.answer.substring(0, 160) + '...'
        };
    }
    /**
     * 記事のSchema.org構造化データを生成
     */
    generateArticleSchema(article, config) {
        const helpers = this.getHelpers();
        return {
            '@context': config.context,
            '@type': 'Article',
            headline: article.title || article.headline,
            articleBody: article.content || article.body,
            author: helpers.createPerson(article.authorName || 'Author'),
            publisher: helpers.createOrganization({
                _id: new mongodb_1.ObjectId(),
                companyName: 'Your Company Name',
                createdAt: new Date(),
                updatedAt: new Date()
            }),
            datePublished: helpers.formatDate(article.publishedDate || article.createdAt),
            dateModified: helpers.formatDate(article.updatedAt),
            keywords: article.tags || [],
            articleSection: article.category,
            wordCount: article.wordCount,
            dateCreated: helpers.formatDate(article.createdAt),
            url: article.url,
            name: article.title,
            description: article.excerpt || article.description
        };
    }
    /**
     * ビジネスイベントのSchema.org構造化データを生成
     */
    generateBusinessEventSchema(event, config) {
        const helpers = this.getHelpers();
        return {
            '@context': config.context,
            '@type': 'BusinessEvent',
            name: event.name,
            description: event.description,
            startDate: helpers.formatDate(event.startDate),
            endDate: event.endDate ? helpers.formatDate(event.endDate) : undefined,
            location: event.location,
            organizer: helpers.createOrganization({
                _id: new mongodb_1.ObjectId(),
                companyName: event.organizerName || 'Your Company Name',
                createdAt: new Date(),
                updatedAt: new Date()
            }),
            eventStatus: event.status ? this.mapEventStatus(event.status) : 'EventScheduled',
            eventAttendanceMode: event.attendanceMode || 'OfflineEventAttendanceMode',
            dateCreated: helpers.formatDate(event.createdAt),
            url: event.url
        };
    }
    /**
     * 組織のSchema.org構造化データを生成
     */
    generateOrganizationSchema(companyInfo, config) {
        const helpers = this.getHelpers();
        return helpers.createOrganization(companyInfo);
    }
    /**
     * 人物のSchema.org構造化データを生成
     */
    generatePersonSchema(customer, config) {
        const helpers = this.getHelpers();
        return helpers.createPerson(customer.companyName, // 個人事業主の場合
        customer.email, customer.contacts?.[0]?.title);
    }
    /**
     * JSON Schemaバリデーション実行
     */
    validateSchema(data, schemaType) {
        try {
            const schemaName = `#/definitions/${schemaType}`;
            const validate = this.ajv.getSchema(schemaName);
            if (!validate) {
                return {
                    isValid: false,
                    errors: [`Schema not found for type: ${schemaType}`]
                };
            }
            const isValid = validate(data);
            if (isValid) {
                return { isValid: true, errors: [] };
            }
            else {
                const errors = validate.errors?.map(error => `${error.instancePath}: ${error.message}`) || ['Unknown validation error'];
                return { isValid: false, errors };
            }
        }
        catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : 'Validation error']
            };
        }
    }
    /**
     * 構造化データをMongoDBに保存
     */
    async saveStructuredData(sourceId, sourceType, schemaType, jsonLd, validationResult, metadata) {
        const document = {
            sourceId,
            sourceType,
            schemaType,
            schemaVersion: '1.0.0',
            jsonLd,
            validationResult,
            metadata: {
                ...metadata,
                version: 1
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await this.structuredDataCollection.insertOne(document);
        return { ...document, _id: result.insertedId };
    }
    /**
     * 構造化データを取得
     */
    async getStructuredData(sourceId, sourceType) {
        const filter = { sourceId, isActive: true };
        if (sourceType) {
            filter.sourceType = sourceType;
        }
        return await this.structuredDataCollection.find(filter).toArray();
    }
    /**
     * 構造化データ統計を取得
     */
    async getStats() {
        const pipeline = [
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalDocuments: { $sum: 1 },
                    byType: {
                        $push: {
                            type: '$schemaType',
                            count: 1
                        }
                    },
                    validDocuments: {
                        $sum: {
                            $cond: [{ $eq: ['$validationResult.isValid', true] }, 1, 0]
                        }
                    },
                    invalidDocuments: {
                        $sum: {
                            $cond: [{ $eq: ['$validationResult.isValid', false] }, 1, 0]
                        }
                    },
                    avgProcessingTime: { $avg: '$metadata.processingTime' },
                    lastGenerated: { $max: '$metadata.generatedAt' }
                }
            }
        ];
        const result = await this.structuredDataCollection.aggregate(pipeline).toArray();
        const stats = result[0] || {
            totalDocuments: 0,
            byType: [],
            validDocuments: 0,
            invalidDocuments: 0,
            avgProcessingTime: 0,
            lastGenerated: new Date()
        };
        // byType統計を整理
        const typeStats = {};
        stats.byType.forEach((item) => {
            typeStats[item.type] = (typeStats[item.type] || 0) + 1;
        });
        return {
            totalDocuments: stats.totalDocuments,
            byType: typeStats,
            byStatus: {
                active: stats.totalDocuments,
                inactive: 0
            },
            validationStats: {
                valid: stats.validDocuments,
                invalid: stats.invalidDocuments,
                warnings: 0
            },
            avgProcessingTime: stats.avgProcessingTime,
            lastGenerated: stats.lastGenerated
        };
    }
    /**
     * ヘルパー関数を取得
     */
    getHelpers() {
        return {
            createOrganization: (companyInfo) => ({
                '@type': 'Organization',
                name: companyInfo.companyName,
                url: companyInfo.website,
                logo: companyInfo.logoUrl,
                email: companyInfo.email,
                telephone: companyInfo.phone,
                taxID: companyInfo.registrationNumber,
                address: companyInfo.address1 ? this.getHelpers().createPostalAddress(companyInfo.address1, companyInfo.city, companyInfo.prefecture, companyInfo.postalCode) : undefined
            }),
            createPerson: (name, email, jobTitle) => ({
                '@type': 'Person',
                name,
                email,
                jobTitle
            }),
            createPostalAddress: (address, city, region, postalCode) => ({
                '@type': 'PostalAddress',
                streetAddress: address,
                addressLocality: city,
                addressRegion: region,
                postalCode,
                addressCountry: 'JP'
            }),
            createMonetaryAmount: (value, currency = 'JPY') => ({
                '@type': 'MonetaryAmount',
                currency,
                value
            }),
            formatDate: (date) => date.toISOString().split('T')[0],
            validateSchema: (data, schemaType) => this.validateSchema(data, schemaType)
        };
    }
    // ステータスマッピング関数
    mapInvoiceStatus(status) {
        const statusMap = {
            'draft': 'PaymentDue',
            'saved': 'PaymentDue',
            'paid': 'PaymentComplete',
            'overdue': 'PaymentPastDue',
            'cancelled': 'PaymentDue'
        };
        return statusMap[status] || 'PaymentDue';
    }
    mapDeliveryStatus(status) {
        const statusMap = {
            'draft': 'InTransit',
            'saved': 'InTransit',
            'delivered': 'Delivered',
            'received': 'Delivered',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || 'InTransit';
    }
    mapEventStatus(status) {
        const statusMap = {
            'scheduled': 'EventScheduled',
            'cancelled': 'EventCancelled',
            'postponed': 'EventPostponed',
            'rescheduled': 'EventRescheduled'
        };
        return statusMap[status] || 'EventScheduled';
    }
    // キャッシュキー生成
    generateCacheKey(input, schemaType, config) {
        const inputHash = JSON.stringify(input);
        const configHash = JSON.stringify(config);
        return `${schemaType}-${Buffer.from(inputHash + configHash).toString('base64').slice(0, 32)}`;
    }
    /**
     * リソースクリーンアップ
     */
    async close() {
        await this.client.close();
        this.cache.clear();
    }
}
exports.StructuredDataService = StructuredDataService;
