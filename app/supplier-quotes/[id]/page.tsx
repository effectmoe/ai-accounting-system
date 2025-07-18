'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, FileText, Building, Calendar, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Download, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SupplierQuote, SupplierQuoteStatus } from '@/types/collections';

// ステータス表示用のスタイル
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  converted: 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusLabels = {
  pending: '保留',
  received: '受信',
  accepted: '承認',
  rejected: '拒否',
  expired: '期限切れ',
  cancelled: 'キャンセル',
  converted: '発注書に変換',
};

const statusIcons = {
  pending: AlertCircle,
  received: FileText,
  accepted: CheckCircle,
  rejected: XCircle,
  expired: Clock,
  cancelled: XCircle,
  converted: Send,
};

export default function SupplierQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<SupplierQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const quoteId = params.id as string;

  // 見積書データの取得
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/supplier-quotes/${quoteId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('見積書が見つかりません');
            router.push('/supplier-quotes');
            return;
          }
          throw new Error('Failed to fetch quote');
        }
        const data = await response.json();
        setQuote(data);
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast.error('見積書の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId, router]);

  // ステータス更新
  const handleStatusUpdate = async (newStatus: SupplierQuoteStatus) => {
    if (!quote) return;

    const confirmMessages = {
      pending: '保留',
      received: '受信',
      accepted: '承認',
      rejected: '拒否',
      expired: '期限切れ',
      cancelled: 'キャンセル',
      converted: '発注書に変換',
    };

    if (!confirm(`この見積書を「${confirmMessages[newStatus]}」に変更しますか？`)) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/supplier-quotes/${quoteId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          statusDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedQuote = await response.json();
      setQuote(updatedQuote);
      toast.success('ステータスを更新しました');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  // 見積書の削除
  const handleDelete = async () => {
    if (!quote) return;

    if (!confirm('この見積書を削除してもよろしいですか？この操作は取り消せません。')) return;

    try {
      const response = await fetch(`/api/supplier-quotes/${quoteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete quote');

      toast.success('見積書を削除しました');
      router.push('/supplier-quotes');
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('見積書の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">見積書が見つかりません</div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[quote.status];

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/supplier-quotes"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">見積書詳細</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/supplier-quotes/${quoteId}/edit`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Edit size={16} />
            編集
          </Link>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Trash2 size={16} />
            削除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  見積書番号
                </label>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">{quote.quoteNumber}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仕入先
                </label>
                <div className="flex items-start gap-2">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex flex-col space-y-1">
                    <span className="text-gray-900 font-medium">
                      {quote.supplier?.companyName || quote.vendor?.name || quote.vendorName || '未設定'}
                    </span>
                    {(quote.supplier?.address || quote.vendorAddress) && (
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">住所:</span> {quote.supplier?.address || quote.vendorAddress}
                      </span>
                    )}
                    {(quote.supplier?.contactPhone || quote.vendorPhone) && (
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">TEL:</span> 
                        <a href={`tel:${quote.supplier?.contactPhone || quote.vendorPhone}`} className="text-blue-600 hover:text-blue-800 ml-1">
                          {quote.supplier?.contactPhone || quote.vendorPhone}
                        </a>
                      </span>
                    )}
                    {(quote.supplier?.contactEmail || quote.vendorEmail) && (
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> 
                        <a href={`mailto:${quote.supplier?.contactEmail || quote.vendorEmail}`} className="text-blue-600 hover:text-blue-800 ml-1">
                          {quote.supplier?.contactEmail || quote.vendorEmail}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  発行日
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">
                    {new Date(quote.issueDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  有効期限
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">
                    {new Date(quote.validityDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  総額
                </label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900 font-medium">
                    ¥{(quote.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5 text-gray-400" />
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[quote.status]}`}>
                    {statusLabels[quote.status]}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 赤枠の4項目 */}
            {(quote.subject || quote.deliveryLocation || quote.paymentTerms || quote.quotationValidity) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                {quote.subject && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      件名
                    </label>
                    <div className="text-gray-900">{quote.subject}</div>
                  </div>
                )}
                {quote.deliveryLocation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      納入場所
                    </label>
                    <div className="text-gray-900">{quote.deliveryLocation}</div>
                  </div>
                )}
                {quote.paymentTerms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      お支払条件
                    </label>
                    <div className="text-gray-900">{quote.paymentTerms}</div>
                  </div>
                )}
                {quote.quotationValidity && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      見積有効期限
                    </label>
                    <div className="text-gray-900">{quote.quotationValidity}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* OCR元ファイル */}
          {(quote.ocrResultId || quote.fileId) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR元ファイル</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">
                    この見積書はOCRによって自動生成されました。
                  </p>
                  <div className="flex gap-2">
                    {quote.fileId && (
                      <a
                        href={`/api/documents/${quote.fileId}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                        元ファイルを表示
                      </a>
                    )}
                    {quote.ocrResultId && (
                      <a
                        href={`/api/ocr-results/${quote.ocrResultId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                        OCR結果を表示
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 見積項目 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">見積項目</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      項目名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      数量
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      単価
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      税率
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      税額
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quote.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                        {item.remarks && (
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">備考:</span> {item.remarks}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.taxRate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{(item.taxAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 合計 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">小計:</span>
                    <span className="text-sm text-gray-900">¥{(quote.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">税額:</span>
                    <span className="text-sm text-gray-900">¥{(quote.taxAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span className="text-sm text-gray-900">合計:</span>
                    <span className="text-sm text-gray-900">¥{(quote.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 備考 */}
          {quote.notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
              <div className="text-gray-700 whitespace-pre-wrap">{quote.notes}</div>
            </div>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス管理 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ステータス管理</h2>
            <div className="space-y-2">
              {(['pending', 'received', 'accepted', 'rejected', 'expired', 'cancelled', 'converted'] as SupplierQuoteStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={updating || quote.status === status}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    quote.status === status
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          {/* 仕入先情報 */}
          {quote.supplier && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">仕入先情報</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    会社名
                  </label>
                  <div className="text-sm text-gray-900">{quote.supplier.companyName}</div>
                </div>
                {quote.supplier.contactPerson && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      担当者
                    </label>
                    <div className="text-sm text-gray-900">{quote.supplier.contactPerson}</div>
                  </div>
                )}
                {quote.supplier.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <div className="text-sm text-gray-900">{quote.supplier.email}</div>
                  </div>
                )}
                {quote.supplier.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      住所
                    </label>
                    <div className="text-sm text-gray-900">{quote.supplier.address}</div>
                  </div>
                )}
                {quote.supplier.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      電話番号
                    </label>
                    <div className="text-sm text-gray-900">{quote.supplier.phone}</div>
                  </div>
                )}
                <div className="mt-4">
                  <Link
                    href={`/suppliers/${quote.supplier._id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    仕入先詳細を見る →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* AI生成情報 */}
          {quote.isGeneratedByAI && quote.aiGenerationMetadata && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI生成情報</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生成元
                  </label>
                  <div className="text-sm text-gray-900">{quote.aiGenerationMetadata.source}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    信頼度
                  </label>
                  <div className="text-sm text-gray-900">{Math.round(quote.aiGenerationMetadata.confidence * 100)}%</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生成日時
                  </label>
                  <div className="text-sm text-gray-900">
                    {new Date(quote.aiGenerationMetadata.timestamp).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 作成・更新日時 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">作成・更新情報</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  作成日時
                </label>
                <div className="text-sm text-gray-900">
                  {new Date(quote.createdAt).toLocaleString('ja-JP')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  更新日時
                </label>
                <div className="text-sm text-gray-900">
                  {new Date(quote.updatedAt).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}