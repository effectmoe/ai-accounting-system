import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// データベース操作の基本スキーマ
const databaseOperationSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete', 'query', 'migrate', 'aggregate']),
  collection: z.string(),
  data: z.any().optional(),
  filters: z.any().optional(),
  options: z.object({
    limit: z.number().optional(),
    skip: z.number().optional(),
    sort: z.any().optional(),
    projection: z.any().optional(),
  }).optional(),
});

// トランザクション操作のスキーマ
const transactionSchema = z.object({
  operations: z.array(databaseOperationSchema),
  readConcern: z.enum(['local', 'available', 'majority', 'linearizable', 'snapshot']).optional(),
  writeConcern: z.object({
    w: z.union([z.string(), z.number()]).optional(),
    j: z.boolean().optional(),
    wtimeout: z.number().optional(),
  }).optional(),
});

// インデックス管理スキーマ
const indexSchema = z.object({
  collection: z.string(),
  indexSpec: z.any(),
  options: z.any().optional(),
});

// 集計パイプラインスキーマ
const aggregationSchema = z.object({
  collection: z.string(),
  pipeline: z.array(z.any()),
  options: z.any().optional(),
});

// データベースエージェントの入力スキーマ
const databaseInputSchema = z.object({
  // 単一操作
  operation: databaseOperationSchema.optional(),
  
  // トランザクション
  transaction: transactionSchema.optional(),
  
  // 特殊操作
  specialOperation: z.object({
    type: z.enum(['backup', 'restore', 'drop_collection', 'list_collections', 'create_collection']),
    target: z.string().optional(),
    options: z.any().optional(),
  }).optional(),
  
  // インデックス管理
  indexOperation: z.object({
    type: z.enum(['create', 'drop', 'list']),
    indexData: indexSchema.optional(),
  }).optional(),
  
  // 集計操作
  aggregation: aggregationSchema.optional(),
  
  // バルク操作
  bulkOperation: z.object({
    collection: z.string(),
    operations: z.array(z.any()),
    ordered: z.boolean().optional(),
  }).optional(),
});

// データベースエージェント定義
export const databaseAgent = createAgent({
  id: 'database-agent',
  name: 'Database Operations Agent',
  description: 'Handle all MongoDB database operations including CRUD, transactions, aggregation, and administration',
  
  inputSchema: databaseInputSchema,
  
  // エージェントのツール
  tools: {
    // CRUD操作
    executeOperation: {
      description: 'Execute a MongoDB database operation',
      execute: async ({ operation }) => {
        try {
          const db = DatabaseService.getInstance();
          const { operation: op, collection, data, filters, options } = operation;
          
          switch (op) {
            case 'create':
              if (!data) {
                throw new Error('Data is required for create operation');
              }
              const createResult = await db.create(collection, data);
              return {
                success: true,
                operation: 'create',
                result: createResult,
                insertedId: createResult._id?.toString()
              };
              
            case 'read':
              const readResult = await db.find(collection, filters || {}, options);
              return {
                success: true,
                operation: 'read',
                result: readResult,
                count: readResult.length
              };
              
            case 'update':
              if (!filters || !data) {
                throw new Error('Filters and data are required for update operation');
              }
              
              // 単一更新か複数更新かを判定
              if (filters._id) {
                // 単一更新
                const updateResult = await db.update(collection, filters._id, data);
                return {
                  success: true,
                  operation: 'update',
                  result: updateResult,
                  matched: updateResult ? 1 : 0,
                  modified: updateResult ? 1 : 0
                };
              } else {
                // 複数更新（手動実装）
                const documents = await db.find(collection, filters);
                const updatePromises = documents.map(doc => 
                  db.update(collection, doc._id, data)
                );
                const results = await Promise.all(updatePromises);
                const successful = results.filter(r => r !== null);
                
                return {
                  success: true,
                  operation: 'update',
                  result: successful,
                  matched: documents.length,
                  modified: successful.length
                };
              }
              
            case 'delete':
              if (!filters) {
                throw new Error('Filters are required for delete operation');
              }
              
              if (filters._id) {
                // 単一削除
                const deleteResult = await db.delete(collection, filters._id);
                return {
                  success: true,
                  operation: 'delete',
                  result: deleteResult,
                  deletedCount: deleteResult ? 1 : 0
                };
              } else {
                // 複数削除
                const deletedCount = await db.deleteMany(collection, filters);
                return {
                  success: true,
                  operation: 'delete',
                  result: true,
                  deletedCount
                };
              }
              
            case 'query':
              // カスタムクエリ（findOneを使用）
              const queryResult = await db.findOne(collection, filters || {}, options);
              return {
                success: true,
                operation: 'query',
                result: queryResult
              };
              
            case 'aggregate':
              // 集計パイプライン
              if (!data || !Array.isArray(data)) {
                throw new Error('Pipeline array is required for aggregate operation');
              }
              const aggregateResult = await db.aggregate(collection, data);
              return {
                success: true,
                operation: 'aggregate',
                result: aggregateResult,
                count: aggregateResult.length
              };
              
            default:
              throw new Error(`Unknown operation: ${op}`);
          }
        } catch (error) {
          console.error('Database operation error:', error);
          return {
            success: false,
            operation: operation.operation,
            error: error.message
          };
        }
      },
    },
    
    // トランザクション実行
    executeTransaction: {
      description: 'Execute multiple operations in a MongoDB transaction',
      execute: async ({ operations, readConcern, writeConcern }) => {
        try {
          const { withTransaction } = await import('@/lib/mongodb-client');
          
          const result = await withTransaction(async (session) => {
            const results = [];
            
            for (const operation of operations) {
              // トランザクション内での各操作を実行
              const opResult = await tools.executeOperation({ operation });
              results.push(opResult);
              
              if (!opResult.success) {
                throw new Error(`Transaction operation failed: ${opResult.error}`);
              }
            }
            
            return results;
          });
          
          return {
            success: true,
            type: 'transaction',
            operationCount: operations.length,
            results: result
          };
          
        } catch (error) {
          console.error('Transaction error:', error);
          return {
            success: false,
            type: 'transaction',
            error: error.message
          };
        }
      },
    },
    
    // インデックス管理
    manageIndexes: {
      description: 'Manage MongoDB indexes',
      execute: async ({ type, indexData }) => {
        try {
          const db = DatabaseService.getInstance();
          
          switch (type) {
            case 'create':
              if (!indexData) {
                throw new Error('Index data is required for create operation');
              }
              
              const indexName = await db.createIndex(
                indexData.collection,
                indexData.indexSpec,
                indexData.options
              );
              
              return {
                success: true,
                operation: 'create_index',
                indexName,
                collection: indexData.collection
              };
              
            case 'drop':
              if (!indexData || !indexData.collection) {
                throw new Error('Collection name is required for drop operation');
              }
              
              // インデックス名が指定されていない場合はエラー
              if (!indexData.indexSpec || typeof indexData.indexSpec !== 'string') {
                throw new Error('Index name is required for drop operation');
              }
              
              // インデックス削除の実装（MongoDB Nativeを直接使用）
              const { getCollection } = await import('@/lib/mongodb-client');
              const collection = await getCollection(indexData.collection);
              await collection.dropIndex(indexData.indexSpec);
              
              return {
                success: true,
                operation: 'drop_index',
                indexName: indexData.indexSpec,
                collection: indexData.collection
              };
              
            case 'list':
              if (!indexData || !indexData.collection) {
                throw new Error('Collection name is required for list operation');
              }
              
              // インデックス一覧の取得
              const listCollection = await getCollection(indexData.collection);
              const indexes = await listCollection.listIndexes().toArray();
              
              return {
                success: true,
                operation: 'list_indexes',
                collection: indexData.collection,
                indexes
              };
              
            default:
              throw new Error(`Unknown index operation: ${type}`);
          }
          
        } catch (error) {
          console.error('Index management error:', error);
          return {
            success: false,
            operation: `index_${type}`,
            error: error.message
          };
        }
      },
    },
    
    // 集計操作
    performAggregation: {
      description: 'Perform MongoDB aggregation pipeline',
      execute: async ({ collection, pipeline, options }) => {
        try {
          const db = DatabaseService.getInstance();
          
          if (!Array.isArray(pipeline)) {
            throw new Error('Pipeline must be an array');
          }
          
          const result = await db.aggregate(collection, pipeline);
          
          return {
            success: true,
            operation: 'aggregation',
            collection,
            pipeline,
            result,
            count: result.length
          };
          
        } catch (error) {
          console.error('Aggregation error:', error);
          return {
            success: false,
            operation: 'aggregation',
            error: error.message
          };
        }
      },
    },
    
    // バルク操作
    executeBulkOperation: {
      description: 'Execute bulk operations in MongoDB',
      execute: async ({ collection, operations, ordered = true }) => {
        try {
          const { getCollection } = await import('@/lib/mongodb-client');
          const mongoCollection = await getCollection(collection);
          
          // バルク操作の準備
          const bulkOps = operations.map(op => {
            if (op.insertOne) {
              return {
                insertOne: {
                  document: {
                    ...op.insertOne.document,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                }
              };
            }
            return op;
          });
          
          // バルク操作の実行
          const result = await mongoCollection.bulkWrite(bulkOps, { ordered });
          
          return {
            success: true,
            operation: 'bulk',
            collection,
            result: {
              insertedCount: result.insertedCount,
              modifiedCount: result.modifiedCount,
              deletedCount: result.deletedCount,
              upsertedCount: result.upsertedCount,
              insertedIds: result.insertedIds,
              upsertedIds: result.upsertedIds
            }
          };
          
        } catch (error) {
          console.error('Bulk operation error:', error);
          return {
            success: false,
            operation: 'bulk',
            error: error.message
          };
        }
      },
    },
    
    // データ検証
    validateData: {
      description: 'Validate data before database operations',
      execute: async ({ collection, data }) => {
        try {
          // コレクション別の検証ルール
          const validationRules = {
            [Collections.JOURNAL_ENTRIES]: {
              required: ['companyId', 'description', 'date', 'lines'],
              types: {
                companyId: 'string',
                description: 'string',
                date: 'object',
                lines: 'object'
              }
            },
            [Collections.OCR_RESULTS]: {
              required: ['fileId', 'extractedText', 'confidence'],
              types: {
                fileId: 'string',
                extractedText: 'string',
                confidence: 'number'
              }
            },
            [Collections.INVOICES]: {
              required: ['companyId', 'customerId', 'items', 'totalAmount'],
              types: {
                companyId: 'string',
                customerId: 'string',
                items: 'object',
                totalAmount: 'number'
              }
            },
            [Collections.CUSTOMERS]: {
              required: ['companyName', 'companyId', 'contact'],
              types: {
                companyName: 'string',
                companyId: 'string',
                contact: 'object'
              }
            }
          };
          
          const rules = validationRules[collection];
          if (!rules) {
            return { 
              valid: true, 
              message: `No validation rules defined for collection: ${collection}` 
            };
          }
          
          // 必須フィールドチェック
          for (const field of rules.required) {
            if (data[field] === undefined || data[field] === null) {
              return { 
                valid: false, 
                message: `Missing required field: ${field}`,
                field 
              };
            }
          }
          
          // 型チェック
          for (const [field, expectedType] of Object.entries(rules.types)) {
            if (data[field] !== undefined && typeof data[field] !== expectedType) {
              return { 
                valid: false, 
                message: `Invalid type for ${field}: expected ${expectedType}, got ${typeof data[field]}`,
                field,
                expectedType,
                actualType: typeof data[field]
              };
            }
          }
          
          return { 
            valid: true, 
            message: 'Data validation passed',
            validatedFields: rules.required.length
          };
          
        } catch (error) {
          console.error('Data validation error:', error);
          return {
            valid: false,
            message: `Validation error: ${error.message}`,
            error: error.message
          };
        }
      },
    },
    
    // 特殊操作
    executeSpecialOperation: {
      description: 'Execute special database operations',
      execute: async ({ type, target, options }) => {
        try {
          const { getDatabase, getCollection } = await import('@/lib/mongodb-client');
          const db = await getDatabase();
          
          switch (type) {
            case 'list_collections':
              const collections = await db.listCollections().toArray();
              return {
                success: true,
                operation: 'list_collections',
                collections: collections.map(c => c.name)
              };
              
            case 'create_collection':
              if (!target) {
                throw new Error('Collection name is required');
              }
              
              await db.createCollection(target, options);
              return {
                success: true,
                operation: 'create_collection',
                collection: target
              };
              
            case 'drop_collection':
              if (!target) {
                throw new Error('Collection name is required');
              }
              
              const collection = await getCollection(target);
              await collection.drop();
              return {
                success: true,
                operation: 'drop_collection',
                collection: target
              };
              
            case 'backup':
              // MongoDB バックアップ（エクスポート）
              if (!target) {
                throw new Error('Collection name is required for backup');
              }
              
              const backupCollection = await getCollection(target);
              const backupData = await backupCollection.find({}).toArray();
              
              return {
                success: true,
                operation: 'backup',
                collection: target,
                documentCount: backupData.length,
                backupData: JSON.stringify(backupData, null, 2),
                timestamp: new Date().toISOString()
              };
              
            case 'restore':
              // MongoDB復元（インポート）
              if (!target || !options?.backupData) {
                throw new Error('Collection name and backup data are required for restore');
              }
              
              const restoreData = JSON.parse(options.backupData);
              const dbService = DatabaseService.getInstance();
              const restored = await dbService.bulkInsert(target, restoreData);
              
              return {
                success: true,
                operation: 'restore',
                collection: target,
                restoredCount: restored.length
              };
              
            default:
              throw new Error(`Unknown special operation: ${type}`);
          }
          
        } catch (error) {
          console.error('Special operation error:', error);
          return {
            success: false,
            operation: type,
            error: error.message
          };
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('[Database Agent] Starting operation');
      
      // 単一操作の場合
      if (input.operation) {
        // データ検証
        if (input.operation.data && input.operation.operation === 'create') {
          const validation = await tools.validateData({
            collection: input.operation.collection,
            data: input.operation.data
          });
          
          if (!validation.valid) {
            return {
              success: false,
              operation: input.operation.operation,
              error: `Data validation failed: ${validation.message}`,
              validationDetails: validation
            };
          }
        }
        
        // 操作実行
        const result = await tools.executeOperation({
          operation: input.operation
        });
        
        return {
          success: result.success,
          operation: input.operation.operation,
          collection: input.operation.collection,
          result: result
        };
      }
      
      // トランザクションの場合
      if (input.transaction) {
        const result = await tools.executeTransaction({
          operations: input.transaction.operations,
          readConcern: input.transaction.readConcern,
          writeConcern: input.transaction.writeConcern
        });
        
        return {
          success: result.success,
          type: 'transaction',
          result: result
        };
      }
      
      // 集計操作の場合
      if (input.aggregation) {
        const result = await tools.performAggregation({
          collection: input.aggregation.collection,
          pipeline: input.aggregation.pipeline,
          options: input.aggregation.options
        });
        
        return {
          success: result.success,
          type: 'aggregation',
          result: result
        };
      }
      
      // バルク操作の場合
      if (input.bulkOperation) {
        const result = await tools.executeBulkOperation({
          collection: input.bulkOperation.collection,
          operations: input.bulkOperation.operations,
          ordered: input.bulkOperation.ordered
        });
        
        return {
          success: result.success,
          type: 'bulk_operation',
          result: result
        };
      }
      
      // インデックス操作の場合
      if (input.indexOperation) {
        const result = await tools.manageIndexes({
          type: input.indexOperation.type,
          indexData: input.indexOperation.indexData
        });
        
        return {
          success: result.success,
          type: 'index_operation',
          result: result
        };
      }
      
      // 特殊操作の場合
      if (input.specialOperation) {
        const result = await tools.executeSpecialOperation({
          type: input.specialOperation.type,
          target: input.specialOperation.target,
          options: input.specialOperation.options
        });
        
        return {
          success: result.success,
          type: 'special_operation',
          result: result
        };
      }
      
      return {
        success: false,
        error: 'No valid operation specified'
      };
      
    } catch (error) {
      console.error('[Database Agent] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },
});

// エージェントのエクスポート
export default databaseAgent;