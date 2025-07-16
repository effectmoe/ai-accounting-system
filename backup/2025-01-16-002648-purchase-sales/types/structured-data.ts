import { ObjectId } from 'mongodb';
import { Invoice, Quote, DeliveryNote, FaqArticle, CompanyInfo, Customer } from './collections';

// JSON Schema検証用の型定義
export interface JSONSchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 構造化データの基本インターフェース
export interface BaseStructuredData {
  '@context': string;
  '@type': string;
  url?: string;
  name?: string;
  description?: string;
  dateCreated?: string;
  dateModified?: string;
  author?: Organization | Person;
  publisher?: Organization;
}

// Schema.org Organization
export interface Organization {
  '@type': 'Organization';
  name: string;
  url?: string;
  logo?: string;
  address?: PostalAddress;
  telephone?: string;
  email?: string;
  taxID?: string;
  sameAs?: string[];
}

// Schema.org Person
export interface Person {
  '@type': 'Person';
  name: string;
  jobTitle?: string;
  email?: string;
  telephone?: string;
  worksFor?: Organization;
}

// Schema.org PostalAddress
export interface PostalAddress {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

// Schema.org MonetaryAmount
export interface MonetaryAmount {
  '@type': 'MonetaryAmount';
  currency: string;
  value: number;
}

// Schema.org FAQPage
export interface FAQPageSchema extends BaseStructuredData {
  '@type': 'FAQPage';
  mainEntity: QuestionSchema[];
}

// Schema.org Question
export interface QuestionSchema {
  '@type': 'Question';
  name: string;
  text?: string;
  acceptedAnswer: AnswerSchema;
  dateCreated?: string;
  author?: Person | Organization;
  category?: string;
  keywords?: string[];
}

// Schema.org Answer
export interface AnswerSchema {
  '@type': 'Answer';
  text: string;
  dateCreated?: string;
  author?: Person | Organization;
  upvoteCount?: number;
  url?: string;
}

// Schema.org Invoice
export interface InvoiceSchema extends BaseStructuredData {
  '@type': 'Invoice';
  identifier: string;
  accountId: string;
  customer: Organization | Person;
  provider: Organization;
  paymentDueDate: string;
  minimumPaymentDue?: MonetaryAmount;
  totalPaymentDue: MonetaryAmount;
  billingPeriod?: string;
  category?: string;
  confirmationNumber?: string;
  paymentMethod?: string;
  paymentStatus?: 'PaymentPastDue' | 'PaymentDue' | 'PaymentComplete' | 'PaymentAutomaticallyApplied';
  referencesOrder?: string;
  scheduledPaymentDate?: string;
  totalTax?: MonetaryAmount;
  subtotal?: MonetaryAmount;
  lineItems?: LineItemSchema[];
}

// Schema.org LineItem
export interface LineItemSchema {
  '@type': 'LineItem';
  name: string;
  description?: string;
  quantity: number;
  price: MonetaryAmount;
  totalPrice: MonetaryAmount;
  taxRate?: number;
  taxAmount?: MonetaryAmount;
}

// Schema.org Quotation
export interface QuotationSchema extends BaseStructuredData {
  '@type': 'Quotation';
  identifier: string;
  customer: Organization | Person;
  provider: Organization;
  validThrough: string;
  totalPrice: MonetaryAmount;
  subtotal?: MonetaryAmount;
  totalTax?: MonetaryAmount;
  lineItems?: LineItemSchema[];
  category?: string;
  priceValidUntil?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
}

// Schema.org DeliveryNote (カスタム拡張)
export interface DeliveryNoteSchema extends BaseStructuredData {
  '@type': 'DeliveryNote';
  identifier: string;
  customer: Organization | Person;
  provider: Organization;
  deliveryDate: string;
  deliveryLocation?: PostalAddress;
  deliveryMethod?: string;
  totalPrice: MonetaryAmount;
  subtotal?: MonetaryAmount;
  totalTax?: MonetaryAmount;
  lineItems?: LineItemSchema[];
  trackingNumber?: string;
  carrier?: Organization;
  deliveryStatus?: 'InTransit' | 'Delivered' | 'Failed' | 'Cancelled';
}

// Schema.org Article (一般的な記事用)
export interface ArticleSchema extends BaseStructuredData {
  '@type': 'Article';
  headline: string;
  articleBody: string;
  author: Person | Organization;
  publisher: Organization;
  datePublished: string;
  dateModified?: string;
  mainEntityOfPage?: string;
  image?: string[];
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
  genre?: string;
  about?: string[];
  mentions?: string[];
}

// Schema.org BusinessEvent (セミナー・イベント用)
export interface BusinessEventSchema extends BaseStructuredData {
  '@type': 'BusinessEvent';
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: PostalAddress | string;
  organizer: Organization | Person;
  performer?: Person | Organization;
  audience?: string;
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OnlineEventAttendanceMode' | 'OfflineEventAttendanceMode' | 'MixedEventAttendanceMode';
  offers?: {
    '@type': 'Offer';
    price?: number;
    priceCurrency?: string;
    availability?: string;
    validFrom?: string;
    validThrough?: string;
  };
}

// 構造化データ生成設定
export interface StructuredDataGenerationConfig {
  includeCompanyInfo: boolean;
  includeCustomerInfo: boolean;
  includeTaxInfo: boolean;
  includeLineItems: boolean;
  language: 'ja' | 'en';
  context: string; // @context URL
  additionalProperties?: Record<string, any>;
}

// 構造化データ検証設定
export interface StructuredDataValidationConfig {
  strictMode: boolean;
  requiredFields: string[];
  allowedTypes: string[];
  customValidators?: Record<string, (value: any) => boolean>;
}

// 構造化データ生成結果
export interface StructuredDataGenerationResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    generatedAt: Date;
    processingTime: number;
    schemaVersion: string;
    dataSize: number;
  };
}

// 構造化データサービスのオプション
export interface StructuredDataServiceOptions {
  defaultContext: string;
  enableValidation: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  generationConfig: StructuredDataGenerationConfig;
  validationConfig: StructuredDataValidationConfig;
}

// MongoDB保存用の構造化データ
export interface StructuredDataDocument {
  _id?: ObjectId;
  sourceId: ObjectId; // 元のドキュメントID
  sourceType: 'invoice' | 'quote' | 'delivery-note' | 'faq' | 'article' | 'event';
  schemaType: string; // @type値
  schemaVersion: string;
  jsonLd: any; // JSON-LD形式のデータ
  validationResult: JSONSchemaValidationResult;
  metadata: {
    generatedAt: Date;
    generatedBy: 'system' | 'user';
    processingTime: number;
    dataSize: number;
    version: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 構造化データ統計
export interface StructuredDataStats {
  totalDocuments: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  validationStats: {
    valid: number;
    invalid: number;
    warnings: number;
  };
  avgProcessingTime: number;
  lastGenerated: Date;
}

// エクスポート型
export type SupportedSchemaType = 
  | 'Invoice'
  | 'Quotation'
  | 'DeliveryNote'
  | 'FAQPage'
  | 'Article'
  | 'BusinessEvent'
  | 'Organization'
  | 'Person';

export type StructuredDataInput = 
  | Invoice
  | Quote
  | DeliveryNote
  | FaqArticle
  | CompanyInfo
  | Customer;

export type StructuredDataOutput = 
  | InvoiceSchema
  | QuotationSchema
  | DeliveryNoteSchema
  | FAQPageSchema
  | ArticleSchema
  | BusinessEventSchema
  | Organization
  | Person;

// JSON Schema定義（検証用）
export const SCHEMA_DEFINITIONS = {
  Invoice: {
    type: 'object',
    required: ['@context', '@type', 'identifier', 'customer', 'provider', 'paymentDueDate', 'totalPaymentDue'],
    properties: {
      '@context': { type: 'string', enum: ['https://schema.org'] },
      '@type': { type: 'string', enum: ['Invoice'] },
      identifier: { type: 'string', minLength: 1 },
      customer: { oneOf: [{ $ref: '#/definitions/Organization' }, { $ref: '#/definitions/Person' }] },
      provider: { $ref: '#/definitions/Organization' },
      paymentDueDate: { type: 'string', format: 'date' },
      totalPaymentDue: { $ref: '#/definitions/MonetaryAmount' },
      paymentStatus: {
        type: 'string',
        enum: ['PaymentPastDue', 'PaymentDue', 'PaymentComplete', 'PaymentAutomaticallyApplied']
      }
    }
  },
  FAQPage: {
    type: 'object',
    required: ['@context', '@type', 'mainEntity'],
    properties: {
      '@context': { type: 'string', enum: ['https://schema.org'] },
      '@type': { type: 'string', enum: ['FAQPage'] },
      mainEntity: {
        type: 'array',
        items: { $ref: '#/definitions/Question' },
        minItems: 1
      }
    }
  },
  Question: {
    type: 'object',
    required: ['@type', 'name', 'acceptedAnswer'],
    properties: {
      '@type': { type: 'string', enum: ['Question'] },
      name: { type: 'string', minLength: 1 },
      acceptedAnswer: { $ref: '#/definitions/Answer' }
    }
  },
  Answer: {
    type: 'object',
    required: ['@type', 'text'],
    properties: {
      '@type': { type: 'string', enum: ['Answer'] },
      text: { type: 'string', minLength: 1 }
    }
  },
  Organization: {
    type: 'object',
    required: ['@type', 'name'],
    properties: {
      '@type': { type: 'string', enum: ['Organization'] },
      name: { type: 'string', minLength: 1 },
      url: { type: 'string', format: 'uri' },
      email: { type: 'string', format: 'email' },
      telephone: { type: 'string' },
      address: { $ref: '#/definitions/PostalAddress' }
    }
  },
  Person: {
    type: 'object',
    required: ['@type', 'name'],
    properties: {
      '@type': { type: 'string', enum: ['Person'] },
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      telephone: { type: 'string' },
      jobTitle: { type: 'string' }
    }
  },
  PostalAddress: {
    type: 'object',
    required: ['@type'],
    properties: {
      '@type': { type: 'string', enum: ['PostalAddress'] },
      streetAddress: { type: 'string' },
      addressLocality: { type: 'string' },
      addressRegion: { type: 'string' },
      postalCode: { type: 'string' },
      addressCountry: { type: 'string' }
    }
  },
  MonetaryAmount: {
    type: 'object',
    required: ['@type', 'currency', 'value'],
    properties: {
      '@type': { type: 'string', enum: ['MonetaryAmount'] },
      currency: { type: 'string', minLength: 3, maxLength: 3 },
      value: { type: 'number', minimum: 0 }
    }
  }
} as const;

// ヘルパー関数の型定義
export interface StructuredDataHelpers {
  createOrganization: (companyInfo: CompanyInfo) => Organization;
  createPerson: (name: string, email?: string, jobTitle?: string) => Person;
  createPostalAddress: (address: string, city?: string, region?: string, postalCode?: string) => PostalAddress;
  createMonetaryAmount: (value: number, currency?: string) => MonetaryAmount;
  formatDate: (date: Date) => string;
  validateSchema: (data: any, schemaType: SupportedSchemaType) => JSONSchemaValidationResult;
}