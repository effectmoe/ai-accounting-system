"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoConnectionManager = void 0;
exports.getConnectionManager = getConnectionManager;
const mongodb_1 = require("mongodb");
const logger_1 = require("./logger");
const Sentry = __importStar(require("@sentry/nextjs"));
class MongoConnectionManager {
    config;
    static instance;
    client = null;
    db = null;
    connectionPromise = null;
    isConnecting = false;
    lastConnectionError = null;
    retryCount = 0;
    healthCheckInterval = null;
    constructor(config) {
        this.config = config;
        this.config.maxRetries = this.config.maxRetries || 3;
        this.config.retryDelay = this.config.retryDelay || 1000;
    }
    static getInstance(config) {
        if (!MongoConnectionManager.instance) {
            MongoConnectionManager.instance = new MongoConnectionManager(config);
        }
        return MongoConnectionManager.instance;
    }
    sanitizeUri(uri) {
        try {
            const url = new URL(uri);
            if (url.username)
                url.username = '***';
            if (url.password)
                url.password = '***';
            return url.toString();
        }
        catch {
            return 'mongodb://***:***@***';
        }
    }
    async connect() {
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
        }
        finally {
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }
    async performConnection() {
        const defaultOptions = {
            maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
            minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2'),
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxIdleTimeMS: 60000,
            retryWrites: true,
            retryReads: true,
        };
        const options = { ...defaultOptions, ...this.config.options };
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                logger_1.logger.info(`MongoDB connection attempt ${attempt + 1}/${this.config.maxRetries + 1}`, {
                    uri: this.sanitizeUri(this.config.uri),
                    dbName: this.config.dbName,
                });
                this.client = new mongodb_1.MongoClient(this.config.uri, options);
                await this.client.connect();
                this.db = this.client.db(this.config.dbName);
                // 接続確認
                await this.db.admin().ping();
                logger_1.logger.info('MongoDB connected successfully', {
                    dbName: this.config.dbName,
                    poolSize: options.maxPoolSize,
                });
                // 接続成功時の処理
                this.retryCount = 0;
                this.lastConnectionError = null;
                this.startHealthCheck();
                // Sentryにコンテキスト情報を追加
                Sentry.setContext('mongodb', {
                    connected: true,
                    dbName: this.config.dbName,
                    poolSize: options.maxPoolSize,
                });
                return;
            }
            catch (error) {
                this.lastConnectionError = error;
                logger_1.logger.error(`MongoDB connection attempt ${attempt + 1} failed`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    attempt: attempt + 1,
                    maxRetries: this.config.maxRetries,
                });
                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelay * Math.pow(2, attempt); // 指数バックオフ
                    logger_1.logger.info(`Retrying MongoDB connection in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        // 全ての再試行が失敗した場合
        const errorMessage = `MongoDB connection failed after ${this.config.maxRetries + 1} attempts`;
        logger_1.logger.error(errorMessage, {
            lastError: this.lastConnectionError?.message,
        });
        Sentry.captureException(this.lastConnectionError || new Error(errorMessage), {
            level: 'error',
            tags: {
                component: 'mongodb',
                action: 'connection_failed',
            },
        });
        throw new Error(errorMessage);
    }
    startHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        const intervalMs = parseInt(process.env.MONGODB_HEALTH_CHECK_INTERVAL || '30000');
        this.healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.isHealthy();
            if (!isHealthy) {
                logger_1.logger.warn('MongoDB health check failed, attempting to reconnect...');
                try {
                    await this.reconnect();
                }
                catch (error) {
                    logger_1.logger.error('MongoDB reconnection failed during health check', { error });
                }
            }
        }, intervalMs);
    }
    async isHealthy() {
        if (!this.client || !this.db) {
            return false;
        }
        try {
            await this.db.admin().ping();
            return true;
        }
        catch (error) {
            logger_1.logger.warn('MongoDB health check ping failed', { error });
            return false;
        }
    }
    async getDb() {
        await this.connect();
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }
    async getClient() {
        await this.connect();
        if (!this.client) {
            throw new Error('MongoClient not initialized');
        }
        return this.client;
    }
    async disconnect() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.client) {
            try {
                await this.client.close();
                logger_1.logger.info('MongoDB disconnected successfully');
            }
            catch (error) {
                logger_1.logger.error('Error disconnecting from MongoDB', { error });
            }
            finally {
                this.client = null;
                this.db = null;
            }
        }
    }
    async reconnect() {
        logger_1.logger.info('Initiating MongoDB reconnection...');
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
exports.MongoConnectionManager = MongoConnectionManager;
// シングルトンエクスポート関数
function getConnectionManager() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not defined');
    }
    return MongoConnectionManager.getInstance({
        uri,
        dbName: process.env.MONGODB_DB_NAME || 'accounting',
    });
}
