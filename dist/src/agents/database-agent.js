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
exports.databaseAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const databaseOperationSchema = zod_1.z.object({
    operation: zod_1.z.enum(['create', 'read', 'update', 'delete', 'query', 'migrate', 'aggregate']),
    collection: zod_1.z.string(),
    data: zod_1.z.any().optional(),
    filters: zod_1.z.any().optional(),
    options: zod_1.z.object({
        limit: zod_1.z.number().optional(),
        skip: zod_1.z.number().optional(),
        sort: zod_1.z.any().optional(),
        projection: zod_1.z.any().optional(),
    }).optional(),
});
const transactionSchema = zod_1.z.object({
    operations: zod_1.z.array(databaseOperationSchema),
    readConcern: zod_1.z.enum(['local', 'available', 'majority', 'linearizable', 'snapshot']).optional(),
    writeConcern: zod_1.z.object({
        w: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
        j: zod_1.z.boolean().optional(),
        wtimeout: zod_1.z.number().optional(),
    }).optional(),
});
const indexSchema = zod_1.z.object({
    collection: zod_1.z.string(),
    indexSpec: zod_1.z.any(),
    options: zod_1.z.any().optional(),
});
const aggregationSchema = zod_1.z.object({
    collection: zod_1.z.string(),
    pipeline: zod_1.z.array(zod_1.z.any()),
    options: zod_1.z.any().optional(),
});
const databaseInputSchema = zod_1.z.object({
    operation: databaseOperationSchema.optional(),
    transaction: transactionSchema.optional(),
    specialOperation: zod_1.z.object({
        type: zod_1.z.enum(['backup', 'restore', 'drop_collection', 'list_collections', 'create_collection']),
        target: zod_1.z.string().optional(),
        options: zod_1.z.any().optional(),
    }).optional(),
    indexOperation: zod_1.z.object({
        type: zod_1.z.enum(['create', 'drop', 'list']),
        indexData: indexSchema.optional(),
    }).optional(),
    aggregation: aggregationSchema.optional(),
    bulkOperation: zod_1.z.object({
        collection: zod_1.z.string(),
        operations: zod_1.z.array(zod_1.z.any()),
        ordered: zod_1.z.boolean().optional(),
    }).optional(),
});
exports.databaseAgent = (0, core_1.createAgent)({
    id: 'database-agent',
    name: 'Database Operations Agent',
    description: 'Handle all MongoDB database operations including CRUD, transactions, aggregation, and administration',
    inputSchema: databaseInputSchema,
    tools: {
        executeOperation: {
            description: 'Execute a MongoDB database operation',
            execute: async ({ operation }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
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
                            if (filters._id) {
                                const updateResult = await db.update(collection, filters._id, data);
                                return {
                                    success: true,
                                    operation: 'update',
                                    result: updateResult,
                                    matched: updateResult ? 1 : 0,
                                    modified: updateResult ? 1 : 0
                                };
                            }
                            else {
                                const documents = await db.find(collection, filters);
                                const updatePromises = documents.map(doc => db.update(collection, doc._id, data));
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
                                const deleteResult = await db.delete(collection, filters._id);
                                return {
                                    success: true,
                                    operation: 'delete',
                                    result: deleteResult,
                                    deletedCount: deleteResult ? 1 : 0
                                };
                            }
                            else {
                                const deletedCount = await db.deleteMany(collection, filters);
                                return {
                                    success: true,
                                    operation: 'delete',
                                    result: true,
                                    deletedCount
                                };
                            }
                        case 'query':
                            const queryResult = await db.findOne(collection, filters || {}, options);
                            return {
                                success: true,
                                operation: 'query',
                                result: queryResult
                            };
                        case 'aggregate':
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
                }
                catch (error) {
                    logger_1.logger.error('Database operation error:', error);
                    return {
                        success: false,
                        operation: operation.operation,
                        error: error.message
                    };
                }
            },
        },
        executeTransaction: {
            description: 'Execute multiple operations in a MongoDB transaction',
            execute: async ({ operations, readConcern, writeConcern }) => {
                try {
                    const { withTransaction } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
                    const result = await withTransaction(async (session) => {
                        const results = [];
                        for (const operation of operations) {
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
                }
                catch (error) {
                    logger_1.logger.error('Transaction error:', error);
                    return {
                        success: false,
                        type: 'transaction',
                        error: error.message
                    };
                }
            },
        },
        manageIndexes: {
            description: 'Manage MongoDB indexes',
            execute: async ({ type, indexData }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    switch (type) {
                        case 'create':
                            if (!indexData) {
                                throw new Error('Index data is required for create operation');
                            }
                            const indexName = await db.createIndex(indexData.collection, indexData.indexSpec, indexData.options);
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
                            if (!indexData.indexSpec || typeof indexData.indexSpec !== 'string') {
                                throw new Error('Index name is required for drop operation');
                            }
                            const { getCollection } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
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
                }
                catch (error) {
                    logger_1.logger.error('Index management error:', error);
                    return {
                        success: false,
                        operation: `index_${type}`,
                        error: error.message
                    };
                }
            },
        },
        performAggregation: {
            description: 'Perform MongoDB aggregation pipeline',
            execute: async ({ collection, pipeline, options }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
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
                }
                catch (error) {
                    logger_1.logger.error('Aggregation error:', error);
                    return {
                        success: false,
                        operation: 'aggregation',
                        error: error.message
                    };
                }
            },
        },
        executeBulkOperation: {
            description: 'Execute bulk operations in MongoDB',
            execute: async ({ collection, operations, ordered = true }) => {
                try {
                    const { getCollection } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
                    const mongoCollection = await getCollection(collection);
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
                }
                catch (error) {
                    logger_1.logger.error('Bulk operation error:', error);
                    return {
                        success: false,
                        operation: 'bulk',
                        error: error.message
                    };
                }
            },
        },
        validateData: {
            description: 'Validate data before database operations',
            execute: async ({ collection, data }) => {
                try {
                    const validationRules = {
                        [mongodb_client_1.Collections.JOURNAL_ENTRIES]: {
                            required: ['companyId', 'description', 'date', 'lines'],
                            types: {
                                companyId: 'string',
                                description: 'string',
                                date: 'object',
                                lines: 'object'
                            }
                        },
                        [mongodb_client_1.Collections.OCR_RESULTS]: {
                            required: ['fileId', 'extractedText', 'confidence'],
                            types: {
                                fileId: 'string',
                                extractedText: 'string',
                                confidence: 'number'
                            }
                        },
                        [mongodb_client_1.Collections.INVOICES]: {
                            required: ['companyId', 'customerId', 'items', 'totalAmount'],
                            types: {
                                companyId: 'string',
                                customerId: 'string',
                                items: 'object',
                                totalAmount: 'number'
                            }
                        },
                        [mongodb_client_1.Collections.CUSTOMERS]: {
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
                    for (const field of rules.required) {
                        if (data[field] === undefined || data[field] === null) {
                            return {
                                valid: false,
                                message: `Missing required field: ${field}`,
                                field
                            };
                        }
                    }
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
                }
                catch (error) {
                    logger_1.logger.error('Data validation error:', error);
                    return {
                        valid: false,
                        message: `Validation error: ${error.message}`,
                        error: error.message
                    };
                }
            },
        },
        executeSpecialOperation: {
            description: 'Execute special database operations',
            execute: async ({ type, target, options }) => {
                try {
                    const { getDatabase, getCollection } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
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
                            if (!target || !options?.backupData) {
                                throw new Error('Collection name and backup data are required for restore');
                            }
                            const restoreData = JSON.parse(options.backupData);
                            const dbService = mongodb_client_1.DatabaseService.getInstance();
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
                }
                catch (error) {
                    logger_1.logger.error('Special operation error:', error);
                    return {
                        success: false,
                        operation: type,
                        error: error.message
                    };
                }
            },
        },
    },
    execute: async ({ input, tools }) => {
        try {
            logger_1.logger.debug('[Database Agent] Starting operation');
            if (input.operation) {
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
        }
        catch (error) {
            logger_1.logger.error('[Database Agent] Error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    },
});
exports.default = exports.databaseAgent;
//# sourceMappingURL=database-agent.js.map