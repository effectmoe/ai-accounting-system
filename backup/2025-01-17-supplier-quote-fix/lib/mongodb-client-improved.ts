import { MongoClient, Db, Collection } from 'mongodb';
import { DatabaseConnectionError } from './api-error-handler';

// MongoDB接続設定
const DB_NAME = 'accounting';
const CONNECTION_TIMEOUT_MS = 10000; // 10秒
const SERVER_SELECTION_TIMEOUT_MS = 5000; // 5秒
const SOCKET_TIMEOUT_MS = 45000; // 45秒

// 接続状態管理
interface ConnectionState {
  client: MongoClient | null;
  db: Db | null;
  lastPingTime: number;
  isConnecting: boolean;
}

const connectionState: ConnectionState = {
  client: null,
  db: null,
  lastPingTime: 0,
  isConnecting: false,
};

// MongoDB URIを取得
function getMongoDBUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new DatabaseConnectionError('MONGODB_URI is not defined in environment variables');
  }
  return uri;
}

// 接続の健全性チェック
async function isConnectionHealthy(): Promise<boolean> {
  if (!connectionState.client || !connectionState.db) {
    return false;
  }

  // 最後のpingから30秒以上経過していたら再チェック
  const now = Date.now();
  if (now - connectionState.lastPingTime > 30000) {
    try {
      await connectionState.db.admin().ping();
      connectionState.lastPingTime = now;
      return true;
    } catch (error) {
      console.error('MongoDB ping failed:', error);
      return false;
    }
  }

  return true;
}

// MongoDB接続を確立
async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // 既存の健全な接続があれば再利用
  if (await isConnectionHealthy()) {
    console.log('Reusing healthy MongoDB connection');
    return { client: connectionState.client!, db: connectionState.db! };
  }

  // 他のリクエストが接続中の場合は待機
  if (connectionState.isConnecting) {
    console.log('Waiting for ongoing connection attempt...');
    let waitCount = 0;
    while (connectionState.isConnecting && waitCount < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }
    
    if (connectionState.client && connectionState.db) {
      return { client: connectionState.client, db: connectionState.db };
    }
  }

  connectionState.isConnecting = true;

  try {
    // 既存の接続をクリーンアップ
    if (connectionState.client) {
      console.log('Closing stale MongoDB connection');
      try {
        await connectionState.client.close();
      } catch (error) {
        console.error('Error closing MongoDB client:', error);
      }
      connectionState.client = null;
      connectionState.db = null;
    }

    const uri = getMongoDBUri();
    console.log('Creating new MongoDB connection...');
    
    // Vercel環境に最適化された接続オプション
    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: SOCKET_TIMEOUT_MS,
      connectTimeoutMS: CONNECTION_TIMEOUT_MS,
      retryWrites: true,
      w: 'majority',
    };

    const client = new MongoClient(uri, options);
    
    // タイムアウト付きで接続
    const connectPromise = client.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MongoDB connection timeout')), CONNECTION_TIMEOUT_MS);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    const db = client.db(DB_NAME);
    
    // 接続を確認
    await db.admin().ping();
    console.log('MongoDB connection established successfully');
    
    // 接続状態を更新
    connectionState.client = client;
    connectionState.db = db;
    connectionState.lastPingTime = Date.now();
    
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw new DatabaseConnectionError(
      `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    connectionState.isConnecting = false;
  }
}

// データベースインスタンスの取得
export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// コレクションの取得
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// 接続のクリーンアップ（Vercel環境では通常不要）
export async function closeConnection(): Promise<void> {
  if (connectionState.client) {
    try {
      await connectionState.client.close();
      connectionState.client = null;
      connectionState.db = null;
      connectionState.lastPingTime = 0;
      console.log('MongoDB connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }
}

// ヘルスチェック
export async function checkConnection(): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}

// Vercel環境でのコネクションプール管理
if (process.env.VERCEL) {
  // Vercelの場合、プロセス終了時にクリーンアップ
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing MongoDB connection');
    await closeConnection();
  });
}