"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
// データベース操作の基本スキーマ
const databaseOperationSchema = zod_1.z.object({
    operation: zod_1.z.enum(['create', 'read', 'update', 'delete', 'query', 'migrate']),
    table: zod_1.z.string(),
    data: zod_1.z.any().optional(),
    filters: zod_1.z.any().optional(),
    options: zod_1.z.object({
        limit: zod_1.z.number().optional(),
        offset: zod_1.z.number().optional(),
        orderBy: zod_1.z.string().optional(),
        orderDirection: zod_1.z.enum(['asc', 'desc']).optional(),
    }).optional(),
});
// トランザクション操作のスキーマ
const transactionSchema = zod_1.z.object({
    operations: zod_1.z.array(databaseOperationSchema),
    isolationLevel: zod_1.z.enum(['read_uncommitted', 'read_committed', 'repeatable_read', 'serializable']).optional(),
});
// データベースエージェントの入力スキーマ
const databaseInputSchema = zod_1.z.object({
    // 単一操作
    operation: databaseOperationSchema.optional(),
    // トランザクション
    transaction: transactionSchema.optional(),
    // 特殊操作
    specialOperation: zod_1.z.object({
        type: zod_1.z.enum(['backup', 'restore', 'vacuum', 'analyze', 'reindex']),
        target: zod_1.z.string().optional(),
        options: zod_1.z.any().optional(),
    }).optional(),
    // ベクトル検索（pgvector）
    vectorSearch: zod_1.z.object({
        table: zod_1.z.string(),
        embedding: zod_1.z.array(zod_1.z.number()),
        limit: zod_1.z.number().default(10),
        threshold: zod_1.z.number().optional(),
    }).optional(),
});
// データベースエージェント定義
exports.databaseAgent = (0, core_1.createAgent)({
    id: 'database-agent',
    name: 'Database Operations Agent',
    description: 'Handle all database operations including CRUD, transactions, and vector search',
    inputSchema: databaseInputSchema,
    // エージェントのツール
    tools: {
        // CRUD操作
        executeOperation: {
            description: 'Execute a database operation',
            execute: async ({ operation, mcpClient }) => {
                const { operation: op, table, data, filters, options } = operation;
                switch (op) {
                    case 'create':
                        return await mcpClient.callTool('supabase', 'insert', {
                            table,
                            data
                        });
                    case 'read':
                        const selectParams = { table };
                        if (filters)
                            Object.assign(selectParams, { filters });
                        if (options)
                            Object.assign(selectParams, options);
                        return await mcpClient.callTool('supabase', 'select', selectParams);
                    case 'update':
                        return await mcpClient.callTool('supabase', 'update', {
                            table,
                            filters,
                            data
                        });
                    case 'delete':
                        return await mcpClient.callTool('supabase', 'delete', {
                            table,
                            filters
                        });
                    case 'query':
                        // カスタムクエリの実行
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'execute_query',
                            params: { query: data }
                        });
                    default:
                        throw new Error(`Unknown operation: ${op}`);
                }
            },
        },
        // トランザクション実行
        executeTransaction: {
            description: 'Execute multiple operations in a transaction',
            execute: async ({ operations, isolationLevel, mcpClient }) => {
                // Supabaseはトランザクションを直接サポートしていないため、
                // ストアドプロシージャを使用
                const transactionId = `txn_${Date.now()}`;
                try {
                    // トランザクション開始
                    await mcpClient.callTool('supabase', 'rpc', {
                        functionName: 'begin_transaction',
                        params: { transaction_id: transactionId, isolation_level: isolationLevel }
                    });
                    // 各操作を実行
                    const results = [];
                    for (const op of operations) {
                        const result = await tools.executeOperation({ operation: op, mcpClient });
                        results.push(result);
                    }
                    // コミット
                    await mcpClient.callTool('supabase', 'rpc', {
                        functionName: 'commit_transaction',
                        params: { transaction_id: transactionId }
                    });
                    return { success: true, results };
                }
                catch (error) {
                    // ロールバック
                    await mcpClient.callTool('supabase', 'rpc', {
                        functionName: 'rollback_transaction',
                        params: { transaction_id: transactionId }
                    });
                    throw error;
                }
            },
        },
        // スキーマ管理
        manageSchema: {
            description: 'Manage database schema',
            execute: async ({ action, schema, mcpClient }) => {
                switch (action) {
                    case 'create_table':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'create_table',
                            params: { schema_definition: schema }
                        });
                    case 'alter_table':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'alter_table',
                            params: { changes: schema }
                        });
                    case 'create_index':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'create_index',
                            params: { index_definition: schema }
                        });
                    default:
                        throw new Error(`Unknown schema action: ${action}`);
                }
            },
        },
        // ベクトル検索（pgvector）
        performVectorSearch: {
            description: 'Perform vector similarity search',
            execute: async ({ table, embedding, limit, threshold, mcpClient }) => {
                // pgvectorを使用した類似検索
                const result = await mcpClient.callTool('supabase', 'rpc', {
                    functionName: 'vector_search',
                    params: {
                        search_table: table,
                        query_embedding: embedding,
                        match_count: limit,
                        similarity_threshold: threshold || 0.5
                    }
                });
                return result;
            },
        },
        // データ検証
        validateData: {
            description: 'Validate data before database operations',
            execute: async ({ table, data }) => {
                // テーブル別の検証ルール
                const validationRules = {
                    journal_entries: {
                        required: ['date', 'description', 'debit', 'credit'],
                        types: {
                            date: 'string',
                            description: 'string',
                            debit: 'object',
                            credit: 'object'
                        }
                    },
                    ocr_results: {
                        required: ['file_id', 'extracted_text', 'confidence'],
                        types: {
                            file_id: 'string',
                            extracted_text: 'string',
                            confidence: 'number'
                        }
                    },
                    tax_information: {
                        required: ['source', 'url', 'title', 'content'],
                        types: {
                            source: 'string',
                            url: 'string',
                            title: 'string',
                            content: 'string'
                        }
                    }
                };
                const rules = validationRules[table];
                if (!rules) {
                    return { valid: true, message: 'No validation rules for this table' };
                }
                // 必須フィールドチェック
                for (const field of rules.required) {
                    if (!data[field]) {
                        return { valid: false, message: `Missing required field: ${field}` };
                    }
                }
                // 型チェック
                for (const [field, expectedType] of Object.entries(rules.types)) {
                    if (data[field] && typeof data[field] !== expectedType) {
                        return { valid: false, message: `Invalid type for ${field}: expected ${expectedType}` };
                    }
                }
                return { valid: true, message: 'Data validation passed' };
            },
        },
        // バックアップと復元
        backupRestore: {
            description: 'Perform backup or restore operations',
            execute: async ({ operation, target, options, mcpClient }) => {
                switch (operation) {
                    case 'backup':
                        // テーブルのバックアップ
                        const backupResult = await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'backup_table',
                            params: {
                                table_name: target,
                                backup_options: options
                            }
                        });
                        // バックアップファイルをGoogle Driveに保存
                        if (options?.saveToGoogleDrive) {
                            await mcpClient.callTool('gdrive', 'drive_upload', {
                                content: backupResult.data,
                                name: `backup_${target}_${new Date().toISOString()}.sql`,
                                mimeType: 'application/sql',
                                parents: [options.googleDriveFolderId]
                            });
                        }
                        return backupResult;
                    case 'restore':
                        // バックアップからの復元
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'restore_table',
                            params: {
                                table_name: target,
                                backup_data: options.backupData
                            }
                        });
                    default:
                        throw new Error(`Unknown backup operation: ${operation}`);
                }
            },
        },
        // パフォーマンス最適化
        optimizePerformance: {
            description: 'Optimize database performance',
            execute: async ({ operation, target, mcpClient }) => {
                switch (operation) {
                    case 'vacuum':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'vacuum_table',
                            params: { table_name: target }
                        });
                    case 'analyze':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'analyze_table',
                            params: { table_name: target }
                        });
                    case 'reindex':
                        return await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'reindex_table',
                            params: { table_name: target }
                        });
                    default:
                        throw new Error(`Unknown optimization operation: ${operation}`);
                }
            },
        },
    },
    // メイン実行ロジック
    execute: async ({ input, tools, mcpClient }) => {
        try {
            console.log('[Database Agent] Starting operation');
            // 単一操作の場合
            if (input.operation) {
                // データ検証
                if (input.operation.data) {
                    const validation = await tools.validateData({
                        table: input.operation.table,
                        data: input.operation.data
                    });
                    if (!validation.valid) {
                        throw new Error(`Data validation failed: ${validation.message}`);
                    }
                }
                // 操作実行
                const result = await tools.executeOperation({
                    operation: input.operation,
                    mcpClient
                });
                return {
                    success: true,
                    operation: input.operation.operation,
                    result
                };
            }
            // トランザクションの場合
            if (input.transaction) {
                const result = await tools.executeTransaction({
                    operations: input.transaction.operations,
                    isolationLevel: input.transaction.isolationLevel,
                    mcpClient
                });
                return {
                    success: true,
                    type: 'transaction',
                    result
                };
            }
            // 特殊操作の場合
            if (input.specialOperation) {
                const { type, target, options } = input.specialOperation;
                if (['backup', 'restore'].includes(type)) {
                    const result = await tools.backupRestore({
                        operation: type,
                        target,
                        options,
                        mcpClient
                    });
                    return {
                        success: true,
                        type: 'special_operation',
                        operation: type,
                        result
                    };
                }
                if (['vacuum', 'analyze', 'reindex'].includes(type)) {
                    const result = await tools.optimizePerformance({
                        operation: type,
                        target,
                        mcpClient
                    });
                    return {
                        success: true,
                        type: 'optimization',
                        operation: type,
                        result
                    };
                }
            }
            // ベクトル検索の場合
            if (input.vectorSearch) {
                const result = await tools.performVectorSearch({
                    ...input.vectorSearch,
                    mcpClient
                });
                return {
                    success: true,
                    type: 'vector_search',
                    result
                };
            }
            throw new Error('No valid operation specified');
        }
        catch (error) {
            console.error('[Database Agent] Error:', error);
            throw error;
        }
    },
});
// エージェントのエクスポート
exports.default = exports.databaseAgent;
