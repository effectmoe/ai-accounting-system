"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// 環境変数を設定
(0, vitest_1.beforeAll)(() => {
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
    process.env.DATAFORSEO_API_KEY = 'test-dataforseo-key';
    process.env.MIDSCENE_API_KEY = 'test-midscene-key';
    process.env.MIDSCENE_CHROME_EXTENSION_ID = 'test-extension-id';
});
// problemSolvingAgentをインポート（環境変数設定後）
const problem_solving_agent_1 = require("../src/agents/problem-solving-agent");
// fetchのモック
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)('Problem Solving Agent', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('searchWithPerplexity', () => {
        (0, vitest_1.it)('should perform basic search successfully', async () => {
            const mockResponse = {
                choices: [{
                        message: {
                            content: '検索結果: AIを活用した会計システムの最新トレンド'
                        }
                    }],
                sources: ['https://example.com'],
                images: []
            };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.searchWithPerplexity.execute({
                query: 'AI会計システムのトレンド',
                searchDepth: 'basic',
                includeImages: false
            });
            (0, vitest_1.expect)(result.answer).toContain('AIを活用した会計システム');
            (0, vitest_1.expect)(result.sources).toHaveLength(1);
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith('https://api.perplexity.ai/chat/completions', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Authorization': 'Bearer test-perplexity-key'
                })
            }));
        });
        (0, vitest_1.it)('should handle API errors gracefully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Unauthorized'
            });
            await (0, vitest_1.expect)(problem_solving_agent_1.problemSolvingAgent.tools.searchWithPerplexity.execute({
                query: 'test query',
                searchDepth: 'basic'
            })).rejects.toThrow('Perplexity API error: Unauthorized');
        });
    });
    (0, vitest_1.describe)('sequentialThinking', () => {
        (0, vitest_1.it)('should break down problems into steps', async () => {
            const mockResponse = {
                choices: [{
                        message: {
                            content: '問題を分析しました: ステップ1の詳細'
                        }
                    }]
            };
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.sequentialThinking.execute({
                problem: '会計システムの効率を改善する方法',
                context: {
                    constraints: ['予算10万円以内'],
                    goals: ['処理速度向上']
                }
            });
            (0, vitest_1.expect)(result.problem).toBe('会計システムの効率を改善する方法');
            (0, vitest_1.expect)(result.steps).toHaveLength(6);
            (0, vitest_1.expect)(result.steps[0]).toContain('問題の定義と理解');
        });
    });
    (0, vitest_1.describe)('visualAnalysis', () => {
        (0, vitest_1.it)('should analyze images without Chrome extension', async () => {
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.visualAnalysis.execute({
                imageUrl: 'https://example.com/chart.png',
                analysisType: 'content',
                extractText: true
            });
            (0, vitest_1.expect)(result.type).toBe('content');
            (0, vitest_1.expect)(result.text).toBe('Extracted text from image');
            (0, vitest_1.expect)(result.elements).toContain('button');
            (0, vitest_1.expect)(result.chromeData).toBeNull();
        });
        (0, vitest_1.it)('should use Chrome extension when enabled', async () => {
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.visualAnalysis.execute({
                analysisType: 'ui',
                extractText: false,
                chromeExtension: {
                    enabled: true,
                    action: 'analyze'
                }
            });
            (0, vitest_1.expect)(result.chromeData).toBeTruthy();
            (0, vitest_1.expect)(result.chromeData?.status).toBe('connected');
            (0, vitest_1.expect)(result.chromeData?.action).toBe('analyze');
            (0, vitest_1.expect)(result.elements).toContain('navbar');
        });
    });
    (0, vitest_1.describe)('fileSystemOperation', () => {
        (0, vitest_1.it)('should check security for file operations', async () => {
            // 許可されたパスでの読み取り
            const readResult = await problem_solving_agent_1.problemSolvingAgent.tools.fileSystemOperation.execute({
                operation: 'read',
                path: '/Users/tonychustudio/Documents/test.txt'
            });
            (0, vitest_1.expect)(readResult.operation).toBe('read');
            (0, vitest_1.expect)(readResult.status).not.toBe('failed');
            // 許可されていないパスでの読み取り
            const unauthorizedResult = await problem_solving_agent_1.problemSolvingAgent.tools.fileSystemOperation.execute({
                operation: 'read',
                path: '/etc/passwd'
            });
            (0, vitest_1.expect)(unauthorizedResult.error).toContain('Access denied');
            (0, vitest_1.expect)(unauthorizedResult.status).toBe('failed');
        });
        (0, vitest_1.it)('should handle different file operations', async () => {
            const operations = ['list', 'mkdir', 'write'];
            for (const op of operations) {
                const result = await problem_solving_agent_1.problemSolvingAgent.tools.fileSystemOperation.execute({
                    operation: op,
                    path: '/Users/tonychustudio/Documents/test',
                    content: op === 'write' ? 'test content' : undefined
                });
                (0, vitest_1.expect)(result.operation).toBe(op);
            }
        });
    });
    (0, vitest_1.describe)('solveProblem', () => {
        (0, vitest_1.it)('should integrate multiple tools for problem solving', async () => {
            // Perplexity検索のモック
            global.fetch
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                            message: { content: '検索結果: 競合分析' }
                        }],
                    sources: []
                })
            })
                // Sequential Thinking のモック
                .mockResolvedValue({
                ok: true,
                json: async () => ({
                    choices: [{
                            message: { content: 'ステップ分析結果' }
                        }]
                })
            });
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.solveProblem.execute({
                problem: '競合サイトを分析して改善提案をしてください',
                requiresWebSearch: true,
                requiresDataAnalysis: false,
                requiresVisualAnalysis: false,
                context: { domain: 'example.com' }
            });
            (0, vitest_1.expect)(result.problem).toBe('競合サイトを分析して改善提案をしてください');
            (0, vitest_1.expect)(result.steps).toBeTruthy();
            (0, vitest_1.expect)(result.data.searchResults).toBeTruthy();
            (0, vitest_1.expect)(result.recommendations).toHaveLength(3);
        });
    });
    (0, vitest_1.describe)('chromeExtensionControl', () => {
        (0, vitest_1.it)('should manage Chrome extension connection', async () => {
            const connectResult = await problem_solving_agent_1.problemSolvingAgent.tools.chromeExtensionControl.execute({
                command: 'connect'
            });
            (0, vitest_1.expect)(connectResult.status).toBe('connected');
            (0, vitest_1.expect)(connectResult.settings.enableAIAnalysis).toBe(true);
            const statusResult = await problem_solving_agent_1.problemSolvingAgent.tools.chromeExtensionControl.execute({
                command: 'getStatus'
            });
            (0, vitest_1.expect)(statusResult.status).toBe('connected');
            const disconnectResult = await problem_solving_agent_1.problemSolvingAgent.tools.chromeExtensionControl.execute({
                command: 'disconnect'
            });
            (0, vitest_1.expect)(disconnectResult.status).toBe('disconnected');
        });
        (0, vitest_1.it)('should configure Chrome extension settings', async () => {
            const result = await problem_solving_agent_1.problemSolvingAgent.tools.chromeExtensionControl.execute({
                command: 'configureSetting',
                settings: {
                    autoCapture: true,
                    captureInterval: 10000,
                    enableAIAnalysis: false
                }
            });
            (0, vitest_1.expect)(result.status).toBe('configured');
            (0, vitest_1.expect)(result.settings.autoCapture).toBe(true);
            (0, vitest_1.expect)(result.settings.captureInterval).toBe(10000);
        });
    });
});
