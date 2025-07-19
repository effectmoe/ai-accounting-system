import { Db, Collection, ObjectId, GridFSBucket } from 'mongodb';
import { logger } from '@/lib/logger';
import { getConnectionManager } from './mongodb-connection-manager';
import { ApiErrorResponse } from './unified-error-handler';

// カスタムエラークラス
export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// データベース取得
export async function getDatabase(): Promise<Db> {
  try {
    const manager = getConnectionManager();
    return await manager.getDb();
  } catch (error) {
    logger.error('getDatabase error:', error);
    throw new DatabaseError(
      `Failed to get database instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DATABASE_ACCESS_ERROR'
    );
  }
}

// コレクション取得
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  try {
    const db = await getDatabase();
    return db.collection<T>(collectionName);
  } catch (error) {
    logger.error(`getCollection error for ${collectionName}:`, error);
    throw new DatabaseError(
      `Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'COLLECTION_ACCESS_ERROR'
    );
  }
}

// MongoClient取得（後方互換性）
export async function getMongoClient() {
  const manager = getConnectionManager();
  return await manager.getClient();
}

export const getClientPromise = getMongoClient;
export const mongoClientPromise = getClientPromise();

// GridFSバケット取得
export async function getGridFSBucket(): Promise<GridFSBucket> {
  const db = await getDatabase();
  return new GridFSBucket(db);
}

// トランザクション実行ヘルパー
export async function withTransaction<T>(
  callback: (session: any) => Promise<T>
): Promise<T> {
  const client = await getMongoClient();
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
  async create<T extends { _id?: ObjectId; createdAt?: Date; updatedAt?: Date }>(
    collectionName: string, 
    document: Omit<T, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    try {
      const collection = await getCollection<T>(collectionName);
      const now = new Date();
      
      const docToInsert = {
        ...document,
        createdAt: now,
        updatedAt: now
      } as T;
      
      const result = await collection.insertOne(docToInsert as any);
      
      if (!result.acknowledged) {
        throw new Error('Document insertion not acknowledged');
      }
      
      return {
        ...docToInsert,
        _id: result.insertedId
      } as T;
    } catch (error) {
      logger.error(`Create document error in ${collectionName}:`, error);
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new ApiErrorResponse('データが重複しています', 409, 'DUPLICATE_ERROR');
      }
      throw new DatabaseError(
        `Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_ERROR'
      );
    }
  }

  /**
   * ドキュメントの検索（ID）
   */
  async findById<T>(collectionName: string, id: string | ObjectId): Promise<T | null> {
    try {
      const collection = await getCollection<T>(collectionName);
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      const document = await collection.findOne({ _id: objectId } as any);
      return document;
    } catch (error) {
      logger.error(`Find by ID error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to find document by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * ドキュメントの検索（条件）
   */
  async findOne<T>(collectionName: string, filter: any): Promise<T | null> {
    try {
      const collection = await getCollection<T>(collectionName);
      const document = await collection.findOne(filter);
      return document;
    } catch (error) {
      logger.error(`Find one error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to find document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * ドキュメントの一覧取得
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
    try {
      const collection = await getCollection<T>(collectionName);
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
      return documents as T[];
    } catch (error) {
      logger.error(`Find error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to find documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * ドキュメントの更新
   */
  async update<T extends { updatedAt?: Date }>(
    collectionName: string, 
    id: string | ObjectId, 
    update: Partial<T>
  ): Promise<T | null> {
    try {
      const collection = await getCollection<T>(collectionName);
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      const updateDoc = {
        ...update,
        updatedAt: new Date()
      };
      
      const result = await collection.findOneAndUpdate(
        { _id: objectId } as any,
        { $set: updateDoc },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      logger.error(`Update error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR'
      );
    }
  }

  /**
   * ドキュメントの削除
   */
  async delete(collectionName: string, id: string | ObjectId): Promise<boolean> {
    try {
      const collection = await getCollection(collectionName);
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      
      const result = await collection.deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error(`Delete error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR'
      );
    }
  }

  /**
   * ドキュメント数のカウント
   */
  async count(collectionName: string, filter: any = {}): Promise<number> {
    try {
      const collection = await getCollection(collectionName);
      return await collection.countDocuments(filter);
    } catch (error) {
      logger.error(`Count error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COUNT_ERROR'
      );
    }
  }

  /**
   * 集約パイプライン実行
   */
  async aggregate<T>(collectionName: string, pipeline: any[]): Promise<T[]> {
    try {
      const collection = await getCollection(collectionName);
      const results = await collection.aggregate(pipeline).toArray();
      return results as T[];
    } catch (error) {
      logger.error(`Aggregate error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to run aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AGGREGATE_ERROR'
      );
    }
  }

  /**
   * バルク操作
   */
  async bulkWrite(collectionName: string, operations: any[]): Promise<any> {
    try {
      const collection = await getCollection(collectionName);
      return await collection.bulkWrite(operations);
    } catch (error) {
      logger.error(`Bulk write error in ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to perform bulk operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BULK_WRITE_ERROR'
      );
    }
  }
}

// シングルトンインスタンスのエクスポート
export const db = DatabaseService.getInstance();

// コレクション名の定数
export const Collections = {
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
} as const;

// 型エクスポート
export type CollectionName = typeof Collections[keyof typeof Collections];