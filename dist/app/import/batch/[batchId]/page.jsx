"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BatchDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
function BatchDetailPage() {
    const params = (0, navigation_1.useParams)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const batchId = params.batchId;
    const companyId = searchParams.get('companyId');
    const [batch, setBatch] = (0, react_1.useState)(null);
    const [jobs, setJobs] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchBatchStatus = async () => {
        try {
            const response = await fetch(`/api/batch-import?batchId=${batchId}&companyId=${companyId}`);
            if (!response.ok) {
                throw new Error('バッチ情報の取得に失敗しました');
            }
            const data = await response.json();
            setBatch(data.batch);
            setJobs(data.jobs);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        if (!companyId) {
            setError('会社IDが指定されていません');
            setIsLoading(false);
            return;
        }
        fetchBatchStatus();
        // ステータスが完了していない場合は定期的に更新
        const interval = setInterval(() => {
            if (batch && !['completed', 'completed_with_errors', 'failed'].includes(batch.status)) {
                fetchBatchStatus();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [batchId, companyId, batch?.status]);
    if (isLoading) {
        return (<div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>);
    }
    if (error || !batch) {
        return (<div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'バッチが見つかりません'}
        </div>
      </div>);
    }
    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: '待機中' },
            processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: '処理中' },
            completed: { bg: 'bg-green-100', text: 'text-green-800', label: '完了' },
            completed_with_errors: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'エラーあり完了' },
            failed: { bg: 'bg-red-100', text: 'text-red-800', label: '失敗' },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return (<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>);
    };
    const fileTypeLabels = {
        accounts: '勘定科目',
        partners: '取引先',
        transactions: '取引明細',
    };
    return (<div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">バッチインポート詳細</h1>
        <link_1.default href="/import/batch" className="text-blue-600 hover:text-blue-800">
          ← バッチインポートに戻る
        </link_1.default>
      </div>

      {/* バッチ情報 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">バッチ情報</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">バッチID</p>
            <p className="font-mono text-sm">{batch.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ステータス</p>
            <p>{getStatusBadge(batch.status)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">進捗</p>
            <p className="text-sm">
              {batch.completed_jobs + batch.failed_jobs} / {batch.total_jobs} ジョブ
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">作成日時</p>
            <p className="text-sm">{new Date(batch.created_at).toLocaleString('ja-JP')}</p>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{
            width: `${batch.total_jobs > 0 ? ((batch.completed_jobs + batch.failed_jobs) / batch.total_jobs) * 100 : 0}%`
        }}></div>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>成功: {batch.completed_jobs}</span>
            <span>失敗: {batch.failed_jobs}</span>
          </div>
        </div>
      </div>

      {/* ジョブ一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">ジョブ一覧</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ファイルURL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  結果
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  完了日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (<tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <a href={job.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      {job.file_url.split('/').pop()}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {fileTypeLabels[job.file_type] || job.file_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.status === 'completed' && (<span>
                        ✅ {job.success_count || 0} / ❌ {job.failed_count || 0}
                      </span>)}
                    {job.status === 'failed' && (<span className="text-red-600" title={job.error_message}>
                        {job.error_message || 'エラー'}
                      </span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.completed_at ? new Date(job.completed_at).toLocaleString('ja-JP') : '-'}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}
