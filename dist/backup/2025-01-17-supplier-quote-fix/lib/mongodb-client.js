"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercelDb = exports.VercelDatabaseService = exports.db = exports.Collections = exports.DatabaseService = exports.mongoClientPromise = exports.DatabaseError = void 0;
exports.getDatabase = getDatabase;
exports.getCollection = getCollection;
exports.getClientPromise = getClientPromise;
exports.getMongoClient = getMongoClient;
exports.withTransaction = withTransaction;
exports.checkConnection = checkConnection;
const mongodb_1 = require("mongodb");
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
// MongoDB接続設定
const DB_NAME = 'accounting';
// Vercelサーバーレス環境用のキャッシュ変数
let cached = global._mongoClientPromise;
// MongoDB URIを動的に取得する関数
function getMongoDBUri() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Environment variables:', {
            MONGODB_URI: !!process.env.MONGODB_URI,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV
        });
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    return uri;
}
// Vercel推奨のMongoDB接続パターン
async function connectToDatabase() {
    if (cached) {
        try {
            const client = await cached;
            const db = client.db(DB_NAME);
            // 接続が生きているか確認
            await db.admin().ping();
            console.log('Reusing cached MongoDB connection');
            return { client, db };
        }
        catch (error) {
            console.log('Cached connection is stale, creating new connection...');
            cached = undefined;
            global._mongoClientPromise = undefined;
        }
    }
    try {
        const uri = getMongoDBUri();
        console.log('Creating new MongoDB connection...');
        console.log('MongoDB URI configured:', uri.replace(/\/\/[^:]*:[^@]*@/, '//***:***@')); // パスワードを隠してログ出力
        // Vercel推奨の接続オプション
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
        const client = new mongodb_1.MongoClient(uri, options);
        const clientPromise = client.connect();
        // グローバルにキャッシュ
        cached = global._mongoClientPromise = clientPromise;
        const connectedClient = await clientPromise;
        const db = connectedClient.db(DB_NAME);
        // 接続を確認
        await db.admin().ping();
        console.log('MongoDB connection verified with ping');
        return { client: connectedClient, db };
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        console.error('Connection error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        // キャッシュをクリア
        cached = undefined;
        global._mongoClientPromise = undefined;
        throw new DatabaseError(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_ERROR');
    }
}
// データベースインスタンスの取得（シンプル化）
async function getDatabase() {
    try {
        const { db } = await connectToDatabase();
        return db;
    }
    catch (error) {
        console.error('getDatabase error:', error);
        throw new DatabaseError(`Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DATABASE_ACCESS_ERROR');
    }
}
// コレクションの取得（シンプル化）
async function getCollection(collectionName) {
    try {
        const db = await getDatabase();
        const collection = db.collection(collectionName);
        // コレクションが実際に使用可能か確認
        try {
            await collection.estimatedDocumentCount();
            return collection;
        }
        catch (error) {
            console.error(`Collection ${collectionName} test failed:`, error);
            // 接続をリセット
            cached = undefined;
            global._mongoClientPromise = undefined;
            // 再試行
            const retryDb = await getDatabase();
            return retryDb.collection(collectionName);
        }
    }
    catch (error) {
        console.error(`getCollection error for ${collectionName}:`, error);
        throw new DatabaseError(`Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'COLLECTION_ACCESS_ERROR');
    }
}
// MongoClientのエクスポート（Vercel対応）
async function getClientPromise() {
    const { client } = await connectToDatabase();
    return client;
}
// 後方互換性のためのgetMongoClient関数
async function getMongoClient() {
    const { client } = await connectToDatabase();
    return client;
}
// シングルトンのクライアントプロミス（名前付きエクスポート）
exports.mongoClientPromise = getClientPromise();
// トランザクション実行ヘルパー
async function withTransaction(callback) {
    const { client } = await connectToDatabase();
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
            const doc = {
                ...document,
                createdAt: now,
                updatedAt: now,
            };
            const result = await collection.insertOne(doc);
            return { ...doc, _id: result.insertedId };
        }
        catch (error) {
            console.error(`MongoDB create error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CREATE_ERROR');
        }
    }
    /**
     * ドキュメントの取得
     */
    async findById(collectionName, id) {
        try {
            console.log(`[MongoDB] findById called for collection: ${collectionName}, id: ${id}`);
            console.log(`[MongoDB] ID type: ${typeof id}, length: ${id?.toString()?.length}`);
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            console.log(`[MongoDB] Converted ObjectId: ${objectId}`);
            const result = await collection.findOne({ _id: objectId });
            console.log(`[MongoDB] findById result: ${result ? 'found' : 'not found'}`);
            if (result) {
                console.log(`[MongoDB] Found document with _id: ${result._id}`);
            }
            return result;
        }
        catch (error) {
            console.error(`[MongoDB] findById error for ${collectionName}:`, error);
            if (error instanceof Error && error.message.includes('invalid ObjectId')) {
                console.error(`[MongoDB] Invalid ObjectId format: ${id}`);
            }
            throw error;
        }
    }
    /**
     * ドキュメントの検索
     */
    async find(collectionName, filter = {}, options) {
        const collection = await getCollection(collectionName);
        let query = collection.find(filter);
        if (options?.sort)
            query = query.sort(options.sort);
        if (options?.skip)
            query = query.skip(options.skip);
        if (options?.limit)
            query = query.limit(options.limit);
        if (options?.projection)
            query = query.project(options.projection);
        return await query.toArray();
    }
    /**
     * ドキュメントの更新
     */
    async update(collectionName, id, update) {
        try {
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            // _idフィールドを除外
            const { _id, ...updateData } = update;
            console.log(`Updating document in ${collectionName} with ID: ${objectId}`);
            console.log('Update data keys:', Object.keys(updateData));
            const result = await collection.findOneAndUpdate({ _id: objectId }, {
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            }, { returnDocument: 'after' });
            console.log(`[MongoDB] findOneAndUpdate raw result:`, result);
            console.log(`[MongoDB] findOneAndUpdate result type:`, typeof result);
            console.log(`[MongoDB] findOneAndUpdate result keys:`, result ? Object.keys(result) : 'null');
            // MongoDB driver v6では、結果が直接ドキュメントを返す
            if (!result) {
                console.error(`No document found with ID ${objectId} in collection ${collectionName}`);
                return null;
            }
            console.log(`Document updated successfully in ${collectionName}`);
            console.log(`Updated document ID: ${result._id?.toString()}`);
            return result;
        }
        catch (error) {
            console.error(`MongoDB update error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to update document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UPDATE_ERROR');
        }
    }
    /**
     * ドキュメントの削除
     */
    async delete(collectionName, id) {
        const collection = await getCollection(collectionName);
        const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
        const result = await collection.deleteOne({ _id: objectId });
        return result.deletedCount > 0;
    }
    /**
     * 一括挿入
     */
    async bulkInsert(collectionName, documents) {
        const collection = await getCollection(collectionName);
        const now = new Date();
        const docs = documents.map(doc => ({
            ...doc,
            createdAt: now,
            updatedAt: now,
        }));
        const result = await collection.insertMany(docs);
        return docs.map((doc, index) => ({
            ...doc,
            _id: result.insertedIds[index],
        }));
    }
    /**
     * カウント
     */
    async count(collectionName, filter = {}) {
        const collection = await getCollection(collectionName);
        return await collection.countDocuments(filter);
    }
    /**
     * 集計
     */
    async aggregate(collectionName, pipeline) {
        const collection = await getCollection(collectionName);
        return await collection.aggregate(pipeline).toArray();
    }
    /**
     * インデックスの作成
     */
    async createIndex(collectionName, indexSpec, options) {
        const collection = await getCollection(collectionName);
        return await collection.createIndex(indexSpec, options);
    }
    /**
     * テキスト検索
     */
    async search(collectionName, searchText, filter = {}, options) {
        const collection = await getCollection(collectionName);
        const searchFilter = {
            ...filter,
            $text: { $search: searchText },
        };
        return await collection.find(searchFilter, options).toArray();
    }
    /**
     * 複数ドキュメントの削除
     */
    async deleteMany(collectionName, filter = {}) {
        const collection = await getCollection(collectionName);
        const result = await collection.deleteMany(filter);
        return result.deletedCount;
    }
    /**
     * 複数ドキュメントの検索（エイリアス）
     */
    async findMany(collectionName, filter = {}, options) {
        return this.find(collectionName, filter, options);
    }
    /**
     * 複数ドキュメントの更新
     */
    async updateMany(collectionName, filter, update) {
        try {
            const collection = await getCollection(collectionName);
            // _idフィールドを除外
            const { _id, ...updateData } = update;
            const result = await collection.updateMany(filter, {
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            });
            return result.modifiedCount;
        }
        catch (error) {
            console.error(`MongoDB updateMany error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to update documents in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UPDATE_MANY_ERROR');
        }
    }
    /**
     * 単一ドキュメントの検索
     */
    async findOne(collectionName, filter = {}, options) {
        const collection = await getCollection(collectionName);
        return await collection.findOne(filter, options);
    }
}
exports.DatabaseService = DatabaseService;
// ヘルスチェック（シンプル化）
async function checkConnection() {
    try {
        console.log('MongoDB connection check...');
        // 環境変数を確認
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('MONGODB_URI is not defined!');
            return false;
        }
        const { db } = await connectToDatabase();
        await db.command({ ping: 1 });
        console.log('MongoDB connection successful');
        return true;
    }
    catch (error) {
        console.error('MongoDB connection check failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message
            });
        }
        // キャッシュをクリア
        cached = undefined;
        global._mongoClientPromise = undefined;
        return false;
    }
}
// コレクション名の定数
exports.Collections = {
    INVOICES: 'invoices',
    RECEIPTS: 'receipts',
    DOCUMENTS: 'documents',
    COMPANIES: 'companies',
    ACCOUNTS: 'accounts',
    TRANSACTIONS: 'transactions',
    JOURNAL_ENTRIES: 'journal_entries',
    JOURNAL_ENTRY_LINES: 'journal_entry_lines',
    PARTNERS: 'partners',
    AUDIT_LOGS: 'audit_logs',
    OCR_RESULTS: 'ocr_results',
    IMPORT_BATCHES: 'import_batches',
    ITEMS: 'items',
    TAGS: 'tags',
    // 新規追加
    CUSTOMERS: 'customers',
    COMPANY_INFO: 'companyInfo',
    BANK_ACCOUNTS: 'bankAccounts',
    PRODUCTS: 'products',
    QUOTES: 'quotes',
    SUPPLIERS: 'suppliers',
    SUPPLIER_QUOTES: 'supplierQuotes',
    PURCHASE_ORDERS: 'purchaseOrders',
};
// データベースサービスのシングルトンインスタンス
exports.db = DatabaseService.getInstance();
// Vercel環境対応のDatabaseServiceラッパー
class VercelDatabaseService extends DatabaseService {
    static instance;
    constructor() {
        super();
    }
    static getInstance() {
        if (!VercelDatabaseService.instance) {
            VercelDatabaseService.instance = new VercelDatabaseService();
        }
        return VercelDatabaseService.instance;
    }
    // createメソッド（シンプル化）
    async create(collectionName, document) {
        try {
            const collection = await getCollection(collectionName);
            const now = new Date();
            const doc = {
                ...document,
                createdAt: now,
                updatedAt: now,
            };
            const result = await collection.insertOne(doc);
            if (!result || !result.insertedId) {
                throw new Error('Insert operation failed - no inserted ID returned');
            }
            console.log(`Document created successfully in ${collectionName} with ID: ${result.insertedId}`);
            return { ...doc, _id: result.insertedId };
        }
        catch (error) {
            console.error(`MongoDB create error in collection ${collectionName}:`, error);
            // 接続エラーの場合はキャッシュをクリアして再試行
            if (error instanceof Error &&
                (error.message.includes('connection') ||
                    error.message.includes('client') ||
                    error.message.includes('topology'))) {
                console.log('Clearing MongoDB connection cache due to connection error');
                cached = undefined;
                global._mongoClientPromise = undefined;
                // 一度だけ再試行
                try {
                    const collection = await getCollection(collectionName);
                    const now = new Date();
                    const doc = {
                        ...document,
                        createdAt: now,
                        updatedAt: now,
                    };
                    const result = await collection.insertOne(doc);
                    return { ...doc, _id: result.insertedId };
                }
                catch (retryError) {
                    throw new DatabaseError(`Failed to create document in ${collectionName} after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`, 'CREATE_ERROR');
                }
            }
            throw new DatabaseError(`Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CREATE_ERROR');
        }
    }
}
exports.VercelDatabaseService = VercelDatabaseService;
// Vercel環境用のエクスポート
exports.vercelDb = VercelDatabaseService.getInstance();
// clientPromiseのデフォルトエクスポート（後方互換性のため）
const clientPromise = (async () => {
    const database = await getDatabase();
    return database.client;
})();
exports.default = clientPromise;
