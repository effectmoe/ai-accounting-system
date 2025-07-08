import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB接続設定
const DB_NAME = 'accounting';

// グローバルMongoClientインスタンス
let client: MongoClient;

// MongoDB URIを動的に取得する関数
function getMongoDBUri(): string {
  return process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting';
}

// Node.js環境でのMongoClient管理
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const uri = getMongoDBUri();
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
    });
    global._mongoClientPromise = client.connect().catch((error) => {
      console.error('MongoDB connection error:', error);
      // グローバル変数をクリアして再試行可能にする
      global._mongoClientPromise = undefined;
      throw error;
    });
  }
  return global._mongoClientPromise;
}

// データベースインスタンスの取得
export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

// コレクションの取得
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
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
    const collection = await getCollection<T>(collectionName);
    const now = new Date();
    const doc = {
      ...document,
      createdAt: now,
      updatedAt: now,
    };
    const result = await collection.insertOne(doc as any);
    return { ...doc, _id: result.insertedId } as T;
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
    await client.db('admin').command({ ping: 1 });
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