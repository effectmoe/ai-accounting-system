"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProblemSolvingSection;
const react_1 = require("react");
function ProblemSolvingSection() {
    const [problem, setProblem] = (0, react_1.useState)('');
    const [operation, setOperation] = (0, react_1.useState)('solve_problem');
    const [priority, setPriority] = (0, react_1.useState)('medium');
    const [domain, setDomain] = (0, react_1.useState)('general');
    const [analysisType, setAnalysisType] = (0, react_1.useState)('trend');
    const [dataSource, setDataSource] = (0, react_1.useState)('financial');
    const [researchTopic, setResearchTopic] = (0, react_1.useState)('');
    const [researchScope, setResearchScope] = (0, react_1.useState)('comprehensive');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [agentStatus, setAgentStatus] = (0, react_1.useState)(null);
    // エージェントステータスの取得
    (0, react_1.useEffect)(() => {
        const fetchAgentStatus = async () => {
            try {
                const response = await fetch('/api/problem-solver');
                const data = await response.json();
                if (data.success) {
                    setAgentStatus(data.status);
                }
            }
            catch (error) {
                console.error('Failed to fetch agent status:', error);
            }
        };
        fetchAgentStatus();
    }, []);
    const solveProblem = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            let requestData;
            switch (operation) {
                case 'solve_problem':
                    requestData = {
                        operation,
                        data: {
                            problem,
                            context: {
                                priority,
                                domain,
                                requiredTools: [],
                                constraints: {},
                            },
                            companyId: '11111111-1111-1111-1111-111111111111',
                        },
                    };
                    break;
                case 'analyze_data':
                    requestData = {
                        operation,
                        data: {
                            dataType: dataSource,
                            data: {}, // 実際のデータはここに
                            analysisType,
                            companyId: '11111111-1111-1111-1111-111111111111',
                        },
                    };
                    break;
                case 'research_topic':
                    requestData = {
                        operation,
                        data: {
                            topic: researchTopic || problem,
                            scope: researchScope,
                            parameters: {
                                depth: 'moderate',
                                language: 'ja',
                                includeRecent: true,
                            },
                            companyId: '11111111-1111-1111-1111-111111111111',
                        },
                    };
                    break;
                default:
                    // レガシー形式（後方互換性）
                    requestData = {
                        problem,
                        domain,
                        requiresWebSearch: true,
                        requiresDataAnalysis: operation === 'analyze_data',
                    };
            }
            const response = await fetch('/api/problem-solver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
            });
            const data = await response.json();
            setResult(data);
        }
        catch (error) {
            setResult({
                success: false,
                error: error instanceof Error ? error.message : '問題解決中にエラーが発生しました',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const getToolStatus = () => {
        if (!agentStatus) {
            return [
                { name: 'database-analysis', icon: '🗄️', status: 'loading' },
                { name: 'sequential-thinking', icon: '🧠', status: 'loading' },
                { name: 'process-optimization', icon: '⚡', status: 'loading' },
                { name: 'insight-generation', icon: '💡', status: 'loading' },
            ];
        }
        return agentStatus.tools.map(tool => ({
            name: tool.name,
            icon: tool.name === 'database-analysis' ? '🗄️' :
                tool.name === 'sequential-thinking' ? '🧠' :
                    tool.name === 'process-optimization' ? '⚡' : '💡',
            status: tool.status,
            description: tool.description,
        }));
    };
    return (<div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">🧠 問題解決専門エージェント</h2>
      
      {/* エージェントステータス表示 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">エージェントツール</h3>
          {agentStatus && (<span className="text-xs text-gray-500">v{agentStatus.agentVersion}</span>)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {getToolStatus().map((tool) => (<div key={tool.name} className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1">
              <span className="text-lg">{tool.icon}</span>
              <span className="text-xs text-gray-600">{tool.name}</span>
              <span className={`w-2 h-2 rounded-full ml-auto ${tool.status === 'active' ? 'bg-green-400' :
                tool.status === 'loading' ? 'bg-yellow-400' : 'bg-red-400'}`}></span>
            </div>))}
        </div>
      </div>

      {/* 操作選択とフォーム */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            操作タイプ
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={operation} onChange={(e) => setOperation(e.target.value)}>
            <option value="solve_problem">問題解決</option>
            <option value="analyze_data">データ分析</option>
            <option value="research_topic">調査・研究</option>
            <option value="optimize_process">プロセス最適化</option>
            <option value="troubleshoot">トラブルシューティング</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {operation === 'research_topic' ? '調査トピック' : '問題・要求の説明'}
          </label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder={operation === 'solve_problem' ? "例: 請求書処理の効率化を図りたい" :
            operation === 'analyze_data' ? "例: 売上データの傾向を分析してほしい" :
                operation === 'research_topic' ? "例: 最新の会計システムのトレンド" :
                    "解決したい問題や要求を具体的に説明してください"} value={operation === 'research_topic' ? researchTopic : problem} onChange={(e) => operation === 'research_topic' ? setResearchTopic(e.target.value) : setProblem(e.target.value)}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              優先度
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="critical">緊急</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {operation === 'analyze_data' ? 'データソース' : 'ドメイン'}
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={operation === 'analyze_data' ? dataSource : domain} onChange={(e) => operation === 'analyze_data' ? setDataSource(e.target.value) : setDomain(e.target.value)}>
              {operation === 'analyze_data' ? (<>
                  <option value="financial">財務データ</option>
                  <option value="customer">顧客データ</option>
                  <option value="document">文書データ</option>
                  <option value="system">システムデータ</option>
                  <option value="performance">パフォーマンスデータ</option>
                </>) : (<>
                  <option value="general">一般</option>
                  <option value="accounting">会計</option>
                  <option value="ocr">OCR</option>
                  <option value="customer">顧客管理</option>
                  <option value="system">システム</option>
                </>)}
            </select>
          </div>

          {operation === 'analyze_data' && (<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分析タイプ
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
                <option value="trend">トレンド分析</option>
                <option value="anomaly">異常検出</option>
                <option value="classification">分類分析</option>
                <option value="prediction">予測分析</option>
                <option value="comparison">比較分析</option>
              </select>
            </div>)}

          {operation === 'research_topic' && (<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                調査範囲
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" value={researchScope} onChange={(e) => setResearchScope(e.target.value)}>
                <option value="local">ローカル</option>
                <option value="database">データベース</option>
                <option value="comprehensive">包括的</option>
              </select>
            </div>)}
        </div>

        {/* 実行ボタン */}
        <button onClick={solveProblem} disabled={!problem || isLoading} className={`w-full md:w-auto px-6 py-2 rounded-md font-medium transition-colors ${isLoading || !problem
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {isLoading ? (<span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              問題を解決中...
            </span>) : ('問題を解決')}
        </button>
      </div>

      {/* 結果表示 */}
      {result && (<div className="mt-6 space-y-4">
          <div className={`p-4 rounded-md ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <h3 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ 解決策が見つかりました' : '❌ エラーが発生しました'}
            </h3>
            {result.error && (<p className="text-red-600 text-sm mt-1">{result.error}</p>)}
          </div>

          {result.success && result.summary && (<div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-800 mb-2">解決策の要約</h4>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{result.summary}</p>
            </div>)}

          {result.searchResults && (<details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">Web検索結果</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60">
                {JSON.stringify(result.searchResults, null, 2)}
              </pre>
            </details>)}

          {result.visualAnalysis && (<details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">ビジュアル分析結果</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-60">
                {JSON.stringify(result.visualAnalysis, null, 2)}
              </pre>
            </details>)}

          {result.solution && (<details className="bg-gray-50 p-4 rounded-md">
              <summary className="font-medium cursor-pointer">詳細な解決策</summary>
              <pre className="mt-2 text-xs overflow-auto max-h-96">
                {JSON.stringify(result.solution, null, 2)}
              </pre>
            </details>)}
        </div>)}
    </div>);
}
