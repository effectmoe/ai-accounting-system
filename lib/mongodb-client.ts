import { MongoClient, Db, Collection, ObjectId, GridFSBucket } from 'mongodb';

import { logger } from '@/lib/logger';
// カスタムエラークラス
export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// MongoDB接続設定 - 環境変数から取得するように変更
function getDBName(): string {
  const dbName = process.env.MONGODB_DB_NAME || 'accounting';
  // 改行文字やスペースを除去
  const cleanDbName = dbName.trim();
  logger.debug(`[MongoDB] Database name: "${cleanDbName}" (original: "${dbName}")`);
  return cleanDbName;
}

// グローバル変数の宣言（Vercel推奨パターン）
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Vercelサーバーレス環境用のキャッシュ変数
let cached = global._mongoClientPromise;

// MongoDB URIを動的に取得する関数
function getMongoDBUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('Environment variables:', {
      MONGODB_URI: !!process.env.MONGODB_URI,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    });
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  return uri;
}

// MongoDB URIから機密情報をマスクする関数
function sanitizeMongoUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.username) {
      url.username = '***';
    }
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    // URLのパースに失敗した場合は、安全のため全体をマスク
    return 'mongodb://***:***@***';
  }
}

// Vercel推奨のMongoDB接続パターン
async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached) {
    try {
      const client = await cached;
      const db = client.db(getDBName());
      
      // 接続が生きているか確認
      await db.admin().ping();
      logger.debug('Reusing cached MongoDB connection');
      return { client, db };
    } catch (error) {
      logger.debug('Cached connection is stale, creating new connection...');
      cached = undefined;
      global._mongoClientPromise = undefined;
    }
  }

  try {
    const uri = getMongoDBUri();
    
    logger.debug('Creating new MongoDB connection...');
    logger.debug('MongoDB URI configured:', sanitizeMongoUri(uri)); // パスワードを隠してログ出力
    
    // Vercel推奨の接続オプション
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    const client = new MongoClient(uri, options);
    const clientPromise = client.connect();
    
    // グローバルにキャッシュ
    cached = global._mongoClientPromise = clientPromise;
    
    const connectedClient = await clientPromise;
    const db = connectedClient.db(getDBName());
    
    // 接続を確認
    await db.admin().ping();
    logger.debug('MongoDB connection verified with ping');
    
    return { client: connectedClient, db };
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.error('Connection error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // キャッシュをクリア
    cached = undefined;
    global._mongoClientPromise = undefined;
    
    throw new DatabaseError(
      `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CONNECTION_ERROR'
    );
  }
}

// データベースインスタンスの取得（シンプル化）
export async function getDatabase(): Promise<Db> {
  try {
    const { db } = await connectToDatabase();
    return db;
  } catch (error) {
    logger.error('getDatabase error:', error);
    throw new DatabaseError(
      `Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DATABASE_ACCESS_ERROR'
    );
  }
}

// コレクションの取得（シンプル化）
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  try {
    const db = await getDatabase();
    const collection = db.collection<T>(collectionName);
    
    // コレクションが実際に使用可能か確認
    try {
      await collection.estimatedDocumentCount();
      return collection;
    } catch (error) {
      logger.error(`Collection ${collectionName} test failed:`, error);
      // 接続をリセット
      cached = undefined;
      global._mongoClientPromise = undefined;
      
      // 再試行
      const retryDb = await getDatabase();
      return retryDb.collection<T>(collectionName);
    }
  } catch (error) {
    logger.error(`getCollection error for ${collectionName}:`, error);
    throw new DatabaseError(
      `Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'COLLECTION_ACCESS_ERROR'
    );
  }
}

// MongoClientのエクスポート（Vercel対応）
export async function getClientPromise(): Promise<MongoClient> {
  const { client } = await connectToDatabase();
  return client;
}

// 後方互換性のためのgetMongoClient関数
export async function getMongoClient(): Promise<MongoClient> {
  const { client } = await connectToDatabase();
  return client;
}

// シングルトンのクライアントプロミス（名前付きエクスポート）
export const mongoClientPromise = getClientPromise();

// GridFSバケットを取得
export async function getGridFSBucket(): Promise<any> {
  const { db } = await connectToDatabase();
  const bucket = new GridFSBucket(db);
  return bucket;
}

// トランザクション実行ヘルパー
export async function withTransaction<T>(
  callback: (session: any) => Promise<T>
): Promise<T> {
  const { client } = await connectToDatabase();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(callback, {
      readPreference: 'primary',
      readConcern: { level: 'local' },
      writeConcern: { w: 'majority' },
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// 共通のデータベース操作
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * ドキュメントの作成
   */
  async create<T>(collectionName: string, document: Omit<T, '_id'>): Promise<T> {
    try {
      logger.debug(`===== [DatabaseService] Create Operation Debug START (${collectionName}) =====`);
      logger.debug('[1] Document to create:', JSON.stringify(document, null, 2));
      
      const collection = await getCollection<T>(collectionName);
      const now = new Date();
      const doc = {
        ...document,
        createdAt: now,
        updatedAt: now,
      };
      
      logger.debug('[2] Document with timestamps:', JSON.stringify(doc, null, 2));
      
      const result = await collection.insertOne(doc as any);
      const createdDoc = { ...doc, _id: result.insertedId } as T;
      
      logger.debug('[3] Created document result:', JSON.stringify({
        _id: result.insertedId,
        ...doc
      }, null, 2));
      
      logger.debug(`===== [DatabaseService] Create Operation Debug END (${collectionName}) =====`);
      
      return createdDoc;
    } catch (error) {
      logger.error(`MongoDB create error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_ERROR'
      );
    }
  }

  /**
   * ドキュメントの取得
   */
  async findById<T>(collectionName: string, id: string | ObjectId): Promise<T | null> {
    try {
      logger.debug(`[MongoDB] findById called for collection: ${collectionName}, id: ${id}`);
      logger.debug(`[MongoDB] ID type: ${typeof id}, length: ${id?.toString()?.length}`);
      
      const collection = await getCollection<T>(collectionName);
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      logger.debug(`[MongoDB] Converted ObjectId: ${objectId}`);
      
      const result = await collection.findOne({ _id: objectId } as any);
      
      logger.debug(`[MongoDB] findById result: ${result ? 'found' : 'not found'}`);
      if (result) {
        logger.debug(`[MongoDB] Found document with _id: ${result._id}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`[MongoDB] findById error for ${collectionName}:`, error);
      if (error instanceof Error && error.message.includes('invalid ObjectId')) {
        logger.error(`[MongoDB] Invalid ObjectId format: ${id}`);
      }
      throw error;
    }
  }

  /**
   * ドキュメントの検索
   */
  async find<T>(
    collectionName: string,
    filter: any = {},
    options?: {
      sort?: any;
      limit?: number;
      skip?: number;
      projection?: any;
    }
  ): Promise<T[]> {
    const collection = await getCollection<T>(collectionName);
    let query = collection.find(filter);

    if (options?.sort) query = query.sort(options.sort);
    if (options?.skip) query = query.skip(options.skip);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.projection) query = query.project(options.projection);

    return await query.toArray();
  }

  /**
   * ドキュメントの更新
   */
  async update<T>(
    collectionName: string,
    id: string | ObjectId,
    update: Partial<T>
  ): Promise<T | null> {
    try {
      const collection = await getCollection<T>(collectionName);
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      // _idフィールドを除外
      const { _id, ...updateData } = update as any;
      
      logger.debug(`Updating document in ${collectionName} with ID: ${objectId}`);
      logger.debug('Update data keys:', Object.keys(updateData));
      
      const result = await collection.findOneAndUpdate(
        { _id: objectId } as any,
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      logger.debug(`[MongoDB] findOneAndUpdate raw result:`, result);
      logger.debug(`[MongoDB] findOneAndUpdate result type:`, typeof result);
      logger.debug(`[MongoDB] findOneAndUpdate result keys:`, result ? Object.keys(result) : 'null');

      // MongoDB driver v6では、結果が直接ドキュメントを返す
      if (!result) {
        logger.error(`No document found with ID ${objectId} in collection ${collectionName}`);
        return null;
      }

      logger.debug(`Document updated successfully in ${collectionName}`);
      logger.debug(`Updated document ID: ${result._id?.toString()}`);
      return result;
    } catch (error) {
      logger.error(`MongoDB update error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to update document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR'
      );
    }
  }

  /**
   * ドキュメントの削除
   */
  async delete(collectionName: string, id: string | ObjectId): Promise<boolean> {
    const collection = await getCollection(collectionName);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  /**
   * 一括挿入
   */
  async bulkInsert<T>(collectionName: string, documents: Omit<T, '_id'>[]): Promise<T[]> {
    const collection = await getCollection<T>(collectionName);
    const now = new Date();
    const docs = documents.map(doc => ({
      ...doc,
      createdAt: now,
      updatedAt: now,
    }));
    const result = await collection.insertMany(docs as any);
    return docs.map((doc, index) => ({
      ...doc,
      _id: result.insertedIds[index],
    })) as T[];
  }

  /**
   * カウント
   */
  async count(collectionName: string, filter: any = {}): Promise<number> {
    const collection = await getCollection(collectionName);
    return await collection.countDocuments(filter);
  }

  /**
   * 集計
   */
  async aggregate<T>(collectionName: string, pipeline: any[]): Promise<T[]> {
    const collection = await getCollection(collectionName);
    return await collection.aggregate<T>(pipeline).toArray();
  }

  /**
   * インデックスの作成
   */
  async createIndex(
    collectionName: string,
    indexSpec: any,
    options?: any
  ): Promise<string> {
    const collection = await getCollection(collectionName);
    return await collection.createIndex(indexSpec, options);
  }

  /**
   * テキスト検索
   */
  async search<T>(
    collectionName: string,
    searchText: string,
    filter: any = {},
    options?: any
  ): Promise<T[]> {
    const collection = await getCollection<T>(collectionName);
    const searchFilter = {
      ...filter,
      $text: { $search: searchText },
    };
    return await collection.find(searchFilter, options).toArray();
  }

  /**
   * 複数ドキュメントの削除
   */
  async deleteMany(collectionName: string, filter: any = {}): Promise<number> {
    const collection = await getCollection(collectionName);
    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * 複数ドキュメントの検索（エイリアス）
   */
  async findMany<T>(
    collectionName: string,
    filter: any = {},
    options?: {
      sort?: any;
      limit?: number;
      skip?: number;
      projection?: any;
    }
  ): Promise<T[]> {
    return this.find<T>(collectionName, filter, options);
  }

  /**
   * 複数ドキュメントの更新
   */
  async updateMany<T>(
    collectionName: string,
    filter: any,
    update: Partial<T>
  ): Promise<number> {
    try {
      const collection = await getCollection<T>(collectionName);
      
      // _idフィールドを除外
      const { _id, ...updateData } = update as any;
      
      const result = await collection.updateMany(
        filter,
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );

      return result.modifiedCount;
    } catch (error) {
      logger.error(`MongoDB updateMany error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to update documents in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_MANY_ERROR'
      );
    }
  }

  /**
   * 単一ドキュメントの検索
   */
  async findOne<T>(
    collectionName: string,
    filter: any = {},
    options?: any
  ): Promise<T | null> {
    const collection = await getCollection<T>(collectionName);
    return await collection.findOne(filter, options);
  }
}


// ヘルスチェック（シンプル化）
export async function checkConnection(): Promise<boolean> {
  try {
    logger.debug('MongoDB connection check...');
    
    // 環境変数を確認
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      logger.error('MONGODB_URI is not defined!');
      return false;
    }
    
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    logger.debug('MongoDB connection successful');
    return true;
    
  } catch (error) {
    logger.error('MongoDB connection check failed:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
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
export const Collections = {
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
} as const;

// データベースサービスのシングルトンインスタンス
export const db = DatabaseService.getInstance();

// Vercel環境対応のDatabaseServiceラッパー
export class VercelDatabaseService extends DatabaseService {
  private static instance: VercelDatabaseService;
  
  private constructor() {
    super();
  }
  
  static getInstance(): VercelDatabaseService {
    if (!VercelDatabaseService.instance) {
      VercelDatabaseService.instance = new VercelDatabaseService();
    }
    return VercelDatabaseService.instance;
  }
  
  // createメソッド（シンプル化）
  async create<T>(collectionName: string, document: Omit<T, '_id'>): Promise<T> {
    try {
      const collection = await getCollection<T>(collectionName);
      const now = new Date();
      const doc = {
        ...document,
        createdAt: now,
        updatedAt: now,
      };
      
      const result = await collection.insertOne(doc as any);
      
      if (!result || !result.insertedId) {
        throw new Error('Insert operation failed - no inserted ID returned');
      }
      
      logger.debug(`Document created successfully in ${collectionName} with ID: ${result.insertedId}`);
      return { ...doc, _id: result.insertedId } as T;
      
    } catch (error) {
      logger.error(`MongoDB create error in collection ${collectionName}:`, error);
      
      // 接続エラーの場合はキャッシュをクリアして再試行
      if (error instanceof Error && 
          (error.message.includes('connection') || 
           error.message.includes('client') ||
           error.message.includes('topology'))) {
        logger.debug('Clearing MongoDB connection cache due to connection error');
        cached = undefined;
        global._mongoClientPromise = undefined;
        
        // 一度だけ再試行
        try {
          const collection = await getCollection<T>(collectionName);
          const now = new Date();
          const doc = {
            ...document,
            createdAt: now,
            updatedAt: now,
          };
          
          const result = await collection.insertOne(doc as any);
          return { ...doc, _id: result.insertedId } as T;
        } catch (retryError) {
          throw new DatabaseError(
            `Failed to create document in ${collectionName} after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
            'CREATE_ERROR'
          );
        }
      }
      
      throw new DatabaseError(
        `Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_ERROR'
      );
    }
  }
}

// Vercel環境用のエクスポート
export const vercelDb = VercelDatabaseService.getInstance();

// clientPromiseのデフォルトエクスポート（後方互換性のため）
const clientPromise = (async () => {
  const database = await getDatabase();
  return database.client;
})();

export default clientPromise;