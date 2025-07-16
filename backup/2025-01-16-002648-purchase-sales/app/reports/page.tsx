'use client';

import { useState, useEffect } from 'react';
import { ReportGenerator, SalesReport, JournalReport, TaxReport } from '@/lib/report-generator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Calculator, Download } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

type ReportType = 'sales' | 'journal' | 'tax';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [journalReport, setJournalReport] = useState<JournalReport | null>(null);
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);

  useEffect(() => {
    loadReport();
  }, [activeReport, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用
      
      switch (activeReport) {
        case 'sales':
          const sales = await ReportGenerator.generateSalesReport(
            companyId,
            dateRange.start,
            dateRange.end
          );
          setSalesReport(sales);
          break;
        case 'journal':
          const journal = await ReportGenerator.generateJournalReport(
            companyId,
            dateRange.start,
            dateRange.end
          );
          setJournalReport(journal);
          break;
        case 'tax':
          const tax = await ReportGenerator.generateTaxReport(
            companyId,
            dateRange.start,
            dateRange.end
          );
          setTaxReport(tax);
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const renderSalesReport = () => {
    if (!salesReport) return null;

    const typeData = [
      { name: '見積書', value: salesReport.byType.estimates.amount },
      { name: '請求書', value: salesReport.byType.invoices.amount },
      { name: '納品書', value: salesReport.byType.deliveryNotes.amount },
      { name: '領収書', value: salesReport.byType.receipts.amount }
    ].filter(item => item.value > 0);

    return (
      <div className="space-y-6">
        {/* サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(salesReport.summary.totalSales)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">消費税</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(salesReport.summary.totalTax)}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">文書数</p>
                <p className="text-3xl font-bold text-gray-900">
                  {salesReport.summary.documentCount.toLocaleString()}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* 文書タイプ別円グラフ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">文書タイプ別売上</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatCurrency(Number(value))}`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 月次トレンド */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">月次売上トレンド</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesReport.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 取引先別売上トップ10 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">取引先別売上トップ10</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文書数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">売上金額</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesReport.byPartner.map((partner, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {partner.partnerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {partner.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(partner.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderJournalReport = () => {
    if (!journalReport) return null;

    return (
      <div className="space-y-6">
        {/* サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600">仕訳数</p>
            <p className="text-3xl font-bold text-gray-900">
              {journalReport.summary.totalEntries.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600">借方合計</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(journalReport.summary.totalDebit)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600">貸方合計</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(journalReport.summary.totalCredit)}
            </p>
          </div>
        </div>

        {/* 勘定科目別残高 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">勘定科目別残高</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">科目コード</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">科目名</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">借方</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">貸方</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">残高</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {journalReport.byAccount.slice(0, 20).map((account, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account.accountCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.accountName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(account.debitAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(account.creditAmount)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(account.balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTaxReport = () => {
    if (!taxReport) return null;

    return (
      <div className="space-y-6">
        {/* 消費税サマリー */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">消費税集計</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 売上 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">売上</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">標準税率（10%）</span>
                  <span className="text-sm">
                    {formatCurrency(taxReport.consumption_tax.sales.standard_rate.subtotal)} 
                    （税額: {formatCurrency(taxReport.consumption_tax.sales.standard_rate.tax)}）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">軽減税率（8%）</span>
                  <span className="text-sm">
                    {formatCurrency(taxReport.consumption_tax.sales.reduced_rate.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.sales.reduced_rate.tax)}）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">輸出免税</span>
                  <span className="text-sm">
                    {formatCurrency(taxReport.consumption_tax.sales.export.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.sales.export.tax)}）
                  </span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>合計</span>
                  <span>
                    {formatCurrency(taxReport.consumption_tax.sales.total.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.sales.total.tax)}）
                  </span>
                </div>
              </div>
            </div>

            {/* 仕入 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">仕入</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">標準税率（10%）</span>
                  <span className="text-sm">
                    {formatCurrency(taxReport.consumption_tax.purchases.standard_rate.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.purchases.standard_rate.tax)}）
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">軽減税率（8%）</span>
                  <span className="text-sm">
                    {formatCurrency(taxReport.consumption_tax.purchases.reduced_rate.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.purchases.reduced_rate.tax)}）
                  </span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>合計</span>
                  <span>
                    {formatCurrency(taxReport.consumption_tax.purchases.total.subtotal)}
                    （税額: {formatCurrency(taxReport.consumption_tax.purchases.total.tax)}）
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 納付・還付税額 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">
                {taxReport.consumption_tax.payable_refundable >= 0 ? '納付税額' : '還付税額'}
              </span>
              <span className={`text-xl font-bold ${
                taxReport.consumption_tax.payable_refundable >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(Math.abs(taxReport.consumption_tax.payable_refundable))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">レポート</h1>
        </div>

        {/* フィルター */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">期間:</span>
            </div>
            
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
            
            <span className="text-gray-500">〜</span>
            
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* タブ */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              {[
                { key: 'sales', label: '売上レポート', icon: TrendingUp },
                { key: 'journal', label: '仕訳レポート', icon: FileText },
                { key: 'tax', label: '税務レポート', icon: Calculator }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveReport(tab.key as ReportType)}
                  className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeReport === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">レポートを生成中...</span>
                </div>
              </div>
            ) : (
              <>
                {activeReport === 'sales' && renderSalesReport()}
                {activeReport === 'journal' && renderJournalReport()}
                {activeReport === 'tax' && renderTaxReport()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}