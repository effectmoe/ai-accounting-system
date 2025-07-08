'use client';

import { useState, useEffect } from 'react';
import GitHubSection from './github-section';
import ProblemSolvingSection from './problem-solving-section';

interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'error';
  lastRun?: string;
  executions: number;
  avgTime?: number;
}

interface WorkflowMetric {
  name: string;
  totalRuns: number;
  successRate: number;
  avgDuration: number;
  lastRun?: string;
}

export default function MastraAdminPage() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowMetric[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // 5秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // システム状態の取得
      const statusRes = await fetch('/api/mastra');
      const status = await statusRes.json();
      setSystemStatus(status);

      // エージェント状態（モックデータ）
      const mockAgents: AgentStatus[] = status.agents?.map((agent: string) => ({
        name: agent,
        status: Math.random() > 0.1 ? 'active' : 'idle',
        lastRun: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        executions: Math.floor(Math.random() * 1000),
        avgTime: Math.floor(Math.random() * 5000) + 500,
      })) || [];
      setAgents(mockAgents);

      // ワークフローメトリクス（モックデータ）
      setWorkflows([
        {
          name: 'document_processing',
          totalRuns: 342,
          successRate: 98.5,
          avgDuration: 3200,
          lastRun: new Date(Date.now() - 300000).toISOString(),
        },
        {
          name: 'tax_calculation',
          totalRuns: 156,
          successRate: 99.2,
          avgDuration: 1800,
          lastRun: new Date(Date.now() - 900000).toISOString(),
        },
        {
          name: 'nlp_processing',
          totalRuns: 1024,
          successRate: 95.3,
          avgDuration: 450,
          lastRun: new Date(Date.now() - 60000).toISOString(),
        },
        {
          name: 'problem_solving',
          totalRuns: 89,
          successRate: 97.8,
          avgDuration: 5500,
          lastRun: new Date(Date.now() - 180000).toISOString(),
        },
      ]);

      // 最近のログ（モックデータ）
      setRecentLogs([
        { time: new Date().toISOString(), level: 'info', message: 'NLP処理完了: 請求書作成リクエスト' },
        { time: new Date(Date.now() - 60000).toISOString(), level: 'success', message: 'OCRエージェント: 領収書処理成功' },
        { time: new Date(Date.now() - 120000).toISOString(), level: 'warning', message: 'API Rate Limit接近中' },
        { time: new Date(Date.now() - 180000).toISOString(), level: 'info', message: '確定申告データ準備開始' },
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error('Dashboard data load error:', error);
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP');
  };

  const getAgentDisplayName = (agentName: string): string => {
    const agentNames: Record<string, string> = {
      'ocr-agent': 'OCRエージェント',
      'accounting-agent': '会計エージェント',
      'database-agent': 'データベースエージェント',
      'customer-agent': '顧客管理エージェント',
      'product-agent': '商品管理エージェント',
      'japan-tax-agent': '日本税務エージェント',
      'ui-agent': 'UIエージェント',
      'nlweb-agent': 'AIウェブエージェント',
      'tax-return-agent': '確定申告エージェント',
      'gas-deploy-agent': 'GASデプロイエージェント',
      'gas-ocr-deploy-agent': 'GAS-OCRデプロイエージェント',
      'gas-test-agent': 'GASテストエージェント',
      'gas-update-agent': 'GAS更新エージェント',
      'problem-solving-agent': '問題解決専門エージェント'
    };
    return agentNames[agentName] || agentName;
  };

  const getAgentDescription = (agentName: string): string => {
    const descriptions: Record<string, string> = {
      'ocr-agent': '領収書・請求書の文字認識処理',
      'accounting-agent': '仕訳・帳簿管理・財務分析',
      'database-agent': 'データの保存・取得・管理',
      'customer-agent': '顧客情報の管理・検索・分析',
      'product-agent': '商品・在庫の管理と追跡',
      'japan-tax-agent': '日本の税制に基づく計算・分析',
      'ui-agent': 'ユーザーインターフェース生成',
      'nlweb-agent': 'AI駆動型ウェブサイト生成',
      'tax-return-agent': '確定申告書類の作成・検証',
      'gas-deploy-agent': 'Google Apps Scriptのデプロイ管理',
      'gas-ocr-deploy-agent': 'GAS OCR機能のデプロイ・設定',
      'gas-test-agent': 'GASスクリプトのテスト実行',
      'gas-update-agent': 'GASコードの更新・同期',
      'problem-solving-agent': '7つのMCPサーバー統合による高度な問題解決'
    };
    return descriptions[agentName] || '詳細不明';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">AAMシステム管理ダッシュボード</h1>

      {/* システム概要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">システム状態</div>
          <div className="text-2xl font-bold text-green-600">
            {systemStatus?.status === 'healthy' ? '正常' : 'エラー'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            v{systemStatus?.aam_system?.version || '1.0.0'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">アクティブエージェント</div>
          <div className="text-2xl font-bold">
            {agents.filter(a => a.status === 'active').length} / {agents.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">稼働中</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">処理済みタスク</div>
          <div className="text-2xl font-bold">
            {agents.reduce((sum, a) => sum + a.executions, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">総実行数</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500">LLMプロバイダー</div>
          <div className="text-2xl font-bold">
            {systemStatus?.llm?.provider || 'DeepSeek'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {systemStatus?.llm?.configured ? '設定済み' : '未設定'}
          </div>
        </div>
      </div>

      {/* エージェント状態 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">エージェント状態</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  エージェント
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  機能説明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行回数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均処理時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終実行
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {getAgentDisplayName(agent.name)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getAgentDescription(agent.name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      agent.status === 'active' ? 'bg-green-100 text-green-800' :
                      agent.status === 'idle' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <span className={`w-2 h-2 mr-1 rounded-full ${
                        agent.status === 'active' ? 'bg-green-400' :
                        agent.status === 'idle' ? 'bg-gray-400' :
                        'bg-red-400'
                      }`}></span>
                      {agent.status === 'active' ? 'アクティブ' : 
                       agent.status === 'idle' ? 'アイドル' : 'エラー'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.executions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(agent.avgTime || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(agent.lastRun)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ワークフローメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">ワークフロー統計</h2>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.name} className="border-b pb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{workflow.name}</h3>
                  <span className="text-sm text-gray-500">
                    {workflow.totalRuns}回実行
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">成功率:</span>
                    <span className={`ml-2 font-medium ${
                      workflow.successRate >= 98 ? 'text-green-600' :
                      workflow.successRate >= 95 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {workflow.successRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">平均時間:</span>
                    <span className="ml-2 font-medium">
                      {formatDuration(workflow.avgDuration)}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        workflow.successRate >= 98 ? 'bg-green-600' :
                        workflow.successRate >= 95 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${workflow.successRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近のログ */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">最近のアクティビティ</h2>
          <div className="space-y-2">
            {recentLogs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2 text-sm">
                <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  log.level === 'success' ? 'bg-green-400' :
                  log.level === 'warning' ? 'bg-yellow-400' :
                  log.level === 'error' ? 'bg-red-400' :
                  'bg-blue-400'
                }`}></span>
                <div className="flex-1">
                  <div className="text-gray-900">{log.message}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.time).toLocaleTimeString('ja-JP')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">管理アクション</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            全エージェント再起動
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            ヘルスチェック実行
          </button>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
            キャッシュクリア
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            緊急停止
          </button>
        </div>
      </div>

      {/* 問題解決専門エージェントセクション */}
      <ProblemSolvingSection />

      {/* GitHub連携セクション */}
      <GitHubSection />
    </div>
  );
}