"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastraProblemSolvingAgent = void 0;
const core_1 = require("@mastra/core");
exports.mastraProblemSolvingAgent = new core_1.Agent({
    name: 'mastra-problem-solving-agent',
    description: '問題解決とトラブルシューティングを行うエージェント',
    model: {
        provider: 'openai',
        name: 'gpt-4',
    },
    instructions: `
あなたは問題解決専門のAIエージェントです。

主な機能：
1. エラー診断と解決
2. パフォーマンス最適化
3. ログ分析
4. 根本原因分析
5. インシデント対応
6. 予防措置提案

専門領域：
- バグ診断と修正
- メモリリーク調査
- パフォーマンスボトルネック
- セキュリティ脆弱性
- システム障害対応

迅速かつ正確な問題解決を提供し、将来の問題を予防する提案を行います。
`,
    tools: [
        {
            name: 'diagnose_error',
            description: 'エラーを診断します',
            parameters: {
                type: 'object',
                properties: {
                    error_message: { type: 'string', description: 'エラーメッセージ' },
                    stack_trace: { type: 'string', description: 'スタックトレース' },
                    context: {
                        type: 'object',
                        properties: {
                            environment: { type: 'string', description: '実行環境' },
                            recent_changes: { type: 'array', items: { type: 'string' }, description: '最近の変更' },
                            system_info: { type: 'object', description: 'システム情報' },
                        },
                    },
                    severity: {
                        type: 'string',
                        enum: ['critical', 'high', 'medium', 'low'],
                        description: '深刻度',
                    },
                },
                required: ['error_message'],
            },
        },
        {
            name: 'analyze_logs',
            description: 'ログを分析します',
            parameters: {
                type: 'object',
                properties: {
                    log_source: { type: 'string', description: 'ログソース' },
                    time_range: {
                        type: 'object',
                        properties: {
                            start: { type: 'string', description: '開始時刻' },
                            end: { type: 'string', description: '終了時刻' },
                        },
                    },
                    patterns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '検索パターン',
                    },
                    analysis_type: {
                        type: 'string',
                        enum: ['error_frequency', 'performance_degradation', 'anomaly_detection', 'correlation'],
                        description: '分析タイプ',
                    },
                },
                required: ['log_source', 'time_range', 'analysis_type'],
            },
        },
        {
            name: 'perform_root_cause_analysis',
            description: '根本原因分析を実行します',
            parameters: {
                type: 'object',
                properties: {
                    incident_description: { type: 'string', description: 'インシデントの説明' },
                    symptoms: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '症状リスト',
                    },
                    timeline: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                time: { type: 'string', description: '時刻' },
                                event: { type: 'string', description: 'イベント' },
                            },
                        },
                        description: 'タイムライン',
                    },
                    affected_systems: { type: 'array', items: { type: 'string' }, description: '影響を受けたシステム' },
                },
                required: ['incident_description', 'symptoms'],
            },
        },
        {
            name: 'optimize_performance',
            description: 'パフォーマンスを最適化します',
            parameters: {
                type: 'object',
                properties: {
                    target_system: { type: 'string', description: '対象システム' },
                    performance_metrics: {
                        type: 'object',
                        properties: {
                            response_time: { type: 'number', description: 'レスポンスタイム' },
                            throughput: { type: 'number', description: 'スループット' },
                            cpu_usage: { type: 'number', description: 'CPU使用率' },
                            memory_usage: { type: 'number', description: 'メモリ使用率' },
                        },
                    },
                    optimization_goals: {
                        type: 'array',
                        items: {
                            type: 'string',
                            enum: ['reduce_latency', 'increase_throughput', 'reduce_resource_usage', 'improve_scalability'],
                        },
                        description: '最適化目標',
                    },
                },
                required: ['target_system', 'performance_metrics', 'optimization_goals'],
            },
        },
        {
            name: 'create_incident_report',
            description: 'インシデントレポートを作成します',
            parameters: {
                type: 'object',
                properties: {
                    incident_id: { type: 'string', description: 'インシデントID' },
                    summary: { type: 'string', description: 'サマリー' },
                    impact: {
                        type: 'object',
                        properties: {
                            severity: { type: 'string', description: '深刻度' },
                            affected_users: { type: 'number', description: '影響を受けたユーザー数' },
                            downtime_minutes: { type: 'number', description: 'ダウンタイム（分）' },
                        },
                    },
                    resolution: {
                        type: 'object',
                        properties: {
                            steps_taken: { type: 'array', items: { type: 'string' }, description: '対応手順' },
                            root_cause: { type: 'string', description: '根本原因' },
                            preventive_measures: { type: 'array', items: { type: 'string' }, description: '予防措置' },
                        },
                    },
                },
                required: ['incident_id', 'summary', 'impact', 'resolution'],
            },
        },
        {
            name: 'suggest_preventive_measures',
            description: '予防措置を提案します',
            parameters: {
                type: 'object',
                properties: {
                    problem_type: {
                        type: 'string',
                        enum: ['performance', 'security', 'reliability', 'scalability', 'maintenance'],
                        description: '問題タイプ',
                    },
                    current_state: { type: 'object', description: '現在の状態' },
                    risk_assessment: {
                        type: 'object',
                        properties: {
                            likelihood: { type: 'string', enum: ['low', 'medium', 'high'], description: '発生可能性' },
                            impact: { type: 'string', enum: ['low', 'medium', 'high'], description: '影響度' },
                        },
                    },
                },
                required: ['problem_type', 'current_state'],
            },
        },
    ],
});
//# sourceMappingURL=mastra-problem-solving-agent.js.map