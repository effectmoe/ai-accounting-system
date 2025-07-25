"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JournalPage;
const react_1 = __importStar(require("react"));
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
function JournalPage() {
    const router = (0, navigation_1.useRouter)();
    const [viewMode, setViewMode] = (0, react_1.useState)('timeline');
    const [journals, setJournals] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchJournals = async () => {
        console.log('[Journal Page] Starting to fetch journals...');
        setLoading(true);
        setError(null);
        try {
            console.log('[Journal Page] Calling /api/journals...');
            const response = await fetch('/api/journals?limit=50&skip=0');
            console.log('[Journal Page] Response status:', response.status);
            console.log('[Journal Page] Response headers:', Object.fromEntries(response.headers.entries()));
            const data = await response.json();
            console.log('[Journal Page] Response data:', data);
            if (data.success && data.journals) {
                console.log('[Journal Page] Journals loaded successfully:', data.journals.length);
                setJournals(data.journals);
            }
            else {
                console.error('[Journal Page] API returned error:', data.error);
                setError(data.error || '仕訳データの読み込みに失敗しました');
            }
        }
        catch (err) {
            console.error('[Journal Page] Network error:', err);
            setError('ネットワークエラーが発生しました');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchJournals();
    }, []);
    const handleCreate = () => {
        router.push('/journal/new');
    };
    const handleRefresh = () => {
        fetchJournals();
    };
    if (loading) {
        return (<div className="container mx-auto p-8">
        <card_1.Card>
          <card_1.CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600">仕訳データを読み込んでいます...</p>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    if (error) {
        return (<div className="container mx-auto p-8">
        <card_1.Card>
          <card_1.CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button_1.Button onClick={handleRefresh}>再試行</button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    return (<div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <lucide_react_1.Home className="w-4 h-4"/>
          <span>/</span>
          <span>仕訳帳</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <lucide_react_1.BookOpenCheck className="w-8 h-8 text-violet-600"/>
              仕訳帳
            </h1>
            <p className="text-gray-600 mt-2">会計仕訳の記録と管理</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button type="button" onClick={() => setViewMode('timeline')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'timeline'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}>
                <lucide_react_1.ActivityIcon className="h-4 w-4"/>
                タイムライン
              </button>
              <button type="button" onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'table'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'}`}>
                <lucide_react_1.TableIcon className="h-4 w-4"/>
                テーブル
              </button>
            </div>
            <button_1.Button variant="outline" onClick={handleRefresh}>
              <lucide_react_1.RefreshCwIcon className="mr-2 h-4 w-4"/>
              更新
            </button_1.Button>
            <button_1.Button onClick={handleCreate}>
              <lucide_react_1.PlusIcon className="mr-2 h-4 w-4"/>
              仕訳を作成
            </button_1.Button>
          </div>
        </div>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>仕訳一覧 ({journals.length}件)</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {journals.length === 0 ? (<div className="text-center py-8">
              <p className="text-gray-500 mb-4">仕訳がありません</p>
              <button_1.Button onClick={handleCreate}>最初の仕訳を作成</button_1.Button>
            </div>) : viewMode === 'timeline' ? (<div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                タイムライン表示 - 時系列で仕訳を確認できます
              </p>
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                <div className="space-y-6">
                  {journals.map((journal, index) => {
                const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
                const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);
                const isBalanced = debitTotal === creditTotal;
                return (<div key={journal._id || index} className="relative flex items-start">
                        <div className={`absolute left-6 w-4 h-4 rounded-full border-2 ${isBalanced ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500'}`}></div>
                        
                        <div className="ml-16 flex-1 bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/journal/${journal._id}`)}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-lg">{journal.journalNumber}</span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'}`}>
                                {journal.status === 'confirmed' ? '確定' :
                        journal.status === 'draft' ? '下書き' : journal.status}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date(journal.entryDate).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{journal.description}</p>
                          <div className="text-sm text-gray-600">
                            <span className="mr-4">借方: <span className="text-blue-600 font-medium">¥{debitTotal.toLocaleString()}</span></span>
                            <span>貸方: <span className="text-red-600 font-medium">¥{creditTotal.toLocaleString()}</span></span>
                            {!isBalanced && <span className="ml-4 text-red-600">⚠️ 貸借不一致</span>}
                          </div>
                        </div>
                      </div>);
            })}
                </div>
              </div>
            </div>) : (<div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                テーブル表示 - 一覧形式で仕訳を確認できます
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        仕訳番号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        摘要
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        借方合計
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        貸方合計
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {journals.map((journal, index) => {
                const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
                const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);
                return (<tr key={journal._id || index} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/journal/${journal._id}`)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {journal.journalNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(journal.entryDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {journal.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                            ¥{debitTotal.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                            ¥{creditTotal.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'}`}>
                              {journal.status === 'confirmed' ? '確定' :
                        journal.status === 'draft' ? '下書き' : journal.status}
                            </span>
                          </td>
                        </tr>);
            })}
                  </tbody>
                </table>
              </div>
            </div>)}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
