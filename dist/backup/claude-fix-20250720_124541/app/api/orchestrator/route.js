"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
// モックエージェントの実装（Mastraのインポート問題を回避）
const createMockAgent = (name) => ({
    execute: async (input) => {
        logger_1.logger.debug(`[${name}] Executing with input:`, input);
        switch (name) {
            case 'ocr':
                return {
                    success: true,
                    text: 'サンプル領収書テキスト',
                    confidence: 0.95,
                    vendor: 'テスト商店',
                    date: '2025-01-07',
                    amount: 3300,
                    tax: 300,
                };
            case 'accounting':
                return {
                    success: true,
                    category: '事務用品',
                    subcategory: 'PC関連',
                    deductible: true,
                };
            case 'database':
                return {
                    success: true,
                    id: `receipt-${Date.now()}`,
                    message: 'データが正常に保存されました',
                };
            case 'japan-tax':
                const amount = input?.input?.transactionData?.amount || 0;
                return {
                    success: true,
                    consumptionTax: Math.floor(amount * 0.1 / 1.1),
                    taxRate: 10,
                };
            case 'tax-return':
                return {
                    success: true,
                    status: 'preparing',
                    year: input?.input?.year || new Date().getFullYear() - 1,
                    message: '確定申告の準備を開始しました',
                };
            default:
                return {
                    success: true,
                    message: `${name} agent executed successfully`,
                };
        }
    },
});
// エージェントマップ
const agents = {
    'ocr': createMockAgent('ocr'),
    'accounting': createMockAgent('accounting'),
    'database': createMockAgent('database'),
    'customer': createMockAgent('customer'),
    'product': createMockAgent('product'),
    'japan-tax': createMockAgent('japan-tax'),
    'ui': createMockAgent('ui'),
    'nlweb': createMockAgent('nlweb'),
    'tax-return': createMockAgent('tax-return'),
};
// 完全な文書処理ワークフロー
async function executeDocumentWorkflow(input) {
    try {
        logger_1.logger.debug('🚀 Starting document workflow:', input);
        // Step 1: OCR Processing
        const ocrResult = await agents['ocr'].execute({ input });
        if (!ocrResult.success) {
            throw new Error(`OCR failed: ${ocrResult.error}`);
        }
        // Step 2: NLWeb dynamic tax info (if needed)
        let taxContext = null;
        if (ocrResult.vendor) {
            try {
                taxContext = await agents['nlweb'].execute({
                    input: {
                        query: `税制情報 ${ocrResult.vendor}`,
                        dataType: 'tax_info',
                        filters: { vendor: ocrResult.vendor },
                    },
                });
            }
            catch (error) {
                logger_1.logger.warn('Tax context fetch failed:', error);
            }
        }
        // Step 3: Accounting Analysis
        const accountingResult = await agents['accounting'].execute({
            input: {
                ocrResult,
                businessType: input.businessType,
                taxContext: taxContext?.data,
            },
        });
        // Step 4: Japan Tax Calculation
        const taxResult = await agents['japan-tax'].execute({
            input: {
                transactionData: {
                    amount: ocrResult.amount || 0,
                    date: ocrResult.date || new Date().toISOString().split('T')[0],
                    category: accountingResult.category || '未分類',
                    vendor: ocrResult.vendor || 'Unknown',
                    isDeductible: accountingResult.deductible,
                },
            },
        });
        // Step 5: Database Save (if autoSave enabled)
        let saveResult = null;
        if (input.autoSave !== false) {
            saveResult = await agents['database'].execute({
                input: {
                    data: {
                        file_name: input.fileName || 'unknown',
                        vendor_name: ocrResult.vendor || 'Unknown',
                        total_amount: ocrResult.amount || 0,
                        tax_amount: taxResult.consumptionTax || 0,
                        receipt_date: ocrResult.date || new Date().toISOString().split('T')[0],
                        category: accountingResult.category || '未分類',
                        subcategory: accountingResult.subcategory,
                        extracted_text: ocrResult.text,
                        confidence: ocrResult.confidence || 0,
                        metadata: {
                            taxDetails: taxResult,
                            accountingAnalysis: accountingResult,
                            ocrDetails: ocrResult,
                        },
                    },
                },
            });
        }
        return {
            success: true,
            workflow: 'document_processing',
            results: {
                ocr: ocrResult,
                accounting: accountingResult,
                tax: taxResult,
                database: saveResult,
                taxContext,
            },
            summary: {
                vendor: ocrResult.vendor,
                amount: ocrResult.amount,
                category: accountingResult.category,
                deductible: accountingResult.deductible,
                savedToDb: !!saveResult,
            },
        };
    }
    catch (error) {
        logger_1.logger.error('❌ Workflow error:', error);
        return {
            success: false,
            workflow: 'document_processing',
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}
// 自然言語処理
async function processNaturalLanguage(input, context) {
    // 簡易的な意図解析
    const intent = analyzeIntent(input);
    switch (intent.type) {
        case 'create_document':
            // 文書作成の処理
            return {
                success: true,
                intent,
                response: `${intent.documentType}を作成します。`,
                action: 'create_document',
                data: { documentType: intent.documentType },
            };
        case 'analyze_data':
            // データ分析の処理
            return {
                success: true,
                intent,
                response: '売上データを分析します。',
                action: 'analyze_data',
            };
        case 'tax_return':
            // 確定申告の処理
            const taxReturnResult = await taxReturnAgent.execute({
                input: {
                    operation: 'prepare_return',
                    year: new Date().getFullYear() - 1,
                    companyId: context?.companyId,
                },
            });
            return {
                success: true,
                intent,
                response: '確定申告の準備を開始します。',
                action: 'tax_return',
                data: taxReturnResult,
            };
        default:
            return {
                success: true,
                intent,
                response: 'ご要望を理解できませんでした。もう少し詳しく教えていただけますか？',
            };
    }
}
// 簡易的な意図解析
function analyzeIntent(input) {
    if (input.includes('請求書') || input.includes('invoice')) {
        return { type: 'create_document', documentType: 'invoice' };
    }
    else if (input.includes('見積書') || input.includes('estimate')) {
        return { type: 'create_document', documentType: 'estimate' };
    }
    else if (input.includes('領収書') || input.includes('receipt')) {
        return { type: 'create_document', documentType: 'receipt' };
    }
    else if (input.includes('売上') || input.includes('分析')) {
        return { type: 'analyze_data' };
    }
    else if (input.includes('確定申告') || input.includes('税')) {
        return { type: 'tax_return' };
    }
    return { type: 'unknown' };
}
async function POST(req) {
    try {
        const body = await req.json();
        const { action, input, agent, workflow } = body;
        // ワークフロー実行
        if (workflow) {
            switch (workflow) {
                case 'document_processing':
                    const result = await executeDocumentWorkflow(input);
                    return server_1.NextResponse.json(result);
                default:
                    return server_1.NextResponse.json({
                        success: false,
                        error: `Unknown workflow: ${workflow}`,
                    });
            }
        }
        // 個別エージェント実行
        if (agent) {
            const targetAgent = agents[agent];
            if (!targetAgent) {
                return server_1.NextResponse.json({
                    success: false,
                    error: `Agent not found: ${agent}`,
                });
            }
            const result = await targetAgent.execute({ input });
            return server_1.NextResponse.json(result);
        }
        // アクション実行
        switch (action) {
            case 'natural_language':
                const nlResult = await processNaturalLanguage(input.text, input.context);
                return server_1.NextResponse.json(nlResult);
            case 'health_check':
                const healthStatus = {
                    status: 'healthy',
                    agents: Object.keys(agents),
                    workflows: ['document_processing'],
                    timestamp: new Date().toISOString(),
                };
                return server_1.NextResponse.json(healthStatus);
            default:
                return server_1.NextResponse.json({
                    success: false,
                    error: 'No valid action, agent, or workflow specified',
                });
        }
    }
    catch (error) {
        logger_1.logger.error('Orchestrator API error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }
}
async function GET(req) {
    return server_1.NextResponse.json({
        status: 'healthy',
        availableAgents: Object.keys(agents),
        availableWorkflows: ['document_processing'],
        availableActions: ['natural_language', 'health_check'],
        timestamp: new Date().toISOString(),
    });
}
