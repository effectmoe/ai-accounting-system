"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestAzureMongoDBPage;
const react_1 = require("react");
function TestAzureMongoDBPage() {
    const [healthStatus, setHealthStatus] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchHealthStatus();
    }, []);
    const fetchHealthStatus = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/health');
            const data = await response.json();
            setHealthStatus(data);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch health status');
        }
        finally {
            setLoading(false);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy':
            case 'configured':
                return 'text-green-600';
            case 'unhealthy':
            case 'error':
                return 'text-red-600';
            case 'not_configured':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy':
            case 'configured':
                return '✅';
            case 'unhealthy':
            case 'error':
                return '❌';
            case 'not_configured':
                return '⚠️';
            default:
                return '❓';
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">システム状態を確認中...</p>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">エラーが発生しました</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchHealthStatus} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            再試行
          </button>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">
              Azure Form Recognizer + MongoDB システム状態
            </h1>
            <p className="text-blue-100 mt-1">
              本番環境でのシステム動作状況を確認
            </p>
          </div>

          {healthStatus && (<div className="p-6">
              {/* 基本情報 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">システム情報</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">システム</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {healthStatus.system}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">バージョン</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {healthStatus.version}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">環境</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {healthStatus.environment}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-500">最終確認</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {new Date(healthStatus.timestamp).toLocaleString('ja-JP')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 設定状況 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">設定状況</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {healthStatus.configuration.useAzureMongoDB ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="font-medium">新システム</div>
                        <div className="text-sm text-gray-600">
                          {healthStatus.configuration.useAzureMongoDB ? '有効' : '無効'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {healthStatus.configuration.azureFormRecognizer.configured ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="font-medium">Azure Form Recognizer</div>
                        <div className="text-sm text-gray-600">
                          {healthStatus.configuration.azureFormRecognizer.endpoint}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {healthStatus.configuration.mongodb.configured ? '✅' : '❌'}
                      </span>
                      <div>
                        <div className="font-medium">MongoDB</div>
                        <div className="text-sm text-gray-600">
                          {healthStatus.configuration.mongodb.atlas ? 'Atlas' : 'Local'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* サービス状態 */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">サービス状態</h2>
                <div className="space-y-3">
                  {Object.entries(healthStatus.services).map(([service, status]) => (<div key={service} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getStatusIcon(status)}</span>
                        <div>
                          <div className="font-medium capitalize">
                            {service.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${getStatusColor(status)}`}>
                        {status.toUpperCase()}
                      </div>
                    </div>))}
                </div>
              </div>

              {/* アクション */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={fetchHealthStatus} className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200">
                  🔄 状態を再確認
                </button>
                
                <a href="/" className="flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-200">
                  🏠 メインページに戻る
                </a>
                
                <a href="/api/health" target="_blank" rel="noopener noreferrer" className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg text-center transition duration-200">
                  📊 JSON データを表示
                </a>
              </div>
            </div>)}
        </div>
      </div>
    </div>);
}
