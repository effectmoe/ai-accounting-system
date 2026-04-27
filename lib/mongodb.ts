import { MongoClient, Db } from 'mongodb';
import { logger } from '@/lib/logger';
import { DatabaseError } from '@/lib/standardized-error-handler';

// 遅延評価でURIを取得（ビルド時のエラーを回避）
function getMongoUri(): string | undefined {
  return process.env.MONGODB_URI;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const uri = getMongoUri();

  if (!uri) {
    throw new DatabaseError('Database connection skipped - MONGODB_URI not configured', 'BUILD_SKIP', 503);
  }

  if (!clientPromise) {
    clientPromise = MongoClient.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    });
  }

  try {
    client = await clientPromise;
    const db = client.db('accounting');
    return { client, db };
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    clientPromise = null;
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// デフォルトエクスポート（遅延初期化のため非推奨、connectToDatabase()を使用してください）
export async function getClientPromise(): Promise<MongoClient> {
  const { client } = await connectToDatabase();
  return client;
}

export default getClientPromise;