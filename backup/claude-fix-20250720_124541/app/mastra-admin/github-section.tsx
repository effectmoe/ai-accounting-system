'use client';

import { useState } from 'react';

export default function GitHubSection() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [reportDates, setReportDates] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // サンプルログの生成
  const generateSampleLogs = () => {
    const levels = ['info', 'warning', 'error', 'success'];
    const agents = ['ocr-agent', 'accounting-agent', 'tax-return-agent', 'nlweb-agent'];
    const workflows = ['document_processing', 'tax_calculation', 'nlp_processing'];
    
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)] as any,
      agent: agents[Math.floor(Math.random() * agents.length)],
      workflow: workflows[Math.floor(Math.random() * workflows.length)],
      message: `テスト処理 ${i + 1} が実行されました`,
      executionTime: Math.floor(Math.random() * 5000) + 500
    }));
  };

  // ログの保存
  const saveLogs = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const logs = generateSampleLogs();
      const response = await fetch('/api/mastra/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ ${result.count}件のログをGitHubに保存しました: ${result.path}`);
      } else {
        setMessage(`❌ エラー: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // バージョンリリース
  const releaseVersion = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const version = `1.0.${Math.floor(Math.random() * 100)}`;
      const response = await fetch('/api/mastra/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          changes: [
            'OCRエージェントのパフォーマンス改善',
            '確定申告機能の追加',
            'バグ修正とセキュリティアップデート'
          ],
          agents: ['ocr-agent', 'accounting-agent', 'tax-return-agent'],
          workflows: ['document_processing', 'tax_calculation'],
          config: {
            llm: 'deepseek-v3',
            features: ['nlp', 'ocr', 'tax']
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage(`✅ バージョン ${version} をリリースしました: ${result.tag}`);
      } else {
        setMessage(`❌ エラー: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // レポート生成
  const generateReport = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/mastra/logs?start=${reportDates.start}&end=${reportDates.end}`);
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ レポートを生成しました: ${result.path}`);
      } else {
        setMessage(`❌ エラー: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 最新バージョン取得
  const getLatestVersion = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/mastra/version');
      const result = await response.json();
      
      if (result.version) {
        setMessage(`📦 最新バージョン: v${result.version} (${new Date(result.timestamp).toLocaleString('ja-JP')})`);
      } else {
        setMessage('バージョン情報が見つかりません');
      }
    } catch (error) {
      setMessage(`❌ エラー: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        GitHub連携
      </h2>

      <div className="space-y-4">
        {/* ログ管理 */}
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">ログ管理</h3>
          <p className="text-sm text-gray-600 mb-3">
            AAMシステムの実行ログをGitHubリポジトリに保存します
          </p>
          <button
            onClick={saveLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            サンプルログを保存
          </button>
        </div>

        {/* バージョン管理 */}
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">バージョン管理</h3>
          <p className="text-sm text-gray-600 mb-3">
            新しいバージョンをリリースしてタグを作成します
          </p>
          <div className="flex gap-2">
            <button
              onClick={releaseVersion}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              新バージョンをリリース
            </button>
            <button
              onClick={getLatestVersion}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              最新バージョン確認
            </button>
          </div>
        </div>

        {/* レポート生成 */}
        <div className="border rounded p-4">
          <h3 className="font-medium mb-2">統計レポート</h3>
          <p className="text-sm text-gray-600 mb-3">
            指定期間のログから統計レポートを生成します
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="date"
              value={reportDates.start}
              onChange={(e) => setReportDates({ ...reportDates, start: e.target.value })}
              className="px-3 py-2 border rounded"
            />
            <span className="py-2">〜</span>
            <input
              type="date"
              value={reportDates.end}
              onChange={(e) => setReportDates({ ...reportDates, end: e.target.value })}
              className="px-3 py-2 border rounded"
            />
          </div>
          <button
            onClick={generateReport}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            レポート生成
          </button>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`p-3 rounded ${
            message.startsWith('✅') ? 'bg-green-100 text-green-800' :
            message.startsWith('❌') ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}

        {/* GitHub設定状態 */}
        <div className="text-sm text-gray-500 mt-4">
          <p>リポジトリ: {process.env.NEXT_PUBLIC_GITHUB_OWNER || 'effectmoe'}/{process.env.NEXT_PUBLIC_GITHUB_REPO || 'mastra-logs'}</p>
          <p>ブランチ: {process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main'}</p>
          <p className="text-xs mt-1">※ GitHubトークンが設定されていない場合は、.env.localに追加してください</p>
        </div>

        {/* 保存先パス情報 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">データ保存先</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">ログ: </span>
              <a 
                href="https://github.com/effectmoe/aam-logs/tree/main/logs/aam-system"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                /logs/aam-system/YYYY/MM/logs-YYYY-MM-DD.json
              </a>
            </div>
            <div>
              <span className="text-gray-600">バージョン: </span>
              <a 
                href="https://github.com/effectmoe/aam-logs/tree/main/versions/aam-system"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                /versions/aam-system/vX.X.X.json
              </a>
            </div>
            <div>
              <span className="text-gray-600">レポート: </span>
              <a 
                href="https://github.com/effectmoe/aam-logs/tree/main/reports/aam-system"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                /reports/aam-system/report-開始日-to-終了日.json
              </a>
            </div>
            <div className="mt-2">
              <span className="text-gray-600">リポジトリ: </span>
              <a 
                href="https://github.com/effectmoe/aam-logs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                https://github.com/effectmoe/aam-logs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}