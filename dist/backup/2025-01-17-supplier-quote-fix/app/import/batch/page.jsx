"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BatchImportPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
function BatchImportPage() {
    const router = (0, navigation_1.useRouter)();
    const [companyId, setCompanyId] = (0, react_1.useState)('11111111-1111-1111-1111-111111111111');
    const [notificationEmail, setNotificationEmail] = (0, react_1.useState)('');
    const [importJobs, setImportJobs] = (0, react_1.useState)([
        { fileUrl: '', fileType: 'accounts', encoding: 'utf8' }
    ]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [batchId, setBatchId] = (0, react_1.useState)(null);
    const addJob = () => {
        setImportJobs([...importJobs, { fileUrl: '', fileType: 'accounts', encoding: 'utf8' }]);
    };
    const removeJob = (index) => {
        setImportJobs(importJobs.filter((_, i) => i !== index));
    };
    const updateJob = (index, field, value) => {
        const updated = [...importJobs];
        updated[index] = { ...updated[index], [field]: value };
        setImportJobs(updated);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // バリデーション
        const validJobs = importJobs.filter(job => job.fileUrl.trim() !== '');
        if (validJobs.length === 0) {
            setError('少なくとも1つのファイルURLを入力してください');
            return;
        }
        setIsLoading(true);
        setError(null);
        setBatchId(null);
        try {
            const response = await fetch('/api/batch-import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    companyId,
                    importJobs: validJobs,
                    notificationEmail: notificationEmail.trim() || undefined,
                }),
            });
            if (!response.ok) {
                throw new Error(`バッチインポートの開始に失敗しました: ${response.statusText}`);
            }
            const data = await response.json();
            setBatchId(data.runId);
            // バッチ詳細ページへリダイレクト
            setTimeout(() => {
                router.push(`/import/batch/${data.runId}?companyId=${companyId}`);
            }, 2000);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'バッチインポートの開始に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    const fileTypeLabels = {
        accounts: '勘定科目',
        partners: '取引先',
        transactions: '取引明細',
    };
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">バッチインポート</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              会社ID
            </label>
            <input type="text" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: 11111111-1111-1111-1111-111111111111" required/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              通知メールアドレス（オプション）
            </label>
            <input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: admin@example.com"/>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                インポートジョブ
              </label>
              <button type="button" onClick={addJob} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                ジョブを追加
              </button>
            </div>

            <div className="space-y-4">
              {importJobs.map((job, index) => (<div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">ジョブ {index + 1}</h3>
                    {importJobs.length > 1 && (<button type="button" onClick={() => removeJob(index)} className="text-red-600 hover:text-red-800 text-sm">
                        削除
                      </button>)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ファイルURL
                      </label>
                      <input type="url" value={job.fileUrl} onChange={(e) => updateJob(index, 'fileUrl', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://example.com/data.csv"/>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ファイルタイプ
                      </label>
                      <select value={job.fileType} onChange={(e) => updateJob(index, 'fileType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.entries(fileTypeLabels).map(([value, label]) => (<option key={value} value={value}>
                            {label}
                          </option>))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        エンコーディング
                      </label>
                      <select value={job.encoding} onChange={(e) => updateJob(index, 'encoding', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="utf8">UTF-8</option>
                        <option value="sjis">Shift-JIS</option>
                      </select>
                    </div>
                  </div>
                </div>))}
            </div>
          </div>

          {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>)}

          {batchId && (<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p>バッチインポートを開始しました。</p>
              <p className="text-sm mt-1">バッチID: {batchId}</p>
              <p className="text-sm mt-1">詳細ページにリダイレクトします...</p>
            </div>)}

          <button type="submit" disabled={isLoading} className={`w-full py-2 px-4 rounded-md text-white font-medium ${isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isLoading ? 'バッチインポートを開始中...' : 'バッチインポートを開始'}
          </button>
        </form>
      </div>
    </div>);
}
