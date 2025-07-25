"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = exports.db = exports.DatabaseService = exports.mongoClientPromise = exports.getClientPromise = exports.DatabaseError = void 0;
exports.getDatabase = getDatabase;
exports.getCollection = getCollection;
exports.getMongoClient = getMongoClient;
exports.getGridFSBucket = getGridFSBucket;
exports.withTransaction = withTransaction;
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const mongodb_connection_manager_1 = require("./mongodb-connection-manager");
const unified_error_handler_1 = require("./unified-error-handler");
// カスタムエラークラス
class DatabaseError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
// データベース取得
async function getDatabase() {
    try {
        const manager = (0, mongodb_connection_manager_1.getConnectionManager)();
        return await manager.getDb();
    }
    catch (error) {
        logger_1.logger.error('getDatabase error:', error);
        throw new DatabaseError(`Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DATABASE_ACCESS_ERROR');
    }
}
// コレクション取得
async function getCollection(collectionName) {
    try {
        const db = await getDatabase();
        return db.collection(collectionName);
    }
    catch (error) {
        logger_1.logger.error(`getCollection error for ${collectionName}:`, error);
        throw new DatabaseError(`Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'COLLECTION_ACCESS_ERROR');
    }
}
// MongoClient取得（後方互換性）
async function getMongoClient() {
    const manager = (0, mongodb_connection_manager_1.getConnectionManager)();
    return await manager.getClient();
}
exports.getClientPromise = getMongoClient;
exports.mongoClientPromise = (0, exports.getClientPromise)();
// GridFSバケット取得
async function getGridFSBucket() {
    const db = await getDatabase();
    return new mongodb_1.GridFSBucket(db);
}
// トランザクション実行ヘルパー
async function withTransaction(callback) {
    const client = await getMongoClient();
    const session = client.startSession();
    try {
        const result = await session.withTransaction(callback, {
            readPreference: 'primary',
            readConcern: { level: 'local' },
            writeConcern: { w: 'majority' },
        });
        return result;
    }
    finally {
        await session.endSession();
    }
}
// 共通のデータベース操作
class DatabaseService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    /**
     * ドキュメントの作成
     */
    async create(collectionName, document) {
        try {
            const collection = await getCollection(collectionName);
            const now = new Date();
            const docToInsert = {
                ...document,
                createdAt: now,
                updatedAt: now
            };
            const result = await collection.insertOne(docToInsert);
            if (!result.acknowledged) {
                throw new Error('Document insertion not acknowledged');
            }
            return {
                ...docToInsert,
                _id: result.insertedId
            };
        }
        catch (error) {
            logger_1.logger.error(`Create document error in ${collectionName}:`, error);
            if (error instanceof Error && error.message.includes('duplicate key')) {
                throw new unified_error_handler_1.ApiErrorResponse('データが重複しています', 409, 'DUPLICATE_ERROR');
            }
            throw new DatabaseError(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CREATE_ERROR');
        }
    }
    /**
     * ドキュメントの検索（ID）
     */
    async findById(collectionName, id) {
        try {
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            const document = await collection.findOne({ _id: objectId });
            return document;
        }
        catch (error) {
            logger_1.logger.error(`Find by ID error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to find document by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FIND_ERROR');
        }
    }
    /**
     * ドキュメントの検索（条件）
     */
    async findOne(collectionName, filter) {
        try {
            const collection = await getCollection(collectionName);
            const document = await collection.findOne(filter);
            return document;
        }
        catch (error) {
            logger_1.logger.error(`Find one error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to find document: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FIND_ERROR');
        }
    }
    /**
     * ドキュメントの一覧取得
     */
    async find(collectionName, filter = {}, options) {
        try {
            const collection = await getCollection(collectionName);
            let cursor = collection.find(filter);
            if (options?.sort) {
                cursor = cursor.sort(options.sort);
            }
            if (options?.skip) {
                cursor = cursor.skip(options.skip);
            }
            if (options?.limit) {
                cursor = cursor.limit(options.limit);
            }
            if (options?.projection) {
                cursor = cursor.project(options.projection);
            }
            const documents = await cursor.toArray();
            return documents;
        }
        catch (error) {
            logger_1.logger.error(`Find error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to find documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 'FIND_ERROR');
        }
    }
    /**
     * ドキュメントの更新
     */
    async update(collectionName, id, update) {
        try {
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            const updateDoc = {
                ...update,
                updatedAt: new Date()
            };
            const result = await collection.findOneAndUpdate({ _id: objectId }, { $set: updateDoc }, { returnDocument: 'after' });
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Update error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UPDATE_ERROR');
        }
    }
    /**
     * ドキュメントの削除
     */
    async delete(collectionName, id) {
        try {
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            const result = await collection.deleteOne({ _id: objectId });
            return result.deletedCount > 0;
        }
        catch (error) {
            logger_1.logger.error(`Delete error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DELETE_ERROR');
        }
    }
    /**
     * ドキュメント数のカウント
     */
    async count(collectionName, filter = {}) {
        try {
            const collection = await getCollection(collectionName);
            return await collection.countDocuments(filter);
        }
        catch (error) {
            logger_1.logger.error(`Count error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 'COUNT_ERROR');
        }
    }
    /**
     * 集約パイプライン実行
     */
    async aggregate(collectionName, pipeline) {
        try {
            const collection = await getCollection(collectionName);
            const results = await collection.aggregate(pipeline).toArray();
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Aggregate error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to run aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'AGGREGATE_ERROR');
        }
    }
    /**
     * バルク操作
     */
    async bulkWrite(collectionName, operations) {
        try {
            const collection = await getCollection(collectionName);
            return await collection.bulkWrite(operations);
        }
        catch (error) {
            logger_1.logger.error(`Bulk write error in ${collectionName}:`, error);
            throw new DatabaseError(`Failed to perform bulk operation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'BULK_WRITE_ERROR');
        }
    }
}
exports.DatabaseService = DatabaseService;
// シングルトンインスタンスのエクスポート
exports.db = DatabaseService.getInstance();
// コレクション名の定数
exports.Collections = {
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    PRODUCTS: 'products',
    QUOTES: 'quotes',
    INVOICES: 'invoices',
    PURCHASE_INVOICES: 'purchaseInvoices',
    SUPPLIER_QUOTES: 'supplierQuotes',
    DELIVERY_NOTES: 'deliveryNotes',
    DOCUMENTS: 'documents',
    COMPANY_INFO: 'companyInfo',
    BANK_ACCOUNTS: 'bankAccounts',
    JOURNALS: 'journals',
    FAQ_ITEMS: 'faqItems',
    FAQ_VOTES: 'faqVotes',
    AI_CONVERSATIONS: 'aiConversations',
    CHAT_HISTORIES: 'chatHistories',
    KNOWLEDGE_BASE: 'knowledgeBase',
    FILES: 'files',
    OCR_RESULTS: 'ocrResults',
    ACCOUNTS: 'accounts',
    LEARNING_DATA: 'learningData',
    SYSTEM_LOGS: 'systemLogs',
};
