"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LearningManagementPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
const link_1 = __importDefault(require("next/link"));
function LearningManagementPage() {
    const [learnings, setLearnings] = (0, react_1.useState)([]);
    const [stats, setStats] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)('all');
    const [expandedItems, setExpandedItems] = (0, react_1.useState)(new Set());
    const [editingItem, setEditingItem] = (0, react_1.useState)(null);
    const [editingCategory, setEditingCategory] = (0, react_1.useState)('');
    // 学習データを取得
    const fetchLearnings = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                search: searchTerm,
                page: '1',
                limit: '50'
            });
            const response = await fetch(`/api/learning/list?${params}`);
            const data = await response.json();
            if (data.success) {
                setLearnings(data.learnings);
                setStats(data.stats);
            }
            else {
                throw new Error(data.error);
            }
        }
        catch (error) {
            console.error('Error fetching learnings:', error);
            react_hot_toast_1.toast.error('学習データの取得に失敗しました');
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchLearnings();
    }, [searchTerm]);
    // 項目の展開/折りたたみ
    const toggleExpanded = (id) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        }
        else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };
    // 学習データの更新
    const handleUpdateCategory = async (id) => {
        try {
            const response = await fetch(`/api/learning/update`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    learningId: id,
                    accountCategory: editingCategory
                })
            });
            const data = await response.json();
            if (data.success) {
                react_hot_toast_1.toast.success('勘定科目を更新しました');
                setEditingItem(null);
                fetchLearnings();
            }
            else {
                throw new Error(data.error);
            }
        }
        catch (error) {
            console.error('Error updating learning:', error);
            react_hot_toast_1.toast.error('更新に失敗しました');
        }
    };
    // 学習データの削除
    const handleDelete = async (id) => {
        if (!confirm('この学習データを削除してもよろしいですか？')) {
            return;
        }
        try {
            const response = await fetch(`/api/learning/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learningId: id })
            });
            const data = await response.json();
            if (data.success) {
                react_hot_toast_1.toast.success('学習データを削除しました');
                fetchLearnings();
            }
            else {
                throw new Error(data.error);
            }
        }
        catch (error) {
            console.error('Error deleting learning:', error);
            react_hot_toast_1.toast.error('削除に失敗しました');
        }
    };
    // フィルタリング
    const filteredLearnings = learnings.filter(learning => {
        if (selectedCategory !== 'all' && learning.accountCategory !== selectedCategory) {
            return false;
        }
        return true;
    });
    const accountCategories = [
        { value: '旅費交通費', label: '旅費交通費' },
        { value: '会議費', label: '会議費' },
        { value: '接待交際費', label: '接待交際費' },
        { value: '消耗品費', label: '消耗品費' },
        { value: '車両費', label: '車両費' },
        { value: '新聞図書費', label: '新聞図書費' },
        { value: '通信費', label: '通信費' },
        { value: '水道光熱費', label: '水道光熱費' },
        { value: '地代家賃', label: '地代家賃' },
        { value: '雑費', label: '雑費' },
    ];
    if (loading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <lucide_react_1.Brain className="w-6 h-6"/>
            AI学習管理
          </h1>
          <link_1.default href="/documents" className="text-blue-600 hover:text-blue-800">
            書類管理に戻る
          </link_1.default>
        </div>

        {/* 統計情報 */}
        {stats && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">総学習数</div>
              <div className="text-2xl font-bold">{stats.totalLearnings}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow col-span-2">
              <div className="text-sm text-gray-600 mb-2">カテゴリ別学習数</div>
              <div className="flex flex-wrap gap-2">
                {stats.categoryBreakdown.slice(0, 5).map(cat => (<div key={cat.category} className="bg-gray-100 px-3 py-1 rounded">
                    <span className="font-medium">{cat.category}</span>
                    <span className="text-sm text-gray-600 ml-1">({cat.count})</span>
                  </div>))}
              </div>
            </div>
          </div>)}

        {/* 検索とフィルター */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input type="text" placeholder="店舗名やパターンで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">すべてのカテゴリ</option>
              {accountCategories.map(cat => (<option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>))}
            </select>
          </div>
        </div>

        {/* 学習データリスト */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">店舗名/ベンダー</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">勘定科目</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">信頼度</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">使用回数</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">最終使用</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearnings.map((learning) => (<>
                    <tr key={learning.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <button onClick={() => toggleExpanded(learning.id)} className="flex items-center gap-2 text-left hover:text-blue-600">
                          {expandedItems.has(learning.id) ? (<lucide_react_1.ChevronUp className="w-4 h-4"/>) : (<lucide_react_1.ChevronDown className="w-4 h-4"/>)}
                          <span className="font-medium">{learning.vendorName}</span>
                        </button>
                      </td>
                      <td className="p-3">
                        {editingItem === learning.id ? (<div className="flex items-center gap-2">
                            <select value={editingCategory} onChange={(e) => setEditingCategory(e.target.value)} className="px-2 py-1 border border-gray-300 rounded" autoFocus>
                              {accountCategories.map(cat => (<option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>))}
                            </select>
                            <button onClick={() => handleUpdateCategory(learning.id)} className="text-green-600 hover:text-green-800">
                              ✓
                            </button>
                            <button onClick={() => setEditingItem(null)} className="text-red-600 hover:text-red-800">
                              ✕
                            </button>
                          </div>) : (<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {learning.accountCategory}
                          </span>)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${learning.confidenceScore * 100}%` }}/>
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round(learning.confidenceScore * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{learning.usageCount}回</td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(learning.lastUsed).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button onClick={() => {
                setEditingItem(learning.id);
                setEditingCategory(learning.accountCategory);
            }} className="text-blue-600 hover:text-blue-800 p-1" title="編集">
                            <lucide_react_1.Edit className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleDelete(learning.id)} className="text-red-600 hover:text-red-800 p-1" title="削除">
                            <lucide_react_1.Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedItems.has(learning.id) && (<tr>
                        <td colSpan={6} className="bg-gray-50 p-4">
                          <div className="space-y-2">
                            <div>
                              <span className="font-medium text-sm">抽出されたパターン:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {learning.patterns.map((pattern, idx) => (<span key={idx} className="bg-white px-2 py-1 rounded border border-gray-300 text-sm">
                                    {pattern}
                                  </span>))}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>作成日: {new Date(learning.createdAt).toLocaleString('ja-JP')}</div>
                              <div>更新日: {new Date(learning.updatedAt).toLocaleString('ja-JP')}</div>
                            </div>
                          </div>
                        </td>
                      </tr>)}
                  </>))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>);
}
