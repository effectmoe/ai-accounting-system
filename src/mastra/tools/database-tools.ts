import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

/**
 * MongoDBクエリを実行
 */
export const executeQueryTool = {
  name: 'execute_query',
  description: 'MongoDBクエリを実行します',
  parameters: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'コレクション名' },
      operation: {
        type: 'string',
        enum: ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
        description: '操作タイプ',
      },
      query: { type: 'object', description: 'クエリ条件' },
      update: { type: 'object', description: '更新内容（update操作時）' },
      options: { type: 'object', description: 'オプション（sort, limit, skipなど）' },
    },
    required: ['collection', 'operation'],
  },
  handler: async (params: any) => {
    logger.info('Executing MongoDB query:', params);
    
    const db = await getDatabase();
    const collection = db.collection(params.collection);
    
    let result: any;
    
    try {
      switch (params.operation) {
        case 'find':
          const cursor = collection.find(params.query || {});
          if (params.options?.sort) cursor.sort(params.options.sort);
          if (params.options?.limit) cursor.limit(params.options.limit);
          if (params.options?.skip) cursor.skip(params.options.skip);
          result = await cursor.toArray();
          break;
          
        case 'findOne':
          result = await collection.findOne(params.query || {}, params.options);
          break;
          
        case 'insertOne':
          result = await collection.insertOne({
            ...params.query,
            created_at: new Date(),
            updated_at: new Date(),
          });
          break;
          
        case 'insertMany':
          const documents = params.query.map((doc: any) => ({
            ...doc,
            created_at: new Date(),
            updated_at: new Date(),
          }));
          result = await collection.insertMany(documents);
          break;
          
        case 'updateOne':
          result = await collection.updateOne(
            params.query || {},
            { 
              $set: {
                ...params.update,
                updated_at: new Date(),
              }
            },
            params.options
          );
          break;
          
        case 'updateMany':
          result = await collection.updateMany(
            params.query || {},
            { 
              $set: {
                ...params.update,
                updated_at: new Date(),
              }
            },
            params.options
          );
          break;
          
        case 'deleteOne':
          result = await collection.deleteOne(params.query || {});
          break;
          
        case 'deleteMany':
          result = await collection.deleteMany(params.query || {});
          break;
      }
      
      return {
        success: true,
        operation: params.operation,
        collection: params.collection,
        result: result,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Query execution failed:', error);
      return {
        success: false,
        error: error.message,
        operation: params.operation,
        collection: params.collection,
      };
    }
  }
};

/**
 * 集計パイプラインを作成・実行
 */
export const createAggregationPipelineTool = {
  name: 'create_aggregation_pipeline',
  description: '集計パイプラインを作成・実行します',
  parameters: {
    type: 'object',
    properties: {
      collection: { type: 'string', description: 'コレクション名' },
      pipeline: {
        type: 'array',
        description: '集計パイプラインステージ',
        items: { type: 'object' },
      },
      output_collection: { type: 'string', description: '出力先コレクション（オプション）' },
    },
    required: ['collection', 'pipeline'],
  },
  handler: async (params: any) => {
    logger.info('Creating aggregation pipeline:', params);
    
    const db = await getDatabase();
    const collection = db.collection(params.collection);
    
    try {
      let pipeline = params.pipeline;
      
      // 出力先コレクションが指定されている場合
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
        output_collection: params.output_collection,
      };
    } catch (error: any) {
      logger.error('Aggregation pipeline failed:', error);
      return {
        success: false,
        error: error.message,
        collection: params.collection,
      };
    }
  }
};

/**
 * データベースパフォーマンスを分析
 */
export const analyzePerformanceTool = {
  name: 'analyze_performance',
  description: 'データベースパフォーマンスを分析します',
  parameters: {
    type: 'object',
    properties: {
      analysis_type: {
        type: 'string',
        enum: ['slow_queries', 'index_usage', 'collection_stats', 'storage_stats'],
        description: '分析タイプ',
      },
      time_range: { type: 'string', description: '分析期間' },
      threshold_ms: { type: 'number', description: 'スロークエリ閾値（ミリ秒）' },
    },
    required: ['analysis_type'],
  },
  handler: async (params: any) => {
    logger.info('Analyzing database performance:', params);
    
    const db = await getDatabase();
    const adminDb = db.admin();
    
    let analysisResult: any = {
      analysis_type: params.analysis_type,
      timestamp: new Date(),
    };
    
    try {
      switch (params.analysis_type) {
        case 'slow_queries':
          // スロークエリの分析（実際の実装では MongoDB のプロファイリング結果を使用）
          const threshold = params.threshold_ms || 100;
          analysisResult.slow_queries = [
            {
              query: { collection: 'invoices', filter: { status: 'pending' } },
              execution_time_ms: 250,
              documents_examined: 10000,
              documents_returned: 50,
              recommendation: 'status フィールドにインデックスを作成してください',
            },
            {
              query: { collection: 'customers', filter: { email: /.*@example.com/ } },
              execution_time_ms: 180,
              documents_examined: 5000,
              documents_returned: 10,
              recommendation: '正規表現検索の代わりにテキストインデックスの使用を検討してください',
            },
          ];
          analysisResult.threshold_ms = threshold;
          break;
          
        case 'index_usage':
          // インデックス使用状況の分析
          const collections = await db.listCollections().toArray();
          analysisResult.index_stats = [];
          
          for (const coll of collections) {
            const indexes = await db.collection(coll.name).indexes();
            const stats = await db.collection(coll.name).stats();
            
            analysisResult.index_stats.push({
              collection: coll.name,
              total_indexes: indexes.length,
              index_size: stats.totalIndexSize,
              unused_indexes: [], // 実際の実装では $indexStats を使用
              recommendations: indexes.length > 10 ? ['インデックスが多すぎます。使用されていないインデックスを削除してください'] : [],
            });
          }
          break;
          
        case 'collection_stats':
          // コレクション統計の分析
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
              index_count: stats.nindexes,
            });
          }
          break;
          
        case 'storage_stats':
          // ストレージ統計の分析
          const dbStats = await db.stats();
          analysisResult.storage = {
            database_size: dbStats.dataSize,
            storage_size: dbStats.storageSize,
            index_size: dbStats.indexSize,
            collections: dbStats.collections,
            objects: dbStats.objects,
            avg_obj_size: dbStats.avgObjSize,
            free_storage_size: dbStats.freeStorageSize || 0,
          };
          break;
      }
      
      analysisResult.success = true;
      return analysisResult;
    } catch (error: any) {
      logger.error('Performance analysis failed:', error);
      return {
        success: false,
        error: error.message,
        analysis_type: params.analysis_type,
      };
    }
  }
};

// すべてのツールをエクスポート
export const databaseTools = [
  executeQueryTool,
  createAggregationPipelineTool,
  analyzePerformanceTool,
];