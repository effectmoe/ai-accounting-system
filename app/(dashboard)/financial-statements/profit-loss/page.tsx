'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { ProfitLossResult, PLSection } from '@/types/financial-statements';

const formatCurrency = (amount: number) =>
  `¥${Math.abs(amount).toLocaleString()}`;

const currentFiscalYearStart = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
};

const currentFiscalYearEnd = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-03-31`;
};

function PLSectionTable({ section }: { section: PLSection }) {
  if (section.items.length === 0) return null;

  return (
    <div className="mb-2">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{section.title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {section.items.map((item, i) => (
            <tr key={`${item.accountCode}-${i}`} className="hover:bg-gray-50">
              <td className="py-0.5 pl-6 text-gray-600">{item.accountName}</td>
              <td className="py-0.5 text-right pr-2 font-mono">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
          <tr className="border-t border-gray-200">
            <td className="py-1 pl-4 font-medium text-gray-700">{section.title}合計</td>
            <td className="py-1 text-right pr-2 font-mono font-medium">
              {formatCurrency(section.subtotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ProfitRow({
  label,
  amount,
  previousAmount,
  showYoY,
  highlight,
}: {
  label: string;
  amount: number;
  previousAmount?: number;
  showYoY: boolean;
  highlight?: boolean;
}) {
  const change = previousAmount !== undefined ? amount - previousAmount : undefined;
  const changeRate = previousAmount && previousAmount !== 0
    ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100
    : undefined;

  return (
    <div className={`flex items-center justify-between py-2 px-4 ${
      highlight ? 'bg-indigo-50 border-y border-indigo-200' : ''
    }`}>
      <span className={`font-semibold ${highlight ? 'text-indigo-900 text-base' : 'text-gray-800'}`}>
        {label}
      </span>
      <div className="flex items-center gap-4">
        <span className={`font-mono ${highlight ? 'text-lg font-bold' : 'font-medium'} ${
          amount >= 0 ? 'text-gray-900' : 'text-red-600'
        }`}>
          {amount < 0 && '△'}{formatCurrency(amount)}
        </span>
        {showYoY && change !== undefined && (
          <span className={`text-xs flex items-center gap-1 ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {change > 0 ? <TrendingUp className="h-3 w-3" /> :
             change < 0 ? <TrendingDown className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            {changeRate !== undefined && `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(1)}%`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProfitLossPage() {
  const [periodStart, setPeriodStart] = useState(currentFiscalYearStart());
  const [periodEnd, setPeriodEnd] = useState(currentFiscalYearEnd());
  const [includeYoY, setIncludeYoY] = useState(false);
  const [data, setData] = useState<ProfitLossResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        periodStart,
        periodEnd,
        includeYoY: String(includeYoY),
      });
      const res = await fetch(`/api/financial-statements/profit-loss?${params}`);
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
  }, [periodStart, periodEnd, includeYoY]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadCSV = () => {
    if (!data) return;
    const rows = [
      ['損益計算書', `${data.periodStart} 〜 ${data.periodEnd}`],
      [],
      ['売上高', String(data.revenue.subtotal)],
      ...data.revenue.items.map((i) => ['', i.accountName, String(i.amount)]),
      ['売上原価', String(data.costOfGoodsSold.subtotal)],
      ...data.costOfGoodsSold.items.map((i) => ['', i.accountName, String(i.amount)]),
      ['売上総利益', String(data.grossProfit)],
      [],
      ['販売費及び一般管理費', String(data.sellingAndAdmin.subtotal)],
      ...data.sellingAndAdmin.items.map((i) => ['', i.accountName, String(i.amount)]),
      ['営業利益', String(data.operatingProfit)],
      [],
      ['営業外収益', String(data.nonOperatingRevenue.subtotal)],
      ['営業外費用', String(data.nonOperatingExpenses.subtotal)],
      ['経常利益', String(data.ordinaryProfit)],
      [],
      ['特別利益', String(data.extraordinaryGains.subtotal)],
      ['特別損失', String(data.extraordinaryLosses.subtotal)],
      ['税引前当期純利益', String(data.profitBeforeTax)],
      ['当期純利益', String(data.netIncome)],
    ];

    const BOM = '\uFEFF';
    const csv = BOM + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_loss_${data.periodStart}_${data.periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ウォーターフォールチャート用データ
  const chartData = data
    ? [
        { name: '売上総利益', value: data.grossProfit, color: '#3b82f6' },
        { name: '営業利益', value: data.operatingProfit, color: '#10b981' },
        { name: '経常利益', value: data.ordinaryProfit, color: '#8b5cf6' },
        { name: '当期純利益', value: data.netIncome, color: data.netIncome >= 0 ? '#059669' : '#dc2626' },
      ]
    : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">損益計算書（P/L）</h1>
          <p className="mt-1 text-sm text-gray-600">Profit & Loss Statement</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={includeYoY}
              onChange={(e) => setIncludeYoY(e.target.checked)}
              className="rounded border-gray-300"
            />
            前年比較
          </label>
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

      {/* ローディング・エラー */}
      {loading && <div className="text-center py-12 text-gray-500">読み込み中...</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">{error}</div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* P/L本体 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* 売上高 */}
            <PLSectionTable section={data.revenue} />
            <PLSectionTable section={data.costOfGoodsSold} />
            <ProfitRow
              label="売上総利益"
              amount={data.grossProfit}
              previousAmount={data.previousYear?.grossProfit}
              showYoY={includeYoY}
              highlight
            />

            {/* 販管費 */}
            <div className="px-4 pt-3">
              <PLSectionTable section={data.sellingAndAdmin} />
            </div>
            <ProfitRow
              label="営業利益"
              amount={data.operatingProfit}
              previousAmount={data.previousYear?.operatingProfit}
              showYoY={includeYoY}
              highlight
            />

            {/* 営業外損益 */}
            <div className="px-4 pt-3">
              <PLSectionTable section={data.nonOperatingRevenue} />
              <PLSectionTable section={data.nonOperatingExpenses} />
            </div>
            <ProfitRow
              label="経常利益"
              amount={data.ordinaryProfit}
              previousAmount={data.previousYear?.ordinaryProfit}
              showYoY={includeYoY}
              highlight
            />

            {/* 特別損益 */}
            <div className="px-4 pt-3">
              <PLSectionTable section={data.extraordinaryGains} />
              <PLSectionTable section={data.extraordinaryLosses} />
            </div>
            <ProfitRow
              label="税引前当期純利益"
              amount={data.profitBeforeTax}
              showYoY={false}
            />
            <ProfitRow
              label="当期純利益"
              amount={data.netIncome}
              previousAmount={data.previousYear?.netIncome}
              showYoY={includeYoY}
              highlight
            />
          </div>

          {/* 利益推移チャート */}
          {chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">利益段階推移</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '金額']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
