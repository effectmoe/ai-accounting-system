import { describe, it, expect, vi, beforeAll } from 'vitest';
import { MastraOrchestrator } from '../src/mastra-orchestrator';

// 環境変数を設定
beforeAll(() => {
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
global.fetch = vi.fn();

describe('Mastra Orchestrator - Problem Solving Integration', () => {
  let orchestrator: MastraOrchestrator;

  beforeAll(() => {
    orchestrator = new MastraOrchestrator();
  });

  describe('Problem Solving Workflow', () => {
    it('should execute problem solving workflow with web search', async () => {
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
      (global.fetch as any).mockImplementation(() => {
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

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('problem_solving');
      expect(result.problemAnalysis).toBeTruthy();
      expect(result.searchResults).toBeTruthy();
      expect(result.solution).toBeTruthy();
      expect(result.summary).toContain('解決策');
    });

    it('should handle visual analysis in problem solving', async () => {
      // Mock responses
      (global.fetch as any).mockResolvedValue({
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

      expect(result.success).toBe(true);
      expect(result.visualAnalysis).toBeTruthy();
    });

    it('should handle errors gracefully', async () => {
      // エラーレスポンスのモック
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      const result = await orchestrator.executeProblemSolvingWorkflow({
        problem: 'エラーテスト',
        requiresWebSearch: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to execute problem solving workflow');
    });
  });

  describe('Tool Integration', () => {
    it('should have problem solving tools available', () => {
      const tools = orchestrator['createTools']();
      
      expect(tools.solveProblem).toBeDefined();
      expect(tools.webSearch).toBeDefined();
      expect(tools.visualAnalysis).toBeDefined();
    });

    it('should execute web search tool', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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

      expect(result.query).toBe('AI会計システム');
      expect(result.results).toBeTruthy();
    });

    it('should execute visual analysis tool', async () => {
      const tools = orchestrator['createTools']();
      const result = await tools.visualAnalysis.execute({
        imageUrl: 'https://example.com/image.png',
        analysisType: 'general',
        extractData: true
      });

      expect(result.imageUrl).toBe('https://example.com/image.png');
      expect(result.analysis).toBeTruthy();
    });
  });

  describe('Agent Integration', () => {
    it('should have problem-solving-agent initialized', () => {
      const agents = orchestrator['agents'];
      expect(agents.has('problem-solving-agent')).toBe(true);
    });

    it('should coordinate with other agents', async () => {
      // Mock UI agent response
      const mockUIResult = {
        component: 'ProblemSolutionDisplay',
        props: { solution: 'Test solution' }
      };

      // Override UI agent execute
      const uiAgent = orchestrator['agents'].get('ui-agent');
      if (uiAgent) {
        uiAgent.execute = vi.fn().mockResolvedValue(mockUIResult);
      }

      (global.fetch as any).mockResolvedValue({
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

      expect(result.ui).toBeTruthy();
      expect(result.ui.component).toBe('ProblemSolutionDisplay');
    });
  });
});