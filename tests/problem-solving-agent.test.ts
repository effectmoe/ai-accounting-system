import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// 環境変数を設定
beforeAll(() => {
  process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
  process.env.DATAFORSEO_API_KEY = 'test-dataforseo-key';
  process.env.MIDSCENE_API_KEY = 'test-midscene-key';
  process.env.MIDSCENE_CHROME_EXTENSION_ID = 'test-extension-id';
});

// problemSolvingAgentをインポート（環境変数設定後）
import { problemSolvingAgent } from '../src/agents/problem-solving-agent';

// fetchのモック
global.fetch = vi.fn();

describe('Problem Solving Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchWithPerplexity', () => {
    it('should perform basic search successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '検索結果: AIを活用した会計システムの最新トレンド'
          }
        }],
        sources: ['https://example.com'],
        images: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await problemSolvingAgent.tools.searchWithPerplexity.execute({
        query: 'AI会計システムのトレンド',
        searchDepth: 'basic',
        includeImages: false
      });

      expect(result.answer).toContain('AIを活用した会計システム');
      expect(result.sources).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-perplexity-key'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(
        problemSolvingAgent.tools.searchWithPerplexity.execute({
          query: 'test query',
          searchDepth: 'basic'
        })
      ).rejects.toThrow('Perplexity API error: Unauthorized');
    });
  });

  describe('sequentialThinking', () => {
    it('should break down problems into steps', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '問題を分析しました: ステップ1の詳細'
          }
        }]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await problemSolvingAgent.tools.sequentialThinking.execute({
        problem: '会計システムの効率を改善する方法',
        context: {
          constraints: ['予算10万円以内'],
          goals: ['処理速度向上']
        }
      });

      expect(result.problem).toBe('会計システムの効率を改善する方法');
      expect(result.steps).toHaveLength(6);
      expect(result.steps[0]).toContain('問題の定義と理解');
    });
  });

  describe('visualAnalysis', () => {
    it('should analyze images without Chrome extension', async () => {
      const result = await problemSolvingAgent.tools.visualAnalysis.execute({
        imageUrl: 'https://example.com/chart.png',
        analysisType: 'content',
        extractText: true
      });

      expect(result.type).toBe('content');
      expect(result.text).toBe('Extracted text from image');
      expect(result.elements).toContain('button');
      expect(result.chromeData).toBeNull();
    });

    it('should use Chrome extension when enabled', async () => {
      const result = await problemSolvingAgent.tools.visualAnalysis.execute({
        analysisType: 'ui',
        extractText: false,
        chromeExtension: {
          enabled: true,
          action: 'analyze'
        }
      });

      expect(result.chromeData).toBeTruthy();
      expect(result.chromeData?.status).toBe('connected');
      expect(result.chromeData?.action).toBe('analyze');
      expect(result.elements).toContain('navbar');
    });
  });

  describe('fileSystemOperation', () => {
    it('should check security for file operations', async () => {
      // 許可されたパスでの読み取り
      const readResult = await problemSolvingAgent.tools.fileSystemOperation.execute({
        operation: 'read',
        path: '/Users/tonychustudio/Documents/test.txt'
      });

      expect(readResult.operation).toBe('read');
      expect(readResult.status).not.toBe('failed');

      // 許可されていないパスでの読み取り
      const unauthorizedResult = await problemSolvingAgent.tools.fileSystemOperation.execute({
        operation: 'read',
        path: '/etc/passwd'
      });

      expect(unauthorizedResult.error).toContain('Access denied');
      expect(unauthorizedResult.status).toBe('failed');
    });

    it('should handle different file operations', async () => {
      const operations = ['list', 'mkdir', 'write'];
      
      for (const op of operations) {
        const result = await problemSolvingAgent.tools.fileSystemOperation.execute({
          operation: op as any,
          path: '/Users/tonychustudio/Documents/test',
          content: op === 'write' ? 'test content' : undefined
        });

        expect(result.operation).toBe(op);
      }
    });
  });

  describe('solveProblem', () => {
    it('should integrate multiple tools for problem solving', async () => {
      // Perplexity検索のモック
      (global.fetch as any)
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

      const result = await problemSolvingAgent.tools.solveProblem.execute({
        problem: '競合サイトを分析して改善提案をしてください',
        requiresWebSearch: true,
        requiresDataAnalysis: false,
        requiresVisualAnalysis: false,
        context: { domain: 'example.com' }
      });

      expect(result.problem).toBe('競合サイトを分析して改善提案をしてください');
      expect(result.steps).toBeTruthy();
      expect(result.data.searchResults).toBeTruthy();
      expect(result.recommendations).toHaveLength(3);
    });
  });

  describe('chromeExtensionControl', () => {
    it('should manage Chrome extension connection', async () => {
      const connectResult = await problemSolvingAgent.tools.chromeExtensionControl.execute({
        command: 'connect'
      });

      expect(connectResult.status).toBe('connected');
      expect(connectResult.settings.enableAIAnalysis).toBe(true);

      const statusResult = await problemSolvingAgent.tools.chromeExtensionControl.execute({
        command: 'getStatus'
      });

      expect(statusResult.status).toBe('connected');

      const disconnectResult = await problemSolvingAgent.tools.chromeExtensionControl.execute({
        command: 'disconnect'
      });

      expect(disconnectResult.status).toBe('disconnected');
    });

    it('should configure Chrome extension settings', async () => {
      const result = await problemSolvingAgent.tools.chromeExtensionControl.execute({
        command: 'configureSetting',
        settings: {
          autoCapture: true,
          captureInterval: 10000,
          enableAIAnalysis: false
        }
      });

      expect(result.status).toBe('configured');
      expect(result.settings.autoCapture).toBe(true);
      expect(result.settings.captureInterval).toBe(10000);
    });
  });
});