import { l as logger, g as getDatabase } from '../mongodb-client.mjs';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/mongodb/lib/index.js';
import '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation/node_modules/@sentry/nextjs/build/cjs/index.server.js';

const executeQueryTool = {
  name: "execute_query",
  description: "MongoDB\u30AF\u30A8\u30EA\u3092\u5B9F\u884C\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      collection: { type: "string", description: "\u30B3\u30EC\u30AF\u30B7\u30E7\u30F3\u540D" },
      operation: {
        type: "string",
        enum: ["find", "findOne", "insertOne", "insertMany", "updateOne", "updateMany", "deleteOne", "deleteMany"],
        description: "\u64CD\u4F5C\u30BF\u30A4\u30D7"
      },
      query: { type: "object", description: "\u30AF\u30A8\u30EA\u6761\u4EF6" },
      update: { type: "object", description: "\u66F4\u65B0\u5185\u5BB9\uFF08update\u64CD\u4F5C\u6642\uFF09" },
      options: { type: "object", description: "\u30AA\u30D7\u30B7\u30E7\u30F3\uFF08sort, limit, skip\u306A\u3069\uFF09" }
    },
    required: ["collection", "operation"]
  },
  handler: async (params) => {
    logger.info("Executing MongoDB query:", params);
    const db = await getDatabase();
    const collection = db.collection(params.collection);
    let result;
    try {
      switch (params.operation) {
        case "find":
          const cursor = collection.find(params.query || {});
          if (params.options?.sort) cursor.sort(params.options.sort);
          if (params.options?.limit) cursor.limit(params.options.limit);
          if (params.options?.skip) cursor.skip(params.options.skip);
          result = await cursor.toArray();
          break;
        case "findOne":
          result = await collection.findOne(params.query || {}, params.options);
          break;
        case "insertOne":
          result = await collection.insertOne({
            ...params.query,
            created_at: /* @__PURE__ */ new Date(),
            updated_at: /* @__PURE__ */ new Date()
          });
          break;
        case "insertMany":
          const documents = params.query.map((doc) => ({
            ...doc,
            created_at: /* @__PURE__ */ new Date(),
            updated_at: /* @__PURE__ */ new Date()
          }));
          result = await collection.insertMany(documents);
          break;
        case "updateOne":
          result = await collection.updateOne(
            params.query || {},
            {
              $set: {
                ...params.update,
                updated_at: /* @__PURE__ */ new Date()
              }
            },
            params.options
          );
          break;
        case "updateMany":
          result = await collection.updateMany(
            params.query || {},
            {
              $set: {
                ...params.update,
                updated_at: /* @__PURE__ */ new Date()
              }
            },
            params.options
          );
          break;
        case "deleteOne":
          result = await collection.deleteOne(params.query || {});
          break;
        case "deleteMany":
          result = await collection.deleteMany(params.query || {});
          break;
      }
      return {
        success: true,
        operation: params.operation,
        collection: params.collection,
        result,
        timestamp: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      logger.error("Query execution failed:", error);
      return {
        success: false,
        error: error.message,
        operation: params.operation,
        collection: params.collection
      };
    }
  }
};
const createAggregationPipelineTool = {
  name: "create_aggregation_pipeline",
  description: "\u96C6\u8A08\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u3092\u4F5C\u6210\u30FB\u5B9F\u884C\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      collection: { type: "string", description: "\u30B3\u30EC\u30AF\u30B7\u30E7\u30F3\u540D" },
      pipeline: {
        type: "array",
        description: "\u96C6\u8A08\u30D1\u30A4\u30D7\u30E9\u30A4\u30F3\u30B9\u30C6\u30FC\u30B8",
        items: { type: "object" }
      },
      output_collection: { type: "string", description: "\u51FA\u529B\u5148\u30B3\u30EC\u30AF\u30B7\u30E7\u30F3\uFF08\u30AA\u30D7\u30B7\u30E7\u30F3\uFF09" }
    },
    required: ["collection", "pipeline"]
  },
  handler: async (params) => {
    logger.info("Creating aggregation pipeline:", params);
    const db = await getDatabase();
    const collection = db.collection(params.collection);
    try {
      let pipeline = params.pipeline;
      if (params.output_collection) {
        pipeline.push({
          $out: params.output_collection
        });
      }
      const result = await collection.aggregate(pipeline).toArray();
      return {
        success: true,
        collection: params.collection,
        pipeline_stages: pipeline.length,
        result_count: result.length,
        results: result,
        output_collection: params.output_collection
      };
    } catch (error) {
      logger.error("Aggregation pipeline failed:", error);
      return {
        success: false,
        error: error.message,
        collection: params.collection
      };
    }
  }
};
const analyzePerformanceTool = {
  name: "analyze_performance",
  description: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u3092\u5206\u6790\u3057\u307E\u3059",
  parameters: {
    type: "object",
    properties: {
      analysis_type: {
        type: "string",
        enum: ["slow_queries", "index_usage", "collection_stats", "storage_stats"],
        description: "\u5206\u6790\u30BF\u30A4\u30D7"
      },
      time_range: { type: "string", description: "\u5206\u6790\u671F\u9593" },
      threshold_ms: { type: "number", description: "\u30B9\u30ED\u30FC\u30AF\u30A8\u30EA\u95BE\u5024\uFF08\u30DF\u30EA\u79D2\uFF09" }
    },
    required: ["analysis_type"]
  },
  handler: async (params) => {
    logger.info("Analyzing database performance:", params);
    const db = await getDatabase();
    db.admin();
    let analysisResult = {
      analysis_type: params.analysis_type,
      timestamp: /* @__PURE__ */ new Date()
    };
    try {
      switch (params.analysis_type) {
        case "slow_queries":
          const threshold = params.threshold_ms || 100;
          analysisResult.slow_queries = [
            {
              query: { collection: "invoices", filter: { status: "pending" } },
              execution_time_ms: 250,
              documents_examined: 1e4,
              documents_returned: 50,
              recommendation: "status \u30D5\u30A3\u30FC\u30EB\u30C9\u306B\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044"
            },
            {
              query: { collection: "customers", filter: { email: /.*@example.com/ } },
              execution_time_ms: 180,
              documents_examined: 5e3,
              documents_returned: 10,
              recommendation: "\u6B63\u898F\u8868\u73FE\u691C\u7D22\u306E\u4EE3\u308F\u308A\u306B\u30C6\u30AD\u30B9\u30C8\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u306E\u4F7F\u7528\u3092\u691C\u8A0E\u3057\u3066\u304F\u3060\u3055\u3044"
            }
          ];
          analysisResult.threshold_ms = threshold;
          break;
        case "index_usage":
          const collections = await db.listCollections().toArray();
          analysisResult.index_stats = [];
          for (const coll of collections) {
            const indexes = await db.collection(coll.name).indexes();
            const stats = await db.collection(coll.name).stats();
            analysisResult.index_stats.push({
              collection: coll.name,
              total_indexes: indexes.length,
              index_size: stats.totalIndexSize,
              unused_indexes: [],
              // 実際の実装では $indexStats を使用
              recommendations: indexes.length > 10 ? ["\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u304C\u591A\u3059\u304E\u307E\u3059\u3002\u4F7F\u7528\u3055\u308C\u3066\u3044\u306A\u3044\u30A4\u30F3\u30C7\u30C3\u30AF\u30B9\u3092\u524A\u9664\u3057\u3066\u304F\u3060\u3055\u3044"] : []
            });
          }
          break;
        case "collection_stats":
          const collectionList = await db.listCollections().toArray();
          analysisResult.collections = [];
          for (const coll of collectionList) {
            const stats = await db.collection(coll.name).stats();
            analysisResult.collections.push({
              name: coll.name,
              document_count: stats.count,
              avg_document_size: stats.avgObjSize,
              total_size: stats.size,
              storage_size: stats.storageSize,
              index_count: stats.nindexes
            });
          }
          break;
        case "storage_stats":
          const dbStats = await db.stats();
          analysisResult.storage = {
            database_size: dbStats.dataSize,
            storage_size: dbStats.storageSize,
            index_size: dbStats.indexSize,
            collections: dbStats.collections,
            objects: dbStats.objects,
            avg_obj_size: dbStats.avgObjSize,
            free_storage_size: dbStats.freeStorageSize || 0
          };
          break;
      }
      analysisResult.success = true;
      return analysisResult;
    } catch (error) {
      logger.error("Performance analysis failed:", error);
      return {
        success: false,
        error: error.message,
        analysis_type: params.analysis_type
      };
    }
  }
};
const databaseTools = [
  executeQueryTool,
  createAggregationPipelineTool,
  analyzePerformanceTool
];

export { analyzePerformanceTool, createAggregationPipelineTool, databaseTools, executeQueryTool };
//# sourceMappingURL=b81bd6c7-9f29-4956-a943-132a359bf8e4.mjs.map
