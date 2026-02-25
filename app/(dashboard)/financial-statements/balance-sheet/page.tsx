'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import type { BalanceSheetResult, BSSection } from '@/types/financial-statements';

const formatCurrency = (amount: number) =>
  `¥${Math.abs(amount).toLocaleString()}`;

const currentFiscalYearEnd = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-03-31`;
};

function BSTable({ section }: { section: BSSection }) {
  if (section.items.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b border-gray-200 pb-1">
        {section.title}
      </h3>
      <table className="w-full text-sm">
        <tbody>
          {section.items.map((item, i) => (
            <tr key={`${item.accountCode}-${i}`} className="hover:bg-gray-50">
              <td className="py-1 pl-4 text-gray-600">{item.accountName}</td>
              <td className="py-1 text-right pr-2 font-mono">{formatCurrency(item.balance)}</td>
            </tr>
          ))}
          <tr className="border-t border-gray-300 font-semibold">
            <td className="py-1 pl-2 text-gray-800">{section.title}合計</td>
            <td className="py-1 text-right pr-2 font-mono">{formatCurrency(section.subtotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(currentFiscalYearEnd());
  const [data, setData] = useState<BalanceSheetResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financial-statements/balance-sheet?asOfDate=${asOfDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || '取得に失敗しました');
      }
    } catch (e: any) {
      setError(e.message || 'ネットワークエラー');
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadCSV = async () => {
    if (!data) return;
    const rows = [
      ['貸借対照表', `基準日: ${data.asOfDate}`],
      [],
      ['【資産の部】'],
      ['流動資産'],
      ...data.assets.current.items.map((i) => ['', i.accountName, String(i.balance)]),
      ['', '流動資産合計', String(data.assets.current.subtotal)],
      ['固定資産'],
      ...data.assets.fixed.items.map((i) => ['', i.accountName, String(i.balance)]),
      ['', '固定資産合計', String(data.assets.fixed.subtotal)],
      ['', '資産合計', String(data.assets.total)],
      [],
      ['【負債の部】'],
      ['流動負債'],
      ...data.liabilities.current.items.map((i) => ['', i.accountName, String(i.balance)]),
      ['', '流動負債合計', String(data.liabilities.current.subtotal)],
      ['固定負債'],
      ...data.liabilities.fixed.items.map((i) => ['', i.accountName, String(i.balance)]),
      ['', '固定負債合計', String(data.liabilities.fixed.subtotal)],
      ['', '負債合計', String(data.liabilities.total)],
      [],
      ['【純資産の部】'],
      ...data.equity.capital.items.map((i) => ['', i.accountName, String(i.balance)]),
      ['', '純資産合計', String(data.equity.total)],
      [],
      ['', '負債純資産合計', String(data.totalLiabilitiesAndEquity)],
    ];

    const BOM = '\uFEFF';
    const csv = BOM + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_sheet_${data.asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">貸借対照表（B/S）</h1>
          <p className="mt-1 text-sm text-gray-600">Balance Sheet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm text-gray-600">基準日:</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleDownloadCSV}
            disabled={!data}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* 貸借一致バッジ */}
      {data && (
        <div className={`mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          data.isBalanced
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {data.isBalanced ? (
            <>
              <CheckCircle className="h-4 w-4" />
              貸借一致
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              貸借不一致（差額: {formatCurrency(data.balanceDifference)}）
            </>
          )}
        </div>
      )}

      {/* ローディング・エラー */}
      {loading && (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* B/S本体 */}
      {data && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左: 資産の部 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
              資産の部
            </h2>
            <BSTable section={data.assets.current} />
            <BSTable section={data.assets.fixed} />
            <BSTable section={data.assets.deferred} />
            <div className="mt-4 pt-3 border-t-2 border-gray-800">
              <div className="flex justify-between text-lg font-bold">
                <span>資産合計</span>
                <span className="font-mono">{formatCurrency(data.assets.total)}</span>
              </div>
            </div>
          </div>

          {/* 右: 負債・純資産の部 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-red-500 pb-2">
              負債の部
            </h2>
            <BSTable section={data.liabilities.current} />
            <BSTable section={data.liabilities.fixed} />
            <div className="mt-4 pt-3 border-t border-gray-400">
              <div className="flex justify-between font-semibold">
                <span>負債合計</span>
                <span className="font-mono">{formatCurrency(data.liabilities.total)}</span>
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mt-6 mb-4 border-b-2 border-green-500 pb-2">
              純資産の部
            </h2>
            <BSTable section={data.equity.capital} />
            <div className="mt-4 pt-3 border-t border-gray-400">
              <div className="flex justify-between font-semibold">
                <span>純資産合計</span>
                <span className="font-mono">{formatCurrency(data.equity.total)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-gray-800">
              <div className="flex justify-between text-lg font-bold">
                <span>負債純資産合計</span>
                <span className="font-mono">{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
