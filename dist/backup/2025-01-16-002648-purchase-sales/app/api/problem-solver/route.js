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
exports.POST = POST;
exports.GET = GET;
exports.OPTIONS = OPTIONS;
const server_1 = require("next/server");
const problem_solving_agent_1 = require("@/src/agents/problem-solving-agent");
async function POST(request) {
    try {
        const body = await request.json();
        // 後方互換性のためのレガシーフォーマット変換
        let operation = body.operation;
        let data = body.data;
        // レガシー形式（problem, domain等）から新形式に変換
        if (!operation && body.problem) {
            operation = 'solve_problem';
            data = {
                problem: body.problem,
                context: {
                    priority: 'medium',
                    domain: body.domain || 'general',
                    requiredTools: [],
                    constraints: {},
                },
                companyId: '11111111-1111-1111-1111-111111111111',
            };
        }
        // 必須パラメータの検証
        if (!operation || !data) {
            return server_1.NextResponse.json({ error: 'operation と data パラメータが必要です' }, { status: 400 });
        }
        // companyId の設定
        if (!data.companyId) {
            data.companyId = '11111111-1111-1111-1111-111111111111';
        }
        console.log('Problem Solver API - Request:', {
            operation: operation,
            dataType: typeof data,
            timestamp: new Date().toISOString(),
        });
        // 問題解決エージェントの実行
        let result;
        switch (operation) {
            case 'solve_problem':
                result = await (0, problem_solving_agent_1.solveProblem)(operation, data);
                break;
            case 'analyze_data':
                result = await (0, problem_solving_agent_1.analyzeData)(data);
                break;
            case 'generate_report':
                result = await (0, problem_solving_agent_1.generateReport)(data);
                break;
            default:
                return server_1.NextResponse.json({ error: `サポートされていない操作: ${operation}` }, { status: 400 });
        }
        console.log('Problem Solver API - Result:', {
            success: result.success,
            executionTime: result.executionTime,
            resourcesUsed: result.resourcesUsed,
        });
        // レガシー形式のレスポンス（後方互換性）
        const legacyResponse = {
            success: result.success,
            solution: result.solution || {
                problem: data.problem || 'Unknown problem',
                steps: result.solution?.steps?.map(step => step.action) || [
                    '問題の分析と理解',
                    '関連情報の収集',
                    '可能な解決策の検討',
                    '最適な解決策の選択',
                    '実行計画の立案',
                ],
                recommendations: result.solution?.recommendations || [
                    '問題解決プロセスを実行しました',
                ],
            },
            searchResults: result.research ? {
                query: data.problem || data.topic,
                results: result.research.sources.map(source => ({
                    title: source.title,
                    url: source.url || '#',
                    snippet: `関連度: ${Math.round(source.relevance * 100)}%`,
                })),
            } : null,
            visualAnalysis: null, // 今回は実装なし
            summary: result.reasoning,
            // 新しい詳細データ
            detailed_result: result,
            timestamp: new Date().toISOString(),
        };
        return server_1.NextResponse.json(legacyResponse);
    }
    catch (error) {
        console.error('Problem Solver API Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '問題解決処理中にエラーが発生しました',
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        if (sessionId) {
            // 特定のセッションのログを取得
            const { DatabaseService, Collections } = await Promise.resolve().then(() => __importStar(require('@/lib/mongodb-client')));
            const db = DatabaseService.getInstance();
            const logs = await db.findMany(Collections.AUDIT_LOGS, {
                sessionId: sessionId,
            });
            return server_1.NextResponse.json({
                success: true,
                logs,
                timestamp: new Date().toISOString(),
            });
        }
        // 問題解決エージェントのステータスを返す
        const status = {
            available: true,
            agentVersion: '2.0.0',
            capabilities: [
                '段階的な問題分解と解決',
                'データベース分析とインサイト生成',
                'プロセス最適化の提案',
                'トラブルシューティング',
                '調査と研究支援',
            ],
            tools: [
                { name: 'database-analysis', status: 'active', description: 'MongoDB データベース分析' },
                { name: 'sequential-thinking', status: 'active', description: '段階的思考プロセス' },
                { name: 'process-optimization', status: 'active', description: 'プロセス最適化' },
                { name: 'insight-generation', status: 'active', description: 'インサイト生成' },
            ],
            operations: [
                { name: 'solve_problem', description: '複雑な問題の解決' },
                { name: 'analyze_data', description: 'データ分析とパターン検出' },
                { name: 'research_topic', description: '調査と研究' },
                { name: 'optimize_process', description: 'プロセス最適化' },
                { name: 'troubleshoot', description: 'トラブルシューティング' },
                { name: 'generate_insights', description: 'インサイト生成' },
            ],
            integrations: {
                mongodb: true,
                mastra: true,
                audit_logging: true,
            },
        };
        return server_1.NextResponse.json({ success: true, status });
    }
    catch (error) {
        console.error('Problem Solver GET API Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'ステータス取得エラー'
        }, { status: 500 });
    }
}
// OPTIONS メソッドでCORS対応
async function OPTIONS() {
    return new server_1.NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
