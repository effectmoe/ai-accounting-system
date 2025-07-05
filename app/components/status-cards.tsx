'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase-client';

interface StatusData {
  companies: number;
  transactions: number;
  accounts: number;
  invoices: number;
}

export default function StatusCards() {
  const [status, setStatus] = useState<StatusData>({
    companies: 0,
    transactions: 0,
    accounts: 0,
    invoices: 0
  });

  useEffect(() => {
    async function fetchStatus() {
      if (!isSupabaseConfigured()) {
        // モックデータを使用
        setStatus({
          companies: 3,
          transactions: 156,
          accounts: 24,
          invoices: 45
        });
        return;
      }

      try {
        // 会社数
        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // 取引数
        const { count: transactionsCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });

        // 勘定科目数
        const { count: accountsCount } = await supabase
          .from('accounts')
          .select('*', { count: 'exact', head: true });

        // 請求書数
        const { count: invoicesCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true });

        setStatus({
          companies: companiesCount || 0,
          transactions: transactionsCount || 0,
          accounts: accountsCount || 0,
          invoices: invoicesCount || 0
        });
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    }

    fetchStatus();
  }, []);

  const cards = [
    {
      title: '登録会社',
      value: status.companies,
      icon: '🏢',
      color: 'bg-blue-100 text-blue-800',
      bgColor: 'bg-blue-50'
    },
    {
      title: '取引数',
      value: status.transactions,
      icon: '💳',
      color: 'bg-green-100 text-green-800',
      bgColor: 'bg-green-50'
    },
    {
      title: '勘定科目',
      value: status.accounts,
      icon: '📊',
      color: 'bg-purple-100 text-purple-800',
      bgColor: 'bg-purple-50'
    },
    {
      title: '請求書',
      value: status.invoices,
      icon: '📄',
      color: 'bg-orange-100 text-orange-800',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">{card.icon}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${card.color}`}>
              {card.value > 0 ? '+' : ''}{card.value}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}