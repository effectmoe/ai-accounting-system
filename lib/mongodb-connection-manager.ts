import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { logger } from './logger';
// import * as Sentry from '@sentry/nextjs';

export interface MongoConnectionConfig {
  uri: string;
  dbName: string;
  options?: MongoClientOptions;
  maxRetries?: number;
  retryDelay?: number;
}

export class MongoConnectionManager {
  private static instance: MongoConnectionManager;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private lastConnectionError: Error | null = null;
  private retryCount = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(private config: MongoConnectionConfig) {
    this.config.maxRetries = this.config.maxRetries || 3;
    this.config.retryDelay = this.config.retryDelay || 1000;
  }

  static getInstance(config: MongoConnectionConfig): MongoConnectionManager {
    if (!MongoConnectionManager.instance) {
      MongoConnectionManager.instance = new MongoConnectionManager(config);
    }
    return MongoConnectionManager.instance;
  }

  private sanitizeUri(uri: string): string {
    try {
      const url = new URL(uri);
      if (url.username) url.username = '***';
      if (url.password) url.password = '***';
      return url.toString();
    } catch {
      return 'mongodb://***:***@***';
    }
  }

  async connect(): Promise<void> {
    // 既に接続中の場合は待機
    if (this.isConnecting && this.connectionPromise) {
      await this.connectionPromise;
      return;
    }

    // 既に接続済みで健全な場合はスキップ
    if (await this.isHealthy()) {
      return;
    }

    this.isConnecting = true;
    this.connectionPromise = this.performConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async performConnection(): Promise<void> {
    const defaultOptions: MongoClientOptions = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2'),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 60000,
      retryWrites: true,
      retryReads: true,
    };

    const options = { ...defaultOptions, ...this.config.options };

    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        logger.info(`MongoDB connection attempt ${attempt + 1}/${this.config.maxRetries! + 1}`, {
          uri: this.sanitizeUri(this.config.uri),
          dbName: this.config.dbName,
        });

        this.client = new MongoClient(this.config.uri, options);
        await this.client.connect();
        this.db = this.client.db(this.config.dbName);

        // 接続確認
        await this.db.admin().ping();
        
        logger.info('MongoDB connected successfully', {
          dbName: this.config.dbName,
          poolSize: options.maxPoolSize,
        });

        // 接続成功時の処理
        this.retryCount = 0;
        this.lastConnectionError = null;
        this.startHealthCheck();

        // Sentryにコンテキスト情報を追加（一時的に無効化）
        // Sentry.setContext('mongodb', {
        //   connected: true,
        //   dbName: this.config.dbName,
        //   poolSize: options.maxPoolSize,
        // });

        return;
      } catch (error) {
        this.lastConnectionError = error as Error;
        logger.error(`MongoDB connection attempt ${attempt + 1} failed`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          attempt: attempt + 1,
          maxRetries: this.config.maxRetries,
        });

        if (attempt < this.config.maxRetries!) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt); // 指数バックオフ
          logger.info(`Retrying MongoDB connection in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // 全ての再試行が失敗した場合
    const errorMessage = `MongoDB connection failed after ${this.config.maxRetries! + 1} attempts`;
    logger.error(errorMessage, {
      lastError: this.lastConnectionError?.message,
    });

    // Sentry.captureException(this.lastConnectionError || new Error(errorMessage), {
    //   level: 'error',
    //   tags: {
    //     component: 'mongodb',
    //     action: 'connection_failed',
    //   },
    // });

    throw new Error(errorMessage);
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const intervalMs = parseInt(process.env.MONGODB_HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.isHealthy();
      if (!isHealthy) {
        logger.warn('MongoDB health check failed, attempting to reconnect...');
        try {
          await this.reconnect();
        } catch (error) {
          logger.error('MongoDB reconnection failed during health check', { error });
        }
      }
    }, intervalMs);
  }

  async isHealthy(): boolean {
    if (!this.client || !this.db) {
      return false;
    }

    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.warn('MongoDB health check ping failed', { error });
      return false;
    }
  }

  async getDb(): Promise<Db> {
    await this.connect();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async getClient(): Promise<MongoClient> {
    await this.connect();
    if (!this.client) {
      throw new Error('MongoClient not initialized');
    }
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.client) {
      try {
        await this.client.close();
        logger.info('MongoDB disconnected successfully');
      } catch (error) {
        logger.error('Error disconnecting from MongoDB', { error });
      } finally {
        this.client = null;
        this.db = null;
      }
    }
  }

  async reconnect(): Promise<void> {
    logger.info('Initiating MongoDB reconnection...');
    await this.disconnect();
    await this.connect();
  }

  getConnectionStats() {
    if (!this.client) {
      return null;
    }

    return {
      connected: this.client.topology?.isConnected() || false,
      lastError: this.lastConnectionError?.message || null,
      retryCount: this.retryCount,
    };
  }
}

// シングルトンエクスポート関数
export function getConnectionManager(): MongoConnectionManager {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  return MongoConnectionManager.getInstance({
    uri,
    dbName: process.env.MONGODB_DB_NAME || 'accounting',
  });
}