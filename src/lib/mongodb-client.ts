import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB接続設定
const DB_NAME = 'accounting';
const CONNECTION_TIMEOUT = 60000; // 60秒
const RETRY_INTERVAL_BASE = 1000; // 1秒

// グローバルMongoClientインスタンス
let client: MongoClient;

// MongoDB URIを動的に取得する関数
function getMongoDBUri(): string {
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;
  if (!uri) {
    console.error('Environment variables:', {
      MONGODB_URI: !!process.env.MONGODB_URI,
      NEXT_PUBLIC_MONGODB_URI: !!process.env.NEXT_PUBLIC_MONGODB_URI,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    });
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
  return uri;
}

// Node.js環境でのMongoClient管理
function getClientPromise(): Promise<MongoClient> {
  // 既存の接続プロミスがある場合は、それを返す前に有効性をチェック
  if (global._mongoClientPromise) {
    // 既存のプロミスが解決されているか確認
    return global._mongoClientPromise.catch((error) => {
      console.error('Existing MongoDB connection promise failed:', error);
      // 失敗したプロミスをクリアして新しい接続を試みる
      global._mongoClientPromise = undefined;
      return getClientPromise();
    });
  }

  try {
    const uri = getMongoDBUri();
    
    console.log('Creating new MongoDB connection...');
    console.log('MongoDB URI configured:', uri.replace(/\/\/[^:]*:[^@]*@/, '//***:***@')); // パスワードを隠してログ出力
    
    // 新しいクライアントを作成
    const newClient = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 60000, // Vercel環境では時間を長めに設定
      serverSelectionTimeoutMS: 60000, // Vercel環境では時間を長めに設定
      // Vercel環境での接続安定性のための追加オプション
      retryWrites: true,
      retryReads: true,
      socketTimeoutMS: 360000,
      waitQueueTimeoutMS: 60000,
    });
    
    // 接続プロミスを作成し、グローバル変数に保存
    global._mongoClientPromise = newClient.connect()
      .then(async (connectedClient) => {
        console.log('MongoDB client connected successfully');
        
        // クライアントがnullでないことを確認
        if (!connectedClient) {
          throw new Error('Connected client is null - this should never happen');
        }
        
        // グローバル変数にクライアントを保存
        client = connectedClient;
        
        // 接続直後に一度pingを実行して確認
        try {
          const testDb = connectedClient.db(DB_NAME);
          if (!testDb) {
            throw new Error(`Database ${DB_NAME} is null after connection`);
          }
          await testDb.admin().ping();
          console.log('MongoDB connection verified with ping');
        } catch (pingError) {
          console.error('Initial ping failed:', pingError);
          // pingが失敗しても接続は維持（後続の処理で再試行）
        }
        
        return connectedClient;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        console.error('Connection error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        
        // エラー時はグローバル変数をクリアして再試行可能にする
        global._mongoClientPromise = undefined;
        
        throw new DatabaseError(
          `MongoDB connection failed: ${error.message}`,
          'CONNECTION_ERROR'
        );
      });
    
    return global._mongoClientPromise;
  } catch (error) {
    // URIの取得などで即座にエラーが発生した場合
    console.error('MongoDB client initialization error:', error);
    // グローバル変数をクリア
    global._mongoClientPromise = undefined;
    throw new DatabaseError(
      `MongoDB client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INITIALIZATION_ERROR'
    );
  }
}

// データベースインスタンスの取得
export async function getDatabase(): Promise<Db> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 接続を取得
      console.log(`Getting client promise (attempt ${i + 1})...`);
      const clientFromPromise = await getClientPromise();
      
      // NULLチェックを強化
      if (!clientFromPromise) {
        console.error('Client from promise is null!');
        throw new Error('MongoDB client is null after connection');
      }
      
      // clientオブジェクトのプロパティを確認
      console.log('Client object type:', typeof clientFromPromise);
      console.log('Client constructor name:', clientFromPromise?.constructor?.name);
      
      // データベースインスタンスを取得
      const db = clientFromPromise.db(DB_NAME);
      if (!db) {
        console.error('Database instance is null!');
        throw new Error('Database instance is null');
      }
      
      // 接続が生きているか確認
      try {
        await db.admin().ping();
        console.log(`MongoDB connection verified (attempt ${i + 1})`);
        return db;
      } catch (pingError) {
        console.error(`Database ping failed (attempt ${i + 1}):`, pingError);
        // 接続が切れている場合は再接続を試みる
        global._mongoClientPromise = undefined;
        if (i === maxRetries - 1) {
          throw new Error(`Database connection is not active after ${maxRetries} attempts`);
        }
        // 少し待ってから再試行
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      console.error(`getDatabase error (attempt ${i + 1}):`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 最後の試行でなければ、グローバル変数をクリアして再試行
      if (i < maxRetries - 1) {
        global._mongoClientPromise = undefined;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  // すべての試行が失敗した場合
  throw new DatabaseError(
    `Failed to get database instance after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    'DATABASE_ACCESS_ERROR'
  );
}

// コレクションの取得（リトライ機能付き）
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const db = await getDatabase();
      if (!db) {
        throw new Error('Database instance is null');
      }
      
      const collection = db.collection<T>(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} is null`);
      }
      
      // コレクションが実際に使用可能か確認（簡単なカウントクエリを実行）
      try {
        await collection.estimatedDocumentCount();
        console.log(`Collection ${collectionName} is accessible (attempt ${i + 1})`);
        return collection;
      } catch (testError) {
        console.error(`Collection ${collectionName} test failed (attempt ${i + 1}):`, testError);
        if (i === maxRetries - 1) {
          throw testError;
        }
        // 接続をリセットして再試行
        global._mongoClientPromise = undefined;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      console.error(`getCollection error for ${collectionName} (attempt ${i + 1}):`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i < maxRetries - 1) {
        // 接続をリセットして再試行
        global._mongoClientPromise = undefined;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  // すべての試行が失敗した場合
  throw new DatabaseError(
    `Failed to get collection ${collectionName} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    'COLLECTION_ACCESS_ERROR'
  );
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

// ヘルスチェック（リトライ機能付き）
export async function checkConnection(): Promise<boolean> {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`MongoDB connection check (attempt ${attempt + 1}/${maxRetries})...`);
      
      // 環境変数を再確認
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        console.error('MONGODB_URI is not defined!');
        throw new Error('MONGODB_URI environment variable is missing');
      }
      console.log('MONGODB_URI is defined (length:', mongoUri.length, ')');
      
      const clientFromPromise = await getClientPromise();
      if (!clientFromPromise) {
        console.error('MongoDB client is null during connection check');
        throw new Error('Client is null');
      }
      
      console.log('Got client, checking database...');
      const db = clientFromPromise.db(DB_NAME);
      if (!db) {
        console.error('Database instance is null during connection check');
        throw new Error('Database instance is null');
      }
      
      await db.command({ ping: 1 });
      console.log('MongoDB connection successful');
      return true;
      
    } catch (error) {
      console.error(`MongoDB connection check failed (attempt ${attempt + 1}):`, error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          attempt: attempt + 1
        });
      }
      
      // 接続チェック失敗時はグローバル変数をクリア
      global._mongoClientPromise = undefined;
      
      // 最後の試行でない場合は待機してリトライ
      if (attempt < maxRetries - 1) {
        const waitTime = RETRY_INTERVAL_BASE * (attempt + 1);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error(`MongoDB connection check failed after ${maxRetries} attempts`);
  return false;
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
  
  // createメソッドを完全に書き直し - getCollectionを使用（すでに接続管理が含まれている）
  async create<T>(collectionName: string, document: Omit<T, '_id'>): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    // リトライ処理
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Attempting to create document in ${collectionName} (attempt ${attempt + 1}/${maxRetries})`);
        
        // getCollectionを使用（すでに接続管理とリトライが含まれている）
        const collection = await getCollection<T>(collectionName);
        if (!collection) {
          throw new Error(`Collection ${collectionName} is null after getCollection`);
        }
        
        const now = new Date();
        const doc = {
          ...document,
          createdAt: now,
          updatedAt: now,
        };
        
        console.log(`Inserting document into ${collectionName}...`);
        const result = await collection.insertOne(doc as any);
        
        if (!result || !result.insertedId) {
          throw new Error('Insert operation failed - no inserted ID returned');
        }
        
        console.log(`Document created successfully in ${collectionName} with ID: ${result.insertedId}`);
        return { ...doc, _id: result.insertedId } as T;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`MongoDB create error in collection ${collectionName} (attempt ${attempt + 1}):`, error);
        console.error('Error details:', {
          name: lastError.name,
          message: lastError.message,
          stack: lastError.stack,
          collectionName,
          documentKeys: Object.keys(document),
          attempt: attempt + 1
        });
        
        // 接続エラーの場合はグローバル変数をクリア
        if (lastError.message.includes('connection') || 
            lastError.message.includes('client') ||
            lastError.message.includes('null') ||
            lastError.message.includes('Cannot read properties')) {
          console.log('Clearing MongoDB connection cache due to connection error');
          global._mongoClientPromise = undefined;
        }
        
        // 最後の試行でない場合は待機してリトライ
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * (attempt + 1);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // すべての試行が失敗した場合
    throw new DatabaseError(
      `Failed to create document in ${collectionName} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      'CREATE_ERROR'
    );
  }
}

// Vercel環境用のエクスポート
export const vercelDb = VercelDatabaseService.getInstance();