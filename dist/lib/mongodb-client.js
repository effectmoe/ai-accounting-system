"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercelDb = exports.VercelDatabaseService = exports.db = exports.Collections = exports.DatabaseService = exports.mongoClientPromise = exports.DatabaseError = void 0;
exports.getDatabase = getDatabase;
exports.getCollection = getCollection;
exports.getClientPromise = getClientPromise;
exports.getMongoClient = getMongoClient;
exports.getGridFSBucket = getGridFSBucket;
exports.withTransaction = withTransaction;
exports.checkConnection = checkConnection;
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
class DatabaseError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
function getDBName() {
    if (process.env.MONGODB_DB_NAME) {
        const cleanDbName = process.env.MONGODB_DB_NAME.trim();
        logger_1.logger.debug(`[MongoDB] Database name from MONGODB_DB_NAME: "${cleanDbName}"`);
        return cleanDbName;
    }
    const uri = process.env.MONGODB_URI;
    if (uri) {
        try {
            const match = uri.match(/\/([^?\/]+)(\?|$)/);
            if (match && match[1]) {
                const dbName = match[1].trim();
                logger_1.logger.debug(`[MongoDB] Database name extracted from URI: "${dbName}"`);
                return dbName;
            }
        }
        catch (error) {
            logger_1.logger.error('[MongoDB] Failed to parse database name from URI:', error);
        }
    }
    const defaultDb = 'accounting';
    logger_1.logger.debug(`[MongoDB] Using default database name: "${defaultDb}"`);
    return defaultDb;
}
let cached = global._mongoClientPromise;
function getMongoDBUri() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        logger_1.logger.error('Environment variables:', {
            MONGODB_URI: !!process.env.MONGODB_URI,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV
        });
        throw new Error('MONGODB_URI is not defined in environment variables');
    }
    return uri;
}
function sanitizeMongoUri(uri) {
    try {
        const url = new URL(uri);
        if (url.username) {
            url.username = '***';
        }
        if (url.password) {
            url.password = '***';
        }
        return url.toString();
    }
    catch {
        return 'mongodb://***:***@***';
    }
}
async function connectToDatabase() {
    if (cached) {
        try {
            const client = await cached;
            const db = client.db(getDBName());
            await db.admin().ping();
            logger_1.logger.debug('Reusing cached MongoDB connection');
            return { client, db };
        }
        catch (error) {
            logger_1.logger.debug('Cached connection is stale, creating new connection...');
            cached = undefined;
            global._mongoClientPromise = undefined;
        }
    }
    try {
        const uri = getMongoDBUri();
        logger_1.logger.debug('Creating new MongoDB connection...');
        logger_1.logger.debug('MongoDB URI configured:', sanitizeMongoUri(uri));
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        };
        const client = new mongodb_1.MongoClient(uri, options);
        const clientPromise = client.connect();
        cached = global._mongoClientPromise = clientPromise;
        const connectedClient = await clientPromise;
        const db = connectedClient.db(getDBName());
        await db.admin().ping();
        logger_1.logger.debug('MongoDB connection verified with ping');
        return { client: connectedClient, db };
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        logger_1.logger.error('Connection error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        cached = undefined;
        global._mongoClientPromise = undefined;
        throw new DatabaseError(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTION_ERROR');
    }
}
async function getDatabase() {
    try {
        const { db } = await connectToDatabase();
        return db;
    }
    catch (error) {
        logger_1.logger.error('getDatabase error:', error);
        throw new DatabaseError(`Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DATABASE_ACCESS_ERROR');
    }
}
async function getCollection(collectionName) {
    try {
        logger_1.logger.debug(`[getCollection] Attempting to get collection: ${collectionName}`);
        const db = await getDatabase();
        logger_1.logger.debug(`[getCollection] Database obtained successfully`);
        const collection = db.collection(collectionName);
        logger_1.logger.debug(`[getCollection] Collection reference created for: ${collectionName}`);
        try {
            const count = await collection.estimatedDocumentCount();
            logger_1.logger.debug(`[getCollection] Collection ${collectionName} is accessible. Estimated count: ${count}`);
            return collection;
        }
        catch (error) {
            logger_1.logger.error(`[getCollection] Collection ${collectionName} test failed:`, error);
            logger_1.logger.error(`[getCollection] Error type: ${error?.constructor?.name}`);
            cached = undefined;
            global._mongoClientPromise = undefined;
            logger_1.logger.debug(`[getCollection] Connection cache cleared, attempting retry...`);
            const retryDb = await getDatabase();
            const retryCollection = retryDb.collection(collectionName);
            logger_1.logger.debug(`[getCollection] Retry successful for collection: ${collectionName}`);
            return retryCollection;
        }
    }
    catch (error) {
        logger_1.logger.error(`[getCollection] Fatal error for ${collectionName}:`, error);
        logger_1.logger.error(`[getCollection] Error details:`, {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            type: typeof error,
            constructor: error?.constructor?.name
        });
        throw new DatabaseError(`Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'COLLECTION_ACCESS_ERROR');
    }
}
async function getClientPromise() {
    const { client } = await connectToDatabase();
    return client;
}
async function getMongoClient() {
    const { client } = await connectToDatabase();
    return client;
}
exports.mongoClientPromise = getClientPromise();
async function getGridFSBucket() {
    const { db } = await connectToDatabase();
    const bucket = new mongodb_1.GridFSBucket(db);
    return bucket;
}
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
class DatabaseService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async create(collectionName, document) {
        try {
            logger_1.logger.debug(`===== [DatabaseService] Create Operation Debug START (${collectionName}) =====`);
            logger_1.logger.debug('[1] Document to create:', JSON.stringify(document, null, 2));
            const collection = await getCollection(collectionName);
            const now = new Date();
            const doc = {
                ...document,
                createdAt: now,
                updatedAt: now,
            };
            logger_1.logger.debug('[2] Document with timestamps:', JSON.stringify(doc, null, 2));
            const result = await collection.insertOne(doc);
            const createdDoc = { ...doc, _id: result.insertedId };
            logger_1.logger.debug('[3] Created document result:', JSON.stringify({
                _id: result.insertedId,
                ...doc
            }, null, 2));
            logger_1.logger.debug(`===== [DatabaseService] Create Operation Debug END (${collectionName}) =====`);
            return createdDoc;
        }
        catch (error) {
            logger_1.logger.error(`MongoDB create error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CREATE_ERROR');
        }
    }
    async findById(collectionName, id) {
        try {
            logger_1.logger.debug(`[MongoDB] findById called for collection: ${collectionName}, id: ${id}`);
            logger_1.logger.debug(`[MongoDB] ID type: ${typeof id}, length: ${id?.toString()?.length}`);
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            logger_1.logger.debug(`[MongoDB] Converted ObjectId: ${objectId}`);
            const result = await collection.findOne({ _id: objectId });
            logger_1.logger.debug(`[MongoDB] findById result: ${result ? 'found' : 'not found'}`);
            if (result) {
                logger_1.logger.debug(`[MongoDB] Found document with _id: ${result._id}`);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error(`[MongoDB] findById error for ${collectionName}:`, error);
            if (error instanceof Error && error.message.includes('invalid ObjectId')) {
                logger_1.logger.error(`[MongoDB] Invalid ObjectId format: ${id}`);
            }
            throw error;
        }
    }
    async find(collectionName, filter = {}, options) {
        try {
            logger_1.logger.debug(`[DatabaseService.find] Starting find operation for collection: ${collectionName}`);
            logger_1.logger.debug(`[DatabaseService.find] Filter:`, JSON.stringify(filter));
            logger_1.logger.debug(`[DatabaseService.find] Options:`, JSON.stringify(options));
            const collection = await getCollection(collectionName);
            logger_1.logger.debug(`[DatabaseService.find] Collection obtained successfully`);
            let query = collection.find(filter);
            if (options?.sort) {
                query = query.sort(options.sort);
                logger_1.logger.debug(`[DatabaseService.find] Sort applied:`, options.sort);
            }
            if (options?.skip) {
                query = query.skip(options.skip);
                logger_1.logger.debug(`[DatabaseService.find] Skip applied:`, options.skip);
            }
            if (options?.limit) {
                query = query.limit(options.limit);
                logger_1.logger.debug(`[DatabaseService.find] Limit applied:`, options.limit);
            }
            if (options?.projection) {
                query = query.project(options.projection);
                logger_1.logger.debug(`[DatabaseService.find] Projection applied:`, options.projection);
            }
            logger_1.logger.debug(`[DatabaseService.find] Executing query...`);
            const results = await query.toArray();
            logger_1.logger.debug(`[DatabaseService.find] Query executed successfully. Results count: ${results.length}`);
            return results;
        }
        catch (error) {
            logger_1.logger.error(`[DatabaseService.find] Error in find operation for ${collectionName}:`, error);
            logger_1.logger.error(`[DatabaseService.find] Error details:`, {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw error;
        }
    }
    async update(collectionName, id, update) {
        try {
            const collection = await getCollection(collectionName);
            const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
            const { _id, ...updateData } = update;
            logger_1.logger.debug(`Updating document in ${collectionName} with ID: ${objectId}`);
            logger_1.logger.debug('Update data keys:', Object.keys(updateData));
            const result = await collection.findOneAndUpdate({ _id: objectId }, {
                $set: {
                    ...updateData,
                    updatedAt: new Date(),
                },
            }, { returnDocument: 'after' });
            logger_1.logger.debug(`[MongoDB] findOneAndUpdate raw result:`, result);
            logger_1.logger.debug(`[MongoDB] findOneAndUpdate result type:`, typeof result);
            logger_1.logger.debug(`[MongoDB] findOneAndUpdate result keys:`, result ? Object.keys(result) : 'null');
            if (!result) {
                logger_1.logger.error(`No document found with ID ${objectId} in collection ${collectionName}`);
                return null;
            }
            logger_1.logger.debug(`Document updated successfully in ${collectionName}`);
            logger_1.logger.debug(`Updated document ID: ${result._id?.toString()}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`MongoDB update error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to update document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UPDATE_ERROR');
        }
    }
    async delete(collectionName, id) {
        const collection = await getCollection(collectionName);
        const objectId = typeof id === 'string' ? new mongodb_1.ObjectId(id) : id;
        const result = await collection.deleteOne({ _id: objectId });
        return result.deletedCount > 0;
    }
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
    async count(collectionName, filter = {}) {
        try {
            logger_1.logger.debug(`[DatabaseService.count] Starting count operation for collection: ${collectionName}`);
            logger_1.logger.debug(`[DatabaseService.count] Filter:`, JSON.stringify(filter));
            const collection = await getCollection(collectionName);
            logger_1.logger.debug(`[DatabaseService.count] Collection obtained successfully`);
            const count = await collection.countDocuments(filter);
            logger_1.logger.debug(`[DatabaseService.count] Count result: ${count}`);
            return count;
        }
        catch (error) {
            logger_1.logger.error(`[DatabaseService.count] Error in count operation for ${collectionName}:`, error);
            throw error;
        }
    }
    async aggregate(collectionName, pipeline) {
        const collection = await getCollection(collectionName);
        return await collection.aggregate(pipeline).toArray();
    }
    async createIndex(collectionName, indexSpec, options) {
        const collection = await getCollection(collectionName);
        return await collection.createIndex(indexSpec, options);
    }
    async search(collectionName, searchText, filter = {}, options) {
        const collection = await getCollection(collectionName);
        const searchFilter = {
            ...filter,
            $text: { $search: searchText },
        };
        return await collection.find(searchFilter, options).toArray();
    }
    async deleteMany(collectionName, filter = {}) {
        const collection = await getCollection(collectionName);
        const result = await collection.deleteMany(filter);
        return result.deletedCount;
    }
    async findMany(collectionName, filter = {}, options) {
        return this.find(collectionName, filter, options);
    }
    async updateMany(collectionName, filter, update) {
        try {
            const collection = await getCollection(collectionName);
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
            logger_1.logger.error(`MongoDB updateMany error in collection ${collectionName}:`, error);
            throw new DatabaseError(`Failed to update documents in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'UPDATE_MANY_ERROR');
        }
    }
    async findOne(collectionName, filter = {}, options) {
        const collection = await getCollection(collectionName);
        return await collection.findOne(filter, options);
    }
}
exports.DatabaseService = DatabaseService;
async function checkConnection() {
    try {
        logger_1.logger.debug('MongoDB connection check...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            logger_1.logger.error('MONGODB_URI is not defined!');
            return false;
        }
        const { db } = await connectToDatabase();
        await db.command({ ping: 1 });
        logger_1.logger.debug('MongoDB connection successful');
        return true;
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection check failed:', error);
        if (error instanceof Error) {
            logger_1.logger.error('Error details:', {
                name: error.name,
                message: error.message
            });
        }
        cached = undefined;
        global._mongoClientPromise = undefined;
        return false;
    }
}
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
    CUSTOMERS: 'customers',
    COMPANY_INFO: 'companyInfo',
    BANK_ACCOUNTS: 'bankAccounts',
    PRODUCTS: 'products',
    QUOTES: 'quotes',
    SUPPLIERS: 'suppliers',
    SUPPLIER_QUOTES: 'supplierQuotes',
    PURCHASE_ORDERS: 'purchaseOrders',
};
exports.db = DatabaseService.getInstance();
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
            logger_1.logger.debug(`Document created successfully in ${collectionName} with ID: ${result.insertedId}`);
            return { ...doc, _id: result.insertedId };
        }
        catch (error) {
            logger_1.logger.error(`MongoDB create error in collection ${collectionName}:`, error);
            if (error instanceof Error &&
                (error.message.includes('connection') ||
                    error.message.includes('client') ||
                    error.message.includes('topology'))) {
                logger_1.logger.debug('Clearing MongoDB connection cache due to connection error');
                cached = undefined;
                global._mongoClientPromise = undefined;
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
exports.vercelDb = VercelDatabaseService.getInstance();
const clientPromise = (async () => {
    const database = await getDatabase();
    return database.client;
})();
exports.default = clientPromise;
//# sourceMappingURL=mongodb-client.js.map