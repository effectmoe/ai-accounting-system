'use client';

import { useState } from 'react';

interface ProblemSolvingResult {
  success: boolean;
  solution?: any;
  searchResults?: any;
  visualAnalysis?: any;
  error?: string;
  summary?: string;
}

export default function ProblemSolvingSection() {
  const [problem, setProblem] = useState('');
  const [domain, setDomain] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [requiresWebSearch, setRequiresWebSearch] = useState(true);
  const [requiresDataAnalysis, setRequiresDataAnalysis] = useState(false);
  const [requiresVisualAnalysis, setRequiresVisualAnalysis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProblemSolvingResult | null>(null);

  const solveProblem = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/problem-solver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem,
          domain: domain || undefined,
          requiresWebSearch,
          requiresDataAnalysis,
          visualData: requiresVisualAnalysis && imageUrl ? {
            imageUrl,
            analysisType: 'general'
          } : undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '問題解決中にエラーが発生しました',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMCPServerStatus = () => {
    const servers = [
      { name: 'Perplexity', icon: '🔍', status: 'active' },
      { name: 'Sequential Thinking', icon: '🧠', status: 'active' },
      { name: 'Midscene', icon: '👁️', status: 'active' },
      { name: 'Firecrawl', icon: '🕷️', status: 'active' },
      { name: 'DataForSEO', icon: '📊', status: 'active' },
      { name: 'Playwright', icon: '🎭', status: 'active' },
      { name: 'Filesystem', icon: '📁', status: 'active' },
    ];
    return servers;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">🧠 問題解決専門エージェント</h2>
      
      {/* MCPサーバーステータス */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">統合MCPサーバー</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {getMCPServerStatus().map((server) => (
            <div key={server.name} className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1">
              <span className="text-lg">{server.icon}</span>
              <span className="text-xs text-gray-600">{server.name}</span>
              <span className="w-2 h-2 bg-green-400 rounded-full ml-auto"></span>
            </div>
          ))}
        </div>
      </div>

      {/* 問題入力フォーム */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            解決したい問題
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="例: 競合サイトを分析して、改善点を提案してください"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ドメイン/URL（オプション）
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像URL（ビジュアル分析用）
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>

        {/* オプション */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={requiresWebSearch}
              onChange={(e) => setRequiresWebSearch(e.target.checked)}
            />
            <span className="text-sm">Web検索を使用</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={requiresDataAnalysis}
              onChange={(e) => setRequiresDataAnalysis(e.target.checked)}
            />
            <span className="text-sm">データ分析を実行</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={requiresVisualAnalysis}
              onChange={(e) => setRequiresVisualAnalysis(e.target.checked)}
            />
            <span className="text-sm">ビジュアル分析を実行</span>
          </label>
        </div>

        {/* 実行ボタン */}
        <button
          onClick={solveProblem}
          disabled={!problem || isLoading}
          className={`w-full md:w-auto px-6 py-2 rounded-md font-medium transition-colors ${
            isLoading || !problem
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              問題を解決中...
            </span>
          ) : (
            '問題を解決'
          )}
        </button>
      </div>

      {/* 結果表示 */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ 解決策が見つかりました' : '❌ エラーが発生しました'}
            </h3>
            {result.error && (
              <p className="text-red-600 text-sm mt-1">{result.error}</p>
            )}
          </div>

          {result.success && result.summary && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">解決策の要約</h4>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{result.summary}</p>
            </div>
          )}

          {result.searchResults && (
            <details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">Web検索結果</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60">
                {JSON.stringify(result.searchResults, null, 2)}
              </pre>
            </details>
          )}

          {result.visualAnalysis && (
            <details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">ビジュアル分析結果</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60">
                {JSON.stringify(result.visualAnalysis, null, 2)}
              </pre>
            </details>
          )}

          {result.solution && (
            <details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">詳細な解決策</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-96">
                {JSON.stringify(result.solution, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}