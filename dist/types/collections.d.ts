import { ObjectId } from 'mongodb';
import { TimestampedDocument, TaggableDocument } from './database';
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'invoice' | 'other';
export interface SpeechSettings {
    aiPromptEnhancement?: {
        enabled: boolean;
        customPromptInstructions?: string;
        contextAwareHomophoneCorrection: boolean;
        businessContextInstructions?: string;
    };
    dictionaryCorrection?: {
        enabled: boolean;
        customDictionary: Array<{
            id: string;
            incorrect: string;
            correct: string;
            category?: string;
            description?: string;
        }>;
    };
}
export interface SpeechDictionaryEntry {
    id: string;
    incorrect: string;
    correct: string;
    category?: string;
    description?: string;
}
export type AccountType = 'checking' | 'savings';
export type InvoiceStatus = 'draft' | 'saved' | 'paid' | 'overdue' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'saved' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type DeliveryNoteStatus = 'draft' | 'saved' | 'delivered' | 'received' | 'cancelled';
export interface Customer extends TimestampedDocument, TaggableDocument {
    id?: string;
    customerId?: string;
    companyName: string;
    companyNameKana?: string;
    department?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
    paymentTerms?: number;
    contacts?: Contact[];
    tags?: string[];
    notes?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Contact {
    name: string;
    nameKana?: string;
    title?: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
}
export interface CompanyInfo {
    _id?: ObjectId;
    companyName: string;
    companyNameKana?: string;
    registrationNumber?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
    fiscalYearEnd?: string;
    invoiceNumberFormat?: string;
    logoUrl?: string;
    sealUrl?: string;
    isDefault?: boolean;
    quoteValidityDays?: number;
    speechSettings?: SpeechSettings;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface BankAccount {
    _id?: ObjectId;
    bankName: string;
    branchName: string;
    accountType: AccountType;
    accountNumber: string;
    accountName: string;
    accountNameKana?: string;
    swiftCode?: string;
    notes?: string;
    isDefault?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Invoice {
    _id?: ObjectId;
    invoiceNumber: string;
    customerId: ObjectId;
    customer?: Customer;
    issueDate: Date;
    dueDate: Date;
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    paymentMethod?: PaymentMethod;
    bankAccountId?: ObjectId;
    bankAccount?: BankAccount;
    status: InvoiceStatus;
    notes?: string;
    internalNotes?: string;
    paidDate?: Date;
    paidAmount?: number;
    convertedToDeliveryNoteId?: ObjectId;
    convertedToDeliveryNoteDate?: Date;
    isGeneratedByAI?: boolean;
    aiGenerationMetadata?: {
        source?: string;
        confidence?: number;
        timestamp?: Date;
    };
    aiConversationId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface InvoiceItem {
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
}
export interface Quote {
    _id?: ObjectId;
    quoteNumber: string;
    customerId: ObjectId;
    customer?: Customer;
    issueDate: Date;
    validityDate: Date;
    items: QuoteItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    paymentMethod?: PaymentMethod;
    bankAccountId?: ObjectId;
    bankAccount?: BankAccount;
    status: QuoteStatus;
    notes?: string;
    internalNotes?: string;
    acceptedDate?: Date;
    rejectedDate?: Date;
    expiredDate?: Date;
    convertedToInvoiceId?: ObjectId;
    convertedToInvoiceDate?: Date;
    isGeneratedByAI?: boolean;
    aiGenerationMetadata?: {
        source?: string;
        confidence?: number;
        timestamp?: Date;
    };
    aiConversationId?: string;
    companySnapshot?: {
        companyName: string;
        address: string;
        phone?: string;
        email?: string;
        invoiceRegistrationNumber?: string;
        stampImage?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export interface QuoteItem {
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
}
export interface DeliveryNote {
    _id?: ObjectId;
    deliveryNoteNumber: string;
    customerId: ObjectId;
    customer?: Customer;
    issueDate: Date;
    deliveryDate: Date;
    items: DeliveryNoteItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    deliveryLocation?: string;
    deliveryMethod?: string;
    status: DeliveryNoteStatus;
    notes?: string;
    internalNotes?: string;
    receivedDate?: Date;
    receivedBy?: string;
    convertedFromQuoteId?: ObjectId;
    convertedFromQuoteDate?: Date;
    convertedFromInvoiceId?: ObjectId;
    convertedFromInvoiceDate?: Date;
    convertedToInvoiceId?: ObjectId;
    convertedToInvoiceDate?: Date;
    isGeneratedByAI?: boolean;
    aiGenerationMetadata?: {
        source?: string;
        confidence?: number;
        timestamp?: Date;
    };
    aiConversationId?: string;
    customerSnapshot?: {
        companyName: string;
        contactName?: string;
        address: string;
        phone?: string;
        email?: string;
    };
    companySnapshot?: {
        companyName: string;
        address: string;
        phone?: string;
        email?: string;
        invoiceRegistrationNumber?: string;
        stampImage?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export interface DeliveryNoteItem {
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
    deliveredQuantity?: number;
}
export interface Product {
    _id?: ObjectId;
    productCode: string;
    productName: string;
    productNameKana?: string;
    description?: string;
    category?: string;
    unitPrice: number;
    taxRate?: number;
    unit?: string;
    isActive?: boolean;
    tags?: string[];
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Document {
    _id?: ObjectId;
    documentNumber: string;
    documentType: 'invoice' | 'receipt' | 'quotation' | 'purchase_order';
    issueDate: Date;
    dueDate?: Date;
    customerId?: ObjectId;
    customerName?: string;
    items: DocumentItem[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: 'draft' | 'sent' | 'paid' | 'cancelled';
    notes?: string;
    attachments?: string[];
    ocrResultId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface DocumentItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
}
export interface OCRResult {
    _id?: ObjectId;
    fileName: string;
    fileUrl?: string;
    gdriveFileId?: string;
    processedAt: Date;
    vendor?: string;
    documentDate?: Date;
    totalAmount?: number;
    taxAmount?: number;
    items?: OCRItem[];
    rawText?: string;
    confidence?: number;
    status: 'pending' | 'processed' | 'failed';
    errorMessage?: string;
    linkedDocumentId?: ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface OCRItem {
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
}
export interface JournalEntry {
    _id?: ObjectId;
    companyId: string;
    journalNumber: string;
    entryDate: Date;
    description: string;
    status: 'draft' | 'confirmed' | 'posted';
    sourceType?: 'manual' | 'ocr' | 'import';
    sourceDocumentId?: ObjectId;
    lines: JournalLine[];
    attachments?: string[];
    notes?: string;
    createdBy?: string;
    approvedBy?: string;
    approvedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface JournalLine {
    accountCode: string;
    accountName: string;
    debitAmount: number;
    creditAmount: number;
    taxRate?: number;
    taxAmount?: number;
    isTaxIncluded?: boolean;
    description?: string;
    departmentCode?: string;
    projectCode?: string;
}
export interface Account {
    _id?: ObjectId;
    accountCode: string;
    accountName: string;
    accountNameKana?: string;
    accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    parentAccountCode?: string;
    level: number;
    isActive?: boolean;
    taxRate?: number;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export type SortableField = 'customerId' | 'companyName' | 'companyNameKana' | 'department' | 'prefecture' | 'city' | 'email' | 'paymentTerms' | 'createdAt' | 'primaryContactName' | 'primaryContactNameKana';
export type ProductSortableField = 'productCode' | 'productName' | 'category' | 'unitPrice' | 'stockQuantity' | 'taxRate' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export interface FilterState {
    isActive?: boolean;
    prefecture?: string;
    city?: string;
    paymentTermsMin?: number;
    paymentTermsMax?: number;
    createdAtStart?: string;
    createdAtEnd?: string;
}
export interface ProductFilterState {
    isActive?: boolean;
    category?: string;
    unitPriceMin?: number;
    unitPriceMax?: number;
    stockQuantityMin?: number;
    stockQuantityMax?: number;
    taxRates?: number[];
    createdAtStart?: string;
    createdAtEnd?: string;
}
export interface Product {
    _id?: ObjectId;
    id?: string;
    productCode: string;
    productName: string;
    productNameKana?: string;
    description?: string;
    category?: string;
    unitPrice: number;
    taxRate?: number;
    unit?: string;
    stockQuantity?: number;
    isActive?: boolean;
    tags?: string[];
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface KnowledgeArticle {
    _id?: ObjectId;
    title: string;
    content: string;
    excerpt?: string;
    sourceUrl: string;
    sourceType: 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'rss' | 'manual';
    sourceId?: string;
    authorName?: string;
    authorUrl?: string;
    publishedDate?: Date;
    scrapedDate: Date;
    tags: string[];
    categories: string[];
    taxonomyTags: {
        taxLaw: string[];
        accountingType: string[];
        businessType: string[];
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        contentType: 'news' | 'guide' | 'case_study' | 'regulation' | 'faq' | 'opinion';
    };
    embeddings?: {
        vector: number[];
        model: string;
        timestamp: Date;
    };
    qualityScore: number;
    isVerified: boolean;
    isActive: boolean;
    metadata: {
        wordCount: number;
        readingTime: number;
        imageCount: number;
        linkCount: number;
        extractedData?: {
            pricing?: string[];
            contacts?: string[];
            regulations?: string[];
            dates?: string[];
        };
    };
    relatedArticles?: ObjectId[];
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    processingLog?: string;
    lastUpdated: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface KnowledgeSource {
    _id?: ObjectId;
    name: string;
    type: 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'rss';
    url: string;
    description?: string;
    isActive: boolean;
    crawlSettings: {
        frequency: 'daily' | 'weekly' | 'monthly';
        maxArticles: number;
        includePatterns?: string[];
        excludePatterns?: string[];
        lastCrawled?: Date;
        nextCrawl?: Date;
    };
    authConfig?: {
        apiKey?: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: Date;
    };
    quality: {
        averageQualityScore: number;
        totalArticles: number;
        successfulCrawls: number;
        failedCrawls: number;
        lastErrorMessage?: string;
    };
    categories: string[];
    tags: string[];
    createdAt?: Date;
    updatedAt?: Date;
}
export interface KnowledgeCategory {
    _id?: ObjectId;
    name: string;
    slug: string;
    description?: string;
    parentId?: ObjectId;
    level: number;
    isActive: boolean;
    icon?: string;
    color?: string;
    sortOrder: number;
    articleCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface KnowledgeEmbedding {
    _id?: ObjectId;
    articleId: ObjectId;
    vector: number[];
    model: string;
    chunkIndex: number;
    chunkContent: string;
    createdAt?: Date;
}
export interface KnowledgeProcessingLog {
    _id?: ObjectId;
    sourceId?: ObjectId;
    articleId?: ObjectId;
    operation: 'crawl' | 'extract' | 'embed' | 'classify' | 'quality_check';
    status: 'started' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    duration?: number;
    input?: any;
    output?: any;
    error?: string;
    metadata?: {
        itemsProcessed?: number;
        itemsSkipped?: number;
        itemsFailed?: number;
        apiCallsUsed?: number;
        creditsUsed?: number;
    };
    createdAt?: Date;
}
export interface AIConversation {
    _id?: ObjectId;
    sessionId: string;
    userId?: string;
    documentType: 'invoice' | 'quote' | 'delivery-note' | 'general' | 'knowledge';
    conversationContext?: {
        knowledgeQuery?: string;
        searchFilters?: {
            categories?: string[];
            tags?: string[];
            dateRange?: {
                start: Date;
                end: Date;
            };
            sources?: string[];
        };
        relevantArticles?: ObjectId[];
    };
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
        metadata?: {
            knowledgeUsed?: {
                articleId: ObjectId;
                relevanceScore: number;
                title: string;
                sourceUrl: string;
            }[];
            processingTime?: number;
            aiModel?: string;
        };
    }[];
    metadata: {
        customerInfo?: any;
        documentData?: any;
        aiModel: 'deepseek' | 'openai';
        knowledgeVersion?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export interface FaqArticle {
    _id?: ObjectId;
    id?: string;
    question: string;
    answer: string;
    category: string;
    subcategory?: string;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    priority: number;
    structuredData: {
        contentType: 'tax' | 'accounting' | 'invoice' | 'compliance' | 'procedure' | 'general';
        taxLaw?: string[];
        applicableBusinessTypes?: string[];
        relatedRegulations?: string[];
        effectiveDate?: Date;
        expirationDate?: Date;
    };
    sourceInfo: {
        chatSessionId?: string;
        chatMessageId?: string;
        originalQuestion?: string;
        generatedBy: 'chat' | 'manual' | 'import';
        generatedAt: Date;
        verifiedBy?: string;
        verifiedAt?: Date;
    };
    qualityMetrics: {
        accuracy: number;
        completeness: number;
        clarity: number;
        usefulness: number;
        overallScore: number;
    };
    usageStats: {
        viewCount: number;
        helpfulVotes: number;
        unhelpfulVotes: number;
        lastViewed?: Date;
        relatedQuestions?: string[];
    };
    status: 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
    isPublished: boolean;
    isFeatured: boolean;
    version: number;
    previousVersions?: string[];
    searchKeywords: string[];
    relatedFaqIds?: string[];
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
}
export interface FaqCategory {
    _id?: ObjectId;
    id?: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    parentCategoryId?: string;
    subcategories?: string[];
    displayOrder: number;
    isVisible: boolean;
    articleCount: number;
    totalViews: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface FaqUsageLog {
    _id?: ObjectId;
    faqId: string;
    action: 'view' | 'helpful' | 'unhelpful' | 'share' | 'copy';
    sessionId?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    searchQuery?: string;
    chatContext?: {
        chatSessionId: string;
        relatedQuestion: string;
    };
    metadata?: {
        feedback?: string;
        rating?: number;
        [key: string]: any;
    };
    timestamp: Date;
}
export interface ChatSession {
    _id?: ObjectId;
    sessionId: string;
    userId?: string;
    title: string;
    messages: ChatMessage[];
    settings: {
        aiModel: 'deepseek' | 'openai';
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
    };
    context: {
        totalTokens: number;
        maxTokensLimit: number;
        summarizedTokens: number;
        summaries: ContextSummary[];
    };
    attachments?: ChatAttachment[];
    status: 'active' | 'archived' | 'deleted';
    isBookmarked: boolean;
    stats: {
        messageCount: number;
        totalResponseTime: number;
        averageResponseTime: number;
        faqGenerated: number;
    };
    metadata: {
        userAgent?: string;
        ipAddress?: string;
        language: string;
        lastActiveAt: Date;
    };
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
}
export interface KnowledgeChatSession extends ChatSession {
    category: 'tax' | 'accounting' | 'journal' | 'mixed';
    specialization?: {
        primaryDomain: string;
        subDomains: string[];
        detectedTopics: string[];
    };
    knowledgeContext?: {
        searchFilters?: {
            categories?: string[];
            tags?: string[];
            sourceTypes?: string[];
            difficulty?: string;
            contentType?: string;
            verifiedOnly?: boolean;
        };
        relevantArticles?: string[];
        faqCandidates?: Array<{
            messageId: string;
            question: string;
            answer: string;
            confidence: number;
            category: string;
        }>;
    };
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    isComplete: boolean;
    attachments?: string[];
    metadata?: {
        model?: string;
        tokens?: {
            prompt: number;
            completion: number;
            total: number;
        };
        responseTime?: number;
        finishReason?: 'stop' | 'length' | 'content_filter';
        knowledgeUsed?: {
            articleIds: string[];
            relevanceScores: number[];
            vectorSearchQuery?: string;
        };
        faqCandidate?: {
            question: string;
            category: string;
            isGenerated: boolean;
            faqId?: string;
        };
    };
    feedback?: {
        rating: 'good' | 'bad';
        comment?: string;
        timestamp: Date;
    };
    error?: {
        message: string;
        code?: string;
        retryCount: number;
    };
}
export interface ContextSummary {
    id: string;
    summaryText: string;
    originalTokenCount: number;
    summaryTokenCount: number;
    compressionRatio: number;
    messageRange: {
        startIndex: number;
        endIndex: number;
        startTimestamp: Date;
        endTimestamp: Date;
    };
    summary_method: 'extractive' | 'abstractive' | 'hierarchical';
    createdAt: Date;
}
export interface ChatAttachment {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedAt: Date;
    processing: {
        status: 'uploading' | 'processing' | 'completed' | 'failed';
        extractedText?: string;
        ocrResults?: string;
        error?: string;
    };
    relatedMessageIds: string[];
}
export interface ChatExportSettings {
    format: 'markdown' | 'pdf' | 'html' | 'json';
    includeMetadata: boolean;
    includeSystemMessages: boolean;
    includeAttachments: boolean;
    dateRange?: {
        start: Date;
        end: Date;
    };
    messageFilter?: {
        roles: ('user' | 'assistant' | 'system')[];
        hasAttachments?: boolean;
        hasFeedback?: boolean;
    };
    styling?: {
        theme: 'light' | 'dark' | 'auto';
        fontSize: number;
        includeTimestamps: boolean;
        includeTokenCounts: boolean;
    };
}
export type SupplierStatus = 'active' | 'inactive' | 'suspended';
export interface Supplier {
    _id?: ObjectId;
    id?: string;
    supplierCode: string;
    companyName: string;
    companyNameKana?: string;
    department?: string;
    postalCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
    paymentTerms?: number;
    paymentMethod?: PaymentMethod;
    bankAccountId?: ObjectId;
    bankAccount?: BankAccount;
    contacts?: Contact[];
    tags?: string[];
    notes?: string;
    status: SupplierStatus;
    creditLimit?: number;
    currentBalance?: number;
    totalPurchaseAmount?: number;
    lastPurchaseDate?: Date;
    evaluationScore?: number;
    bankTransferInfo?: {
        bankName?: string;
        branchName?: string;
        accountType?: string;
        accountNumber?: string;
        accountName?: string;
        swiftCode?: string;
        additionalInfo?: string;
    }[];
    createdAt?: Date;
    updatedAt?: Date;
}
export interface ProductSupplierInfo {
    supplierId: ObjectId;
    supplier?: Supplier;
    supplierProductCode?: string;
    purchasePrice: number;
    minimumOrderQuantity?: number;
    leadTimeDays?: number;
    isPreferred?: boolean;
    notes?: string;
    lastPurchaseDate?: Date;
    lastPurchasePrice?: number;
}
export interface ProductWithSupplierInfo extends Product {
    supplierInfo?: ProductSupplierInfo[];
    costPrice?: number;
    profitMargin?: number;
    profitAmount?: number;
}
export type DealStatus = 'lead' | 'negotiation' | 'quote_sent' | 'won' | 'lost' | 'on_hold';
export interface Deal {
    _id?: ObjectId;
    id?: string;
    dealNumber: string;
    dealName: string;
    customerId: ObjectId;
    customer?: Customer;
    status: DealStatus;
    dealType: 'sale' | 'purchase' | 'both';
    description?: string;
    estimatedValue?: number;
    actualValue?: number;
    profitMargin?: number;
    profitAmount?: number;
    startDate: Date;
    expectedCloseDate?: Date;
    actualCloseDate?: Date;
    relatedQuotes?: ObjectId[];
    relatedInvoices?: ObjectId[];
    relatedPurchaseOrders?: ObjectId[];
    relatedSupplierQuotes?: ObjectId[];
    items?: DealItem[];
    assignedTo?: string;
    assignedToEmail?: string;
    notes?: string;
    activities?: DealActivity[];
    tags?: string[];
    customFields?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface DealItem {
    productId?: ObjectId;
    product?: Product;
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    purchasePrice?: number;
    amount: number;
    cost?: number;
    profitMargin?: number;
    profitAmount?: number;
    supplierId?: ObjectId;
    supplier?: Supplier;
    notes?: string;
}
export interface DealActivity {
    id: string;
    type: 'note' | 'email' | 'call' | 'meeting' | 'quote' | 'invoice' | 'status_change';
    description: string;
    createdBy: string;
    createdAt: Date;
    metadata?: Record<string, any>;
}
export type SupplierQuoteStatus = 'pending' | 'received' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'converted';
export interface SupplierQuote {
    _id?: ObjectId;
    id?: string;
    quoteNumber: string;
    supplierId: ObjectId;
    supplier?: Supplier;
    dealId?: ObjectId;
    deal?: Deal;
    issueDate: Date;
    validityDate: Date;
    items: SupplierQuoteItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    status: SupplierQuoteStatus;
    subject?: string;
    deliveryLocation?: string;
    paymentTerms?: string;
    quotationValidity?: string;
    vendorName?: string;
    vendorAddress?: string;
    vendorPhone?: string;
    vendorEmail?: string;
    vendor?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        fax?: string;
    };
    notes?: string;
    attachments?: string[];
    ocrResultId?: ObjectId;
    fileId?: string;
    convertedToPurchaseOrderId?: ObjectId;
    convertedToPurchaseOrderDate?: Date;
    isGeneratedByAI?: boolean;
    aiGenerationMetadata?: {
        source?: string;
        confidence?: number;
        timestamp?: Date;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export interface SupplierQuoteItem {
    productId?: ObjectId;
    product?: Product;
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
    remarks?: string;
}
export interface PurchaseOrder {
    _id?: ObjectId;
    id?: string;
    purchaseOrderNumber: string;
    supplierId: ObjectId;
    supplier?: Supplier;
    dealId?: ObjectId;
    deal?: Deal;
    issueDate: Date;
    deliveryDate?: Date;
    actualDeliveryDate?: Date;
    items: PurchaseOrderItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'completed' | 'cancelled';
    paymentMethod?: PaymentMethod;
    paymentTerms?: number;
    paymentDueDate?: Date;
    paymentStatus?: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
    paidDate?: Date;
    deliveryLocation?: string;
    deliveryMethod?: string;
    trackingNumber?: string;
    notes?: string;
    internalNotes?: string;
    attachments?: string[];
    relatedSupplierQuoteId?: ObjectId;
    relatedInvoiceIds?: ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}
export interface PurchaseOrderItem {
    productId?: ObjectId;
    product?: Product;
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    receivedQuantity?: number;
    receivedDate?: Date;
    notes?: string;
}
export type PurchaseInvoiceStatus = 'draft' | 'received' | 'approved' | 'paid' | 'overdue' | 'cancelled';
export interface PurchaseInvoice {
    _id?: ObjectId;
    id?: string;
    invoiceNumber: string;
    supplierId: ObjectId;
    supplier?: Supplier;
    purchaseOrderId?: ObjectId;
    purchaseOrder?: PurchaseOrder;
    dealId?: ObjectId;
    deal?: Deal;
    issueDate: Date;
    dueDate: Date;
    receivedDate?: Date;
    items: PurchaseInvoiceItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    totalAmount: number;
    previousBalance?: number;
    currentPayment?: number;
    carryoverAmount?: number;
    currentSales?: number;
    currentInvoiceAmount?: number;
    notes?: string;
    status: PurchaseInvoiceStatus;
    paymentMethod?: PaymentMethod;
    bankAccountId?: ObjectId;
    bankAccount?: BankAccount;
    paymentStatus: 'pending' | 'partial' | 'paid';
    paidAmount?: number;
    paidDate?: Date;
    paymentReference?: string;
    vendorName?: string;
    vendorAddress?: string;
    vendorPhone?: string;
    vendorEmail?: string;
    vendor?: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        fax?: string;
    };
    notes?: string;
    internalNotes?: string;
    attachments?: string[];
    ocrResultId?: ObjectId;
    fileId?: string;
    approvedBy?: string;
    approvedAt?: Date;
    approvalNotes?: string;
    isGeneratedByAI?: boolean;
    aiGenerationMetadata?: {
        source?: string;
        confidence?: number;
        timestamp?: Date;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
export interface PurchaseInvoiceItem {
    productId?: ObjectId;
    product?: Product;
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    purchaseOrderItemId?: ObjectId;
    notes?: string;
    remarks?: string;
}
export interface DashboardProfitData {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate: Date;
    sales: {
        totalAmount: number;
        count: number;
        averageAmount: number;
    };
    purchases: {
        totalAmount: number;
        count: number;
        averageAmount: number;
    };
    profit: {
        totalAmount: number;
        margin: number;
        topProducts: Array<{
            productId: ObjectId;
            productName: string;
            profitAmount: number;
            profitMargin: number;
            salesCount: number;
        }>;
        topCustomers: Array<{
            customerId: ObjectId;
            customerName: string;
            profitAmount: number;
            profitMargin: number;
            dealCount: number;
        }>;
    };
    deals: {
        total: number;
        won: number;
        lost: number;
        inProgress: number;
        winRate: number;
        averageDealSize: number;
    };
}
export type ActivityLogType = 'document_created' | 'document_updated' | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'quote_created' | 'quote_sent' | 'quote_accepted' | 'customer_created' | 'customer_updated' | 'supplier_created' | 'supplier_updated' | 'ocr_completed' | 'ocr_failed' | 'journal_created' | 'journal_updated' | 'system_error' | 'user_action';
export interface ActivityLog extends TimestampedDocument {
    type: ActivityLogType;
    entityType?: 'document' | 'invoice' | 'quote' | 'customer' | 'supplier' | 'journal' | 'system';
    entityId?: ObjectId | string;
    userId?: string;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    severity?: 'low' | 'medium' | 'high';
}
