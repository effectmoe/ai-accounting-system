'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, FileText, Building, Calendar, DollarSign, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PurchaseInvoice, PurchaseInvoiceStatus } from '@/types/collections';

const statusStyles = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  paid: 'bg-purple-100 text-purple-800 border-purple-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels = {
  draft: '下書き',
  received: '受領済み',
  approved: '承認済み',
  paid: '支払済み',
  overdue: '期限超過',
  cancelled: 'キャンセル',
};

const paymentStatusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
};

const paymentStatusLabels = {
  pending: '未払い',
  partial: '一部支払い',
  paid: '支払済み',
};

export default function PurchaseInvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentStatus: 'paid' as 'pending' | 'partial' | 'paid',
    paidAmount: 0,
    paidDate: new Date().toISOString().split('T')[0],
    paymentReference: '',
  });

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/purchase-invoices/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      const data = await response.json();
      setInvoice(data);
      setPaymentData(prev => ({
        ...prev,
        paidAmount: data.totalAmount || 0,
      }));
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('請求書の取得に失敗しました');
      router.push('/purchase-invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: PurchaseInvoiceStatus) => {
    if (!invoice) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/purchase-invoices/${invoice._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success('ステータスを更新しました');
      fetchInvoice();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ステータスの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentUpdate = async () => {
    if (!invoice) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/purchase-invoices/${invoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: paymentData.paymentStatus,
          paidAmount: paymentData.paidAmount,
          paidDate: new Date(paymentData.paidDate),
          paymentReference: paymentData.paymentReference,
        }),
      });

      if (!response.ok) throw new Error('Failed to update payment');
      
      toast.success('支払情報を更新しました');
      setShowPaymentModal(false);
      fetchInvoice();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('支払情報の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice || !confirm('この請求書を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/purchase-invoices/${invoice._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete invoice');
      
      toast.success('請求書を削除しました');
      router.push('/purchase-invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('請求書の削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">請求書が見つかりません</p>
      </div>
    );
  }

  const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date();

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Link
            href="/purchase-invoices"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              請求書詳細: {invoice.invoiceNumber}
            </h1>
            <div className="mt-2 flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[invoice.status]}`}>
                {statusLabels[invoice.status]}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${paymentStatusStyles[invoice.paymentStatus]}`}>
                {paymentStatusLabels[invoice.paymentStatus]}
              </span>
              {isOverdue && (
                <span className="text-red-600 text-sm font-medium">
                  支払期限超過
                </span>
              )}
              {invoice.isGeneratedByAI && (
                <span className="text-blue-600 text-sm">
                  AI生成
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href={`/purchase-invoices/${invoice._id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>編集</span>
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>削除</span>
          </button>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">請求書番号</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">発行日</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {new Date(invoice.issueDate).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支払期限</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {new Date(invoice.dueDate).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">受領日</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {invoice.receivedDate ? new Date(invoice.receivedDate).toLocaleDateString('ja-JP') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 仕入先情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">仕入先情報</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">会社名</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {invoice.supplier?.companyName || invoice.vendorName || '不明'}
            </p>
          </div>
          {(invoice.supplier?.email || invoice.vendorEmail) && (
            <div>
              <p className="text-sm text-gray-500">メールアドレス</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {invoice.supplier?.email || invoice.vendorEmail}
              </p>
            </div>
          )}
          {(invoice.supplier?.phone || invoice.vendorPhone) && (
            <div>
              <p className="text-sm text-gray-500">電話番号</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {invoice.supplier?.phone || invoice.vendorPhone}
              </p>
            </div>
          )}
          {(invoice.supplier?.address1 || invoice.vendorAddress) && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-500">住所</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {invoice.supplier?.postalCode && `〒${invoice.supplier.postalCode} `}
                {invoice.supplier?.address1 || invoice.vendorAddress}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 商品明細 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">商品明細</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  単価
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  税率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.itemName}
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">¥{item.unitPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{(item.taxRate || 0) * 100}%</td>
                  <td className="px-6 py-4 text-sm text-gray-900">¥{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              {invoice.previousBalance !== undefined && (
                <>
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      前回請求額
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ¥{invoice.previousBalance.toLocaleString()}
                    </td>
                  </tr>
                  {invoice.currentPayment !== undefined && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        今回入金額
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ¥{invoice.currentPayment.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {invoice.carryoverAmount !== undefined && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        繰越金額
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ¥{invoice.carryoverAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {invoice.currentSales !== undefined && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        今回売上高
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ¥{invoice.currentSales.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={5} className="py-2"></td>
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  小計
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ¥{invoice.subtotal.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  消費税
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ¥{invoice.taxAmount.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  合計
                </td>
                <td className="px-6 py-4 text-lg font-bold text-gray-900">
                  ¥{invoice.totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 備考 */}
      {invoice.notes && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">備考</h2>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {invoice.notes}
          </div>
        </div>
      )}

      {/* 振込先情報 */}
      {invoice.bankTransferInfo && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">振込先情報</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {invoice.bankTransferInfo.bankName && (
              <div>
                <p className="text-sm text-gray-500">銀行名</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{invoice.bankTransferInfo.bankName}</p>
              </div>
            )}
            {invoice.bankTransferInfo.branchName && (
              <div>
                <p className="text-sm text-gray-500">支店名</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{invoice.bankTransferInfo.branchName}</p>
              </div>
            )}
            {invoice.bankTransferInfo.accountType && (
              <div>
                <p className="text-sm text-gray-500">口座種別</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{invoice.bankTransferInfo.accountType}</p>
              </div>
            )}
            {invoice.bankTransferInfo.accountNumber && (
              <div>
                <p className="text-sm text-gray-500">口座番号</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{invoice.bankTransferInfo.accountNumber}</p>
              </div>
            )}
            {invoice.bankTransferInfo.accountName && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">口座名義</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{invoice.bankTransferInfo.accountName}</p>
              </div>
            )}
            {invoice.bankTransferInfo.additionalInfo && (
              <div className="md:col-span-3">
                <p className="text-sm text-gray-500">その他振込情報</p>
                <p className="mt-1 text-sm text-gray-700">{invoice.bankTransferInfo.additionalInfo}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 支払情報 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">支払情報</h2>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
            disabled={invoice.paymentStatus === 'paid'}
          >
            <CreditCard className="w-4 h-4" />
            <span>支払情報を更新</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">支払状況</p>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusStyles[invoice.paymentStatus]}`}>
                {paymentStatusLabels[invoice.paymentStatus]}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支払済み金額</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              ¥{(invoice.paidAmount || 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支払日</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString('ja-JP') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">支払参照番号</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {invoice.paymentReference || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* アクション */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">アクション</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleStatusUpdate('received')}
            disabled={updating || invoice.status === 'received'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            受領済みにする
          </button>
          <button
            onClick={() => handleStatusUpdate('approved')}
            disabled={updating || invoice.status === 'approved'}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            承認する
          </button>
          <button
            onClick={() => handleStatusUpdate('cancelled')}
            disabled={updating || invoice.status === 'cancelled'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>

      {/* 支払情報モーダル */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">支払情報を更新</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">支払状況</label>
                <select
                  value={paymentData.paymentStatus}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentStatus: e.target.value as any })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">未払い</option>
                  <option value="partial">一部支払い</option>
                  <option value="paid">支払済み</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">支払金額</label>
                <input
                  type="number"
                  value={paymentData.paidAmount}
                  onChange={(e) => setPaymentData({ ...paymentData, paidAmount: Number(e.target.value) })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">支払日</label>
                <input
                  type="date"
                  value={paymentData.paidDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paidDate: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">支払参照番号</label>
                <input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                  placeholder="振込番号など"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handlePaymentUpdate}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}