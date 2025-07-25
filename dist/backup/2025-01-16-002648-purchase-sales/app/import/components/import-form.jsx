"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportForm;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
function ImportForm() {
    const router = (0, navigation_1.useRouter)();
    const [fileType, setFileType] = (0, react_1.useState)('accounts');
    const [file, setFile] = (0, react_1.useState)(null);
    const [companyId, setCompanyId] = (0, react_1.useState)('11111111-1111-1111-1111-111111111111');
    const [isDryRun, setIsDryRun] = (0, react_1.useState)(true);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setResult(null);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('ファイルを選択してください');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);
            formData.append('companyId', companyId);
            formData.append('dryRun', isDryRun.toString());
            const response = await fetch('/api/import/freee', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Import failed: ${response.statusText}`);
            }
            const data = await response.json();
            setResult(data);
            if (!isDryRun && data.success > 0) {
                // 成功したら該当ページにリダイレクト
                setTimeout(() => {
                    if (fileType === 'accounts') {
                        router.push('/accounts');
                    }
                    else if (fileType === 'partners') {
                        router.push('/customers');
                    }
                    else if (fileType === 'transactions') {
                        router.push('/transactions');
                    }
                }, 2000);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'インポートに失敗しました');
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
    return (<form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          インポートタイプ
        </label>
        <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
          {Object.entries(fileTypeLabels).map(([value, label]) => (<option key={value} value={value}>
              {label}
            </option>))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          会社ID
        </label>
        <input type="text" value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例: 11111111-1111-1111-1111-111111111111"/>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CSVファイル
        </label>
        <input type="file" accept=".csv" onChange={handleFileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        {file && (<p className="mt-2 text-sm text-gray-600">
            選択されたファイル: {file.name}
          </p>)}
      </div>

      <div>
        <label className="flex items-center">
          <input type="checkbox" checked={isDryRun} onChange={(e) => setIsDryRun(e.target.checked)} className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
          <span className="text-sm text-gray-700">
            ドライラン（実際にはインポートしない）
          </span>
        </label>
      </div>

      {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>)}

      {result && (<div className={`border rounded px-4 py-3 ${result.failed > 0
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-green-50 border-green-200 text-green-800'}`}>
          <h3 className="font-semibold mb-2">インポート結果</h3>
          <p>✅ 成功: {result.success}件</p>
          <p>❌ 失敗: {result.failed}件</p>
          
          {result.errors && result.errors.length > 0 && (<div className="mt-3">
              <h4 className="font-semibold text-sm">エラー詳細（最初の5件）:</h4>
              <ul className="mt-1 text-sm list-disc list-inside">
                {result.errors.slice(0, 5).map((err, idx) => (<li key={idx}>{err.error.message || err.error}</li>))}
              </ul>
              {result.errors.length > 5 && (<p className="text-sm mt-1">
                  ... 他 {result.errors.length - 5} 件のエラー
                </p>)}
            </div>)}
          
          {isDryRun && (<p className="mt-3 text-sm font-semibold">
              ⚠️ これはドライランです。実際のデータはインポートされていません。
            </p>)}
        </div>)}

      <button type="submit" disabled={isLoading || !file} className={`w-full py-2 px-4 rounded-md text-white font-medium ${isLoading || !file
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'}`}>
        {isLoading ? 'インポート中...' : 'インポート開始'}
      </button>
    </form>);
}
