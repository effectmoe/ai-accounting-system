import { MongoClient, Db } from 'mongodb';

import { logger } from '@/lib/logger';
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
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