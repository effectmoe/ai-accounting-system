import { MongoClient, Db } from 'mongodb';
import { logger } from '@/lib/logger';
import { DatabaseError } from '@/lib/standardized-error-handler';

const uri = process.env.MONGODB_URI;

// ビルド時にはスキップ
if (!uri && process.env.NODE_ENV !== 'production') {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// ビルド時用のダミープロミス
if (!uri && process.env.NODE_ENV === 'production') {
  clientPromise = Promise.reject(new DatabaseError('Database connection skipped during build', 'BUILD_SKIP', 503));
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!uri) {
    throw new DatabaseError('Database connection skipped during build', 'BUILD_SKIP', 503);
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

// デフォルトエクスポート（clientPromise）
export default clientPromise || Promise.reject(new DatabaseError('Database connection skipped during build', 'BUILD_SKIP', 503));