'use client';

import Link from 'next/link';
import { FileText, BarChart3, Download, ClipboardCheck } from 'lucide-react';

const cards = [
  {
    title: '貸借対照表（B/S）',
    description: '資産・負債・純資産の残高を一覧表示。貸借一致の検証も自動で行います。',
    href: '/financial-statements/balance-sheet',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    title: '損益計算書（P/L）',
    description: '売上・費用・利益を段階的に表示。前年同期比較にも対応。',
    href: '/financial-statements/profit-loss',
    icon: BarChart3,
    color: 'text-green-600 bg-green-50',
  },
  {
    title: '残高試算表',
    description: '全勘定科目の借方・貸方残高を一覧表示。決算前の検証に。',
    href: '/api/financial-statements/trial-balance?dateFrom=2025-04-01&dateTo=2026-03-31',
    icon: ClipboardCheck,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    title: 'shinkoku エクスポート',
    description: '仕訳データをshinkoku形式でエクスポート。確定申告の準備に。',
    href: '/financial-statements/export',
    icon: Download,
    color: 'text-purple-600 bg-purple-50',
  },
];

export default function FinancialStatementsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">財務諸表</h1>
        <p className="mt-2 text-gray-600">
          仕訳データから貸借対照表・損益計算書を生成し、確定申告データのエクスポートまで対応します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex items-center justify-center rounded-lg p-3 ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">{card.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
