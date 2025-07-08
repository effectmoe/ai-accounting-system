import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB接続設定
const DB_NAME = 'accounting';

// グローバルMongoClientインスタンス
let client: MongoClient;

// MongoDB URIを動的に取得する関数
function getMongoDBUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  return uri;
}

// Node.js環境でのMongoClient管理
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const uri = getMongoDBUri();
    
    console.log('MongoDB URI configured:', uri.replace(/\/\/[^:]*:[^@]*@/, '//***:***@')); // パスワードを隠してログ出力
    
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 60000, // Vercel環境では時間を長めに設定
      serverSelectionTimeoutMS: 60000, // Vercel環境では時間を長めに設定
    });
    
    global._mongoClientPromise = client.connect().then((connectedClient) => {
      console.log('MongoDB client connected successfully');
      return connectedClient;
    }).catch((error) => {
      console.error('MongoDB connection error:', error);
      console.error('Connection error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      // グローバル変数をクリアして再試行可能にする
      global._mongoClientPromise = undefined;
      throw new DatabaseError(
        `MongoDB connection failed: ${error.message}`,
        'CONNECTION_ERROR'
      );
    });
  }
  return global._mongoClientPromise;
}

// データベースインスタンスの取得
export async function getDatabase(): Promise<Db> {
  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    if (!db) {
      throw new Error('Database instance is null');
    }
    return db;
  } catch (error) {
    console.error('getDatabase error:', error);
    throw new DatabaseError(
      `Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DATABASE_ACCESS_ERROR'
    );
  }
}

// コレクションの取得
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  try {
    const db = await getDatabase();
    const collection = db.collection<T>(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} is null`);
    }
    return collection;
  } catch (error) {
    console.error(`getCollection error for ${collectionName}:`, error);
    throw new DatabaseError(
      `Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'COLLECTION_ACCESS_ERROR'
    );
  }
}

// MongoClientのエクスポート
export const clientPromise = getClientPromise();
// mongoClientは非推奨 - clientPromiseを使用してください
export const mongoClient = null as any;

// トランザクション実行ヘルパー
export async function withTransaction<T>(
  callback: (session: any) => Promise<T>
): Promise<T> {
  const client = await getClientPromise();
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
      const collection = await getCollection<T>(collectionName);
      const now = new Date();
      const doc = {
        ...document,
        createdAt: now,
        updatedAt: now,
      };
      const result = await collection.insertOne(doc as any);
      return { ...doc, _id: result.insertedId } as T;
    } catch (error) {
      console.error(`MongoDB create error in collection ${collectionName}:`, error);
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
    const collection = await getCollection<T>(collectionName);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return await collection.findOne({ _id: objectId } as any);
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
    const collection = await getCollection<T>(collectionName);
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
    const result = await collection.findOneAndUpdate(
      { _id: objectId } as any,
      {
        $set: {
          ...update,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result.value;
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

// グローバル型定義の拡張
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// エラーハンドリング
export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ヘルスチェック
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    await db.command({ ping: 1 });
    console.log('MongoDB connection successful');
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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
  
  // MongoDB接続の検証とエラーハンドリングを強化
  async validateConnection(): Promise<void> {
    try {
      const client = await getClientPromise();
      const db = client.db(DB_NAME);
      await db.command({ ping: 1 });
      console.log('MongoDB connection validated successfully');
    } catch (error) {
      console.error('MongoDB connection validation failed:', error);
      throw new DatabaseError(
        `MongoDB connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_VALIDATION_ERROR'
      );
    }
  }
  
  // 接続を確立してから操作を実行
  async safeExecute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.validateConnection();
      return await operation();
    } catch (error) {
      console.error('Safe execution failed:', error);
      
      // 接続エラーの場合は再試行
      if (error instanceof DatabaseError && error.code === 'CONNECTION_VALIDATION_ERROR') {
        console.log('Attempting to reconnect...');
        global._mongoClientPromise = undefined; // 接続をリセット
        
        try {
          await this.validateConnection();
          return await operation();
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }
}

// Vercel環境用のエクスポート
export const vercelDb = VercelDatabaseService.getInstance();