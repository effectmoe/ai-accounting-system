import { MongoClient, ObjectId } from '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import * as Sentry from '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

class Logger {
  isDevelopment = true;
  isProduction = false;
  shouldLog(level) {
    const levels = ["trace", "debug", "info", "warn", "error", "fatal"];
    const currentLevel = this.isDevelopment ? "debug" : "info";
    const currentIndex = levels.indexOf(currentLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= currentIndex;
  }
  sanitizeData(data) {
    if (typeof data !== "object" || data === null) {
      return data;
    }
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "authorization",
      "cookie",
      "session",
      "private_key",
      "client_secret",
      "refresh_token",
      "access_token",
      "MONGODB_URI",
      "DATABASE_URL",
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "DEEPSEEK_API_KEY"
    ];
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    if (Array.isArray(sanitized)) {
      return sanitized.map((item) => this.sanitizeData(item));
    }
    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });
    return sanitized;
  }
  log(level, message, context) {
    if (!this.shouldLog(level)) return;
    const sanitizedContext = context ? this.sanitizeData(context) : void 0;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (typeof window !== "undefined" && window.Sentry) {
      const sentryLogger = window.Sentry.logger;
      if (sentryLogger && sentryLogger[level]) {
        sentryLogger[level](message, sanitizedContext);
      }
    } else if (Sentry) {
      const breadcrumb = {
        message,
        level,
        category: "custom",
        data: sanitizedContext,
        timestamp: Date.now() / 1e3
      };
      Sentry.addBreadcrumb(breadcrumb);
    }
    if (this.isDevelopment) {
      const logMethod = level === "trace" || level === "debug" ? "debug" : level;
      const consoleMethod = console[logMethod] || console.log;
      consoleMethod.call(
        console,
        `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        sanitizedContext || ""
      );
    }
  }
  trace(message, context) {
    this.log("trace", message, context);
  }
  debug(message, context) {
    this.log("debug", message, context);
  }
  info(message, context) {
    this.log("info", message, context);
  }
  warn(message, context) {
    this.log("warn", message, context);
  }
  error(message, context) {
    this.log("error", message, context);
    if (context?.error) {
      Sentry.captureException(context.error, {
        extra: this.sanitizeData(context)
      });
    }
  }
  fatal(message, context) {
    this.log("fatal", message, context);
    Sentry.captureMessage(message, "fatal");
  }
  // 既存のconsole.logをこのロガーに置き換えるためのヘルパー
  replaceConsole() {
    if (this.isProduction) {
      console.log = (message, ...args) => {
        this.debug(String(message), { args });
      };
      console.error = (message, ...args) => {
        this.error(String(message), { args });
      };
      console.warn = (message, ...args) => {
        this.warn(String(message), { args });
      };
    }
  }
}
const logger = new Logger();

class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "DatabaseError";
  }
}
function getDBName() {
  if (process.env.MONGODB_DB_NAME) {
    const cleanDbName = process.env.MONGODB_DB_NAME.trim();
    logger.debug(`[MongoDB] Database name from MONGODB_DB_NAME: "${cleanDbName}"`);
    return cleanDbName;
  }
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const match = uri.match(/\/([^?\/]+)(\?|$)/);
      if (match && match[1]) {
        const dbName = match[1].trim();
        logger.debug(`[MongoDB] Database name extracted from URI: "${dbName}"`);
        return dbName;
      }
    } catch (error) {
      logger.error("[MongoDB] Failed to parse database name from URI:", error);
    }
  }
  const defaultDb = "accounting";
  logger.debug(`[MongoDB] Using default database name: "${defaultDb}"`);
  return defaultDb;
}
let cached = global._mongoClientPromise;
function getMongoDBUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("Environment variables:", {
      MONGODB_URI: !!process.env.MONGODB_URI,
      NODE_ENV: "development",
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    });
    throw new Error("MONGODB_URI is not defined in environment variables");
  }
  return uri;
}
function sanitizeMongoUri(uri) {
  try {
    const url = new URL(uri);
    if (url.username) {
      url.username = "***";
    }
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return "mongodb://***:***@***";
  }
}
async function connectToDatabase() {
  if (cached) {
    try {
      const client = await cached;
      const db2 = client.db(getDBName());
      await db2.admin().ping();
      logger.debug("Reusing cached MongoDB connection");
      return { client, db: db2 };
    } catch (error) {
      logger.debug("Cached connection is stale, creating new connection...");
      cached = void 0;
      global._mongoClientPromise = void 0;
    }
  }
  try {
    const uri = getMongoDBUri();
    logger.debug("Creating new MongoDB connection...");
    logger.debug("MongoDB URI configured:", sanitizeMongoUri(uri));
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 1e4,
      // 10秒に増やす
      socketTimeoutMS: 45e3,
      connectTimeoutMS: 1e4,
      // 接続タイムアウトを追加
      retryWrites: true,
      w: "majority"
    };
    const client = new MongoClient(uri, options);
    const clientPromise2 = client.connect();
    cached = global._mongoClientPromise = clientPromise2;
    const connectedClient = await clientPromise2;
    const db2 = connectedClient.db(getDBName());
    await db2.admin().ping();
    logger.debug("MongoDB connection verified with ping");
    return { client: connectedClient, db: db2 };
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    logger.error("Connection error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : void 0
    });
    cached = void 0;
    global._mongoClientPromise = void 0;
    throw new DatabaseError(
      `MongoDB connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "CONNECTION_ERROR"
    );
  }
}
async function getDatabase() {
  try {
    const { db: db2 } = await connectToDatabase();
    return db2;
  } catch (error) {
    logger.error("getDatabase error:", error);
    throw new DatabaseError(
      `Failed to get database instance: ${error instanceof Error ? error.message : "Unknown error"}`,
      "DATABASE_ACCESS_ERROR"
    );
  }
}
async function getCollection(collectionName) {
  try {
    logger.debug(`[getCollection] Attempting to get collection: ${collectionName}`);
    const db2 = await getDatabase();
    logger.debug(`[getCollection] Database obtained successfully`);
    const collection = db2.collection(collectionName);
    logger.debug(`[getCollection] Collection reference created for: ${collectionName}`);
    try {
      const count = await collection.estimatedDocumentCount();
      logger.debug(`[getCollection] Collection ${collectionName} is accessible. Estimated count: ${count}`);
      return collection;
    } catch (error) {
      logger.error(`[getCollection] Collection ${collectionName} test failed:`, error);
      logger.error(`[getCollection] Error type: ${error?.constructor?.name}`);
      cached = void 0;
      global._mongoClientPromise = void 0;
      logger.debug(`[getCollection] Connection cache cleared, attempting retry...`);
      const retryDb = await getDatabase();
      const retryCollection = retryDb.collection(collectionName);
      logger.debug(`[getCollection] Retry successful for collection: ${collectionName}`);
      return retryCollection;
    }
  } catch (error) {
    logger.error(`[getCollection] Fatal error for ${collectionName}:`, error);
    logger.error(`[getCollection] Error details:`, {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      type: typeof error,
      constructor: error?.constructor?.name
    });
    throw new DatabaseError(
      `Failed to get collection ${collectionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "COLLECTION_ACCESS_ERROR"
    );
  }
}
async function getClientPromise() {
  const { client } = await connectToDatabase();
  return client;
}
getClientPromise();
class DatabaseService {
  static instance;
  constructor() {
  }
  static getInstance() {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  /**
   * ドキュメントの作成
   */
  async create(collectionName, document) {
    try {
      logger.debug(`===== [DatabaseService] Create Operation Debug START (${collectionName}) =====`);
      logger.debug("[1] Document to create:", JSON.stringify(document, null, 2));
      const collection = await getCollection(collectionName);
      const now = /* @__PURE__ */ new Date();
      const doc = {
        ...document,
        createdAt: now,
        updatedAt: now
      };
      logger.debug("[2] Document with timestamps:", JSON.stringify(doc, null, 2));
      const result = await collection.insertOne(doc);
      const createdDoc = { ...doc, _id: result.insertedId };
      logger.debug("[3] Created document result:", JSON.stringify({
        _id: result.insertedId,
        ...doc
      }, null, 2));
      logger.debug(`===== [DatabaseService] Create Operation Debug END (${collectionName}) =====`);
      return createdDoc;
    } catch (error) {
      logger.error(`MongoDB create error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CREATE_ERROR"
      );
    }
  }
  /**
   * ドキュメントの取得
   */
  async findById(collectionName, id) {
    try {
      logger.debug(`[MongoDB] findById called for collection: ${collectionName}, id: ${id}`);
      logger.debug(`[MongoDB] ID type: ${typeof id}, length: ${id?.toString()?.length}`);
      const collection = await getCollection(collectionName);
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      logger.debug(`[MongoDB] Converted ObjectId: ${objectId}`);
      const result = await collection.findOne({ _id: objectId });
      logger.debug(`[MongoDB] findById result: ${result ? "found" : "not found"}`);
      if (result) {
        logger.debug(`[MongoDB] Found document with _id: ${result._id}`);
      }
      return result;
    } catch (error) {
      logger.error(`[MongoDB] findById error for ${collectionName}:`, error);
      if (error instanceof Error && error.message.includes("invalid ObjectId")) {
        logger.error(`[MongoDB] Invalid ObjectId format: ${id}`);
      }
      throw error;
    }
  }
  /**
   * ドキュメントの検索
   */
  async find(collectionName, filter = {}, options) {
    try {
      logger.debug(`[DatabaseService.find] Starting find operation for collection: ${collectionName}`);
      logger.debug(`[DatabaseService.find] Filter:`, JSON.stringify(filter));
      logger.debug(`[DatabaseService.find] Options:`, JSON.stringify(options));
      const collection = await getCollection(collectionName);
      logger.debug(`[DatabaseService.find] Collection obtained successfully`);
      let query = collection.find(filter);
      if (options?.sort) {
        query = query.sort(options.sort);
        logger.debug(`[DatabaseService.find] Sort applied:`, options.sort);
      }
      if (options?.skip) {
        query = query.skip(options.skip);
        logger.debug(`[DatabaseService.find] Skip applied:`, options.skip);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
        logger.debug(`[DatabaseService.find] Limit applied:`, options.limit);
      }
      if (options?.projection) {
        query = query.project(options.projection);
        logger.debug(`[DatabaseService.find] Projection applied:`, options.projection);
      }
      logger.debug(`[DatabaseService.find] Executing query...`);
      const results = await query.toArray();
      logger.debug(`[DatabaseService.find] Query executed successfully. Results count: ${results.length}`);
      return results;
    } catch (error) {
      logger.error(`[DatabaseService.find] Error in find operation for ${collectionName}:`, error);
      logger.error(`[DatabaseService.find] Error details:`, {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : void 0
      });
      throw error;
    }
  }
  /**
   * ドキュメントの更新
   */
  async update(collectionName, id, update) {
    try {
      const collection = await getCollection(collectionName);
      const objectId = typeof id === "string" ? new ObjectId(id) : id;
      const { _id, ...updateData } = update;
      logger.debug(`Updating document in ${collectionName} with ID: ${objectId}`);
      logger.debug("Update data keys:", Object.keys(updateData));
      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            ...updateData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        },
        { returnDocument: "after" }
      );
      logger.debug(`[MongoDB] findOneAndUpdate raw result:`, result);
      logger.debug(`[MongoDB] findOneAndUpdate result type:`, typeof result);
      logger.debug(`[MongoDB] findOneAndUpdate result keys:`, result ? Object.keys(result) : "null");
      if (!result) {
        logger.error(`No document found with ID ${objectId} in collection ${collectionName}`);
        return null;
      }
      logger.debug(`Document updated successfully in ${collectionName}`);
      logger.debug(`Updated document ID: ${result._id?.toString()}`);
      return result;
    } catch (error) {
      logger.error(`MongoDB update error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to update document in ${collectionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "UPDATE_ERROR"
      );
    }
  }
  /**
   * ドキュメントの削除
   */
  async delete(collectionName, id) {
    const collection = await getCollection(collectionName);
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const result = await collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }
  /**
   * 一括挿入
   */
  async bulkInsert(collectionName, documents) {
    const collection = await getCollection(collectionName);
    const now = /* @__PURE__ */ new Date();
    const docs = documents.map((doc) => ({
      ...doc,
      createdAt: now,
      updatedAt: now
    }));
    const result = await collection.insertMany(docs);
    return docs.map((doc, index) => ({
      ...doc,
      _id: result.insertedIds[index]
    }));
  }
  /**
   * カウント
   */
  async count(collectionName, filter = {}) {
    try {
      logger.debug(`[DatabaseService.count] Starting count operation for collection: ${collectionName}`);
      logger.debug(`[DatabaseService.count] Filter:`, JSON.stringify(filter));
      const collection = await getCollection(collectionName);
      logger.debug(`[DatabaseService.count] Collection obtained successfully`);
      const count = await collection.countDocuments(filter);
      logger.debug(`[DatabaseService.count] Count result: ${count}`);
      return count;
    } catch (error) {
      logger.error(`[DatabaseService.count] Error in count operation for ${collectionName}:`, error);
      throw error;
    }
  }
  /**
   * 集計
   */
  async aggregate(collectionName, pipeline) {
    const collection = await getCollection(collectionName);
    return await collection.aggregate(pipeline).toArray();
  }
  /**
   * インデックスの作成
   */
  async createIndex(collectionName, indexSpec, options) {
    const collection = await getCollection(collectionName);
    return await collection.createIndex(indexSpec, options);
  }
  /**
   * テキスト検索
   */
  async search(collectionName, searchText, filter = {}, options) {
    const collection = await getCollection(collectionName);
    const searchFilter = {
      ...filter,
      $text: { $search: searchText }
    };
    return await collection.find(searchFilter, options).toArray();
  }
  /**
   * 複数ドキュメントの削除
   */
  async deleteMany(collectionName, filter = {}) {
    const collection = await getCollection(collectionName);
    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  }
  /**
   * 複数ドキュメントの検索（エイリアス）
   */
  async findMany(collectionName, filter = {}, options) {
    return this.find(collectionName, filter, options);
  }
  /**
   * 複数ドキュメントの更新
   */
  async updateMany(collectionName, filter, update) {
    try {
      const collection = await getCollection(collectionName);
      const { _id, ...updateData } = update;
      const result = await collection.updateMany(
        filter,
        {
          $set: {
            ...updateData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }
      );
      return result.modifiedCount;
    } catch (error) {
      logger.error(`MongoDB updateMany error in collection ${collectionName}:`, error);
      throw new DatabaseError(
        `Failed to update documents in ${collectionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "UPDATE_MANY_ERROR"
      );
    }
  }
  /**
   * 単一ドキュメントの検索
   */
  async findOne(collectionName, filter = {}, options) {
    const collection = await getCollection(collectionName);
    return await collection.findOne(filter, options);
  }
}
const Collections = {
  INVOICES: "invoices",
  // 新規追加
  CUSTOMERS: "customers",
  COMPANY_INFO: "companyInfo",
  BANK_ACCOUNTS: "bankAccounts"};
const db = DatabaseService.getInstance();
class VercelDatabaseService extends DatabaseService {
  static instance;
  constructor() {
    super();
  }
  static getInstance() {
    if (!VercelDatabaseService.instance) {
      VercelDatabaseService.instance = new VercelDatabaseService();
    }
    return VercelDatabaseService.instance;
  }
  // createメソッド（シンプル化）
  async create(collectionName, document) {
    try {
      const collection = await getCollection(collectionName);
      const now = /* @__PURE__ */ new Date();
      const doc = {
        ...document,
        createdAt: now,
        updatedAt: now
      };
      const result = await collection.insertOne(doc);
      if (!result || !result.insertedId) {
        throw new Error("Insert operation failed - no inserted ID returned");
      }
      logger.debug(`Document created successfully in ${collectionName} with ID: ${result.insertedId}`);
      return { ...doc, _id: result.insertedId };
    } catch (error) {
      logger.error(`MongoDB create error in collection ${collectionName}:`, error);
      if (error instanceof Error && (error.message.includes("connection") || error.message.includes("client") || error.message.includes("topology"))) {
        logger.debug("Clearing MongoDB connection cache due to connection error");
        cached = void 0;
        global._mongoClientPromise = void 0;
        try {
          const collection = await getCollection(collectionName);
          const now = /* @__PURE__ */ new Date();
          const doc = {
            ...document,
            createdAt: now,
            updatedAt: now
          };
          const result = await collection.insertOne(doc);
          return { ...doc, _id: result.insertedId };
        } catch (retryError) {
          throw new DatabaseError(
            `Failed to create document in ${collectionName} after retry: ${retryError instanceof Error ? retryError.message : "Unknown error"}`,
            "CREATE_ERROR"
          );
        }
      }
      throw new DatabaseError(
        `Failed to create document in ${collectionName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CREATE_ERROR"
      );
    }
  }
}
VercelDatabaseService.getInstance();
(async () => {
  const database = await getDatabase();
  return database.client;
})();

export { Collections as C, db as d, getDatabase as g, logger as l };
//# sourceMappingURL=mongodb-client.mjs.map
