"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mastra_orchestrator_1 = require("../src/mastra-orchestrator");
// 環境変数を設定
(0, vitest_1.beforeAll)(() => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
    process.env.DATAFORSEO_API_KEY = 'test-dataforseo-key';
    process.env.MIDSCENE_API_KEY = 'test-midscene-key';
    process.env.MIDSCENE_CHROME_EXTENSION_ID = 'test-extension-id';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});
// fetchのモック
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)('Mastra Orchestrator - Problem Solving Integration', () => {
    let orchestrator;
    (0, vitest_1.beforeAll)(() => {
        orchestrator = new mastra_orchestrator_1.MastraOrchestrator();
    });
    (0, vitest_1.describe)('Problem Solving Workflow', () => {
        (0, vitest_1.it)('should execute problem solving workflow with web search', async () => {
            // モックレスポンスの設定
            const mockResponses = [
                // Sequential Thinking
                {
                    ok: true,
                    json: async () => ({
                        choices: [{
                                message: { content: '問題を分析しました' }
                            }]
                    })
                },
                // Perplexity Search
                {
                    ok: true,
                    json: async () => ({
                        choices: [{
                                message: { content: '競合分析の結果です' }
                            }],
                        sources: ['https://competitor.com']
                    })
                },
                // Extended problem solving
                {
                    ok: true,
                    json: async () => ({
                        choices: [{
                                message: { content: '詳細な解決策です' }
                            }]
                    })
                },
                // Final solution
                {
                    ok: true,
                    json: async () => ({
                        choices: [{
                                message: { content: '最終的な推奨事項' }
                            }]
                    })
                }
            ];
            let fetchCallIndex = 0;
            global.fetch.mockImplementation(() => {
                const response = mockResponses[fetchCallIndex % mockResponses.length];
                fetchCallIndex++;
                return Promise.resolve(response);
            });
            const result = await orchestrator.executeProblemSolvingWorkflow({
                problem: '競合サイトを分析して改善提案をしてください',
                domain: 'https://example.com',
                requiresWebSearch: true,
                requiresDataAnalysis: false,
                visualData: undefined,
            });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.workflow).toBe('problem_solving');
            (0, vitest_1.expect)(result.problemAnalysis).toBeTruthy();
            (0, vitest_1.expect)(result.searchResults).toBeTruthy();
            (0, vitest_1.expect)(result.solution).toBeTruthy();
            (0, vitest_1.expect)(result.summary).toContain('解決策');
        });
        (0, vitest_1.it)('should handle visual analysis in problem solving', async () => {
            // Mock responses
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                            message: { content: '分析結果' }
                        }]
                })
            });
            const result = await orchestrator.executeProblemSolvingWorkflow({
                problem: 'このチャートを分析してください',
                requiresWebSearch: false,
                visualData: {
                    imageUrl: 'https://example.com/chart.png',
                    analysisType: 'chart'
                }
            });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.visualAnalysis).toBeTruthy();
        });
        (0, vitest_1.it)('should handle errors gracefully', async () => {
            // エラーレスポンスのモック
            global.fetch.mockRejectedValue(new Error('API Error'));
            const result = await orchestrator.executeProblemSolvingWorkflow({
                problem: 'エラーテスト',
                requiresWebSearch: true
            });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Failed to execute problem solving workflow');
        });
    });
    (0, vitest_1.describe)('Tool Integration', () => {
        (0, vitest_1.it)('should have problem solving tools available', () => {
            const tools = orchestrator['createTools']();
            (0, vitest_1.expect)(tools.solveProblem).toBeDefined();
            (0, vitest_1.expect)(tools.webSearch).toBeDefined();
            (0, vitest_1.expect)(tools.visualAnalysis).toBeDefined();
        });
        (0, vitest_1.it)('should execute web search tool', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                            message: { content: '検索結果' }
                        }],
                    sources: ['https://source.com']
                })
            });
            const tools = orchestrator['createTools']();
            const result = await tools.webSearch.execute({
                query: 'AI会計システム',
                searchType: 'technical',
                maxResults: 5,
                language: 'ja'
            });
            (0, vitest_1.expect)(result.query).toBe('AI会計システム');
            (0, vitest_1.expect)(result.results).toBeTruthy();
        });
        (0, vitest_1.it)('should execute visual analysis tool', async () => {
            const tools = orchestrator['createTools']();
            const result = await tools.visualAnalysis.execute({
                imageUrl: 'https://example.com/image.png',
                analysisType: 'general',
                extractData: true
            });
            (0, vitest_1.expect)(result.imageUrl).toBe('https://example.com/image.png');
            (0, vitest_1.expect)(result.analysis).toBeTruthy();
        });
    });
    (0, vitest_1.describe)('Agent Integration', () => {
        (0, vitest_1.it)('should have problem-solving-agent initialized', () => {
            const agents = orchestrator['agents'];
            (0, vitest_1.expect)(agents.has('problem-solving-agent')).toBe(true);
        });
        (0, vitest_1.it)('should coordinate with other agents', async () => {
            // Mock UI agent response
            const mockUIResult = {
                component: 'ProblemSolutionDisplay',
                props: { solution: 'Test solution' }
            };
            // Override UI agent execute
            const uiAgent = orchestrator['agents'].get('ui-agent');
            if (uiAgent) {
                uiAgent.execute = vitest_1.vi.fn().mockResolvedValue(mockUIResult);
            }
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                            message: { content: 'Solution' }
                        }]
                })
            });
            const result = await orchestrator.executeProblemSolvingWorkflow({
                problem: 'UI生成テスト',
                requiresWebSearch: false
            });
            (0, vitest_1.expect)(result.ui).toBeTruthy();
            (0, vitest_1.expect)(result.ui.component).toBe('ProblemSolutionDisplay');
        });
    });
});
