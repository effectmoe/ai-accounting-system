'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ContractorDashboard from '@/components/individual-contractor/Dashboard';
import { Project, TransactionWithProject, MonthlyStats } from '@/types/tenant-collections';
import { useTenant } from '@/contexts/TenantContext';
import { TenantType } from '@/types/tenant';

export default function IndividualContractorPage() {
  const router = useRouter();
  const { tenant, loading } = useTenant();
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithProject[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    cashBalance: 0,
    cashBalanceChange: 0,
    monthlyRevenue: 0,
    monthlyTarget: 0,
    receivables: 0,
    receivablesWithin30Days: 0,
    projectsActive: 0,
    projectsCompleted: 0,
    profitMargin: 0
  });

  useEffect(() => {
    // エンタープライズユーザーの場合はリダイレクト
    if (!loading && tenant?.tenantType !== TenantType.INDIVIDUAL_CONTRACTOR) {
      router.push('/');
    }
  }, [tenant, loading, router]);

  useEffect(() => {
    if (tenant?.tenantType === TenantType.INDIVIDUAL_CONTRACTOR) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    try {
      // プロジェクトデータの取得
      const projectsRes = await fetch(`/api/projects?tenantId=${tenant?.tenantId}`);
      const projectsData = await projectsRes.json();
      setProjects(projectsData.projects || []);

      // TODO: 実際のトランザクションデータを取得
      // const transactionsRes = await fetch(`/api/transactions?tenantId=${tenant?.tenantId}`);
      // const transactionsData = await transactionsRes.json();
      // setTransactions(transactionsData.transactions || []);

      // サンプルデータ
      setTransactions([
        {
          id: '1',
          date: '2024-01-15',
          description: 'A現場 材料購入',
          vendor: 'ホームセンター',
          amount: 25000,
          taxAmount: 2272,
          type: 'expense',
          category: 'material',
          projectCode: 'P0001',
          aiConfidence: 0.95,
          status: 'completed'
        },
        {
          id: '2',
          date: '2024-01-14',
          description: '工事代金入金',
          amount: 500000,
          type: 'income',
          category: 'revenue',
          projectCode: 'P0001',
          status: 'completed'
        },
        {
          id: '3',
          date: '2024-01-13',
          description: '協力業者支払い',
          vendor: '〇〇工務店',
          amount: 150000,
          taxAmount: 13636,
          type: 'expense',
          category: 'subcontract',
          projectCode: 'P0002',
          aiConfidence: 0.92,
          status: 'pending'
        }
      ]);

      // サンプル統計データ
      setMonthlyStats({
        cashBalance: 1250000,
        cashBalanceChange: 5.2,
        monthlyRevenue: 850000,
        monthlyTarget: 1000000,
        receivables: 450000,
        receivablesWithin30Days: 3,
        projectsActive: projects.filter(p => p.status === 'active').length,
        projectsCompleted: projects.filter(p => p.status === 'completed').length,
        profitMargin: 28.5
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">読み込み中...</div>;
  }

  if (tenant?.tenantType !== TenantType.INDIVIDUAL_CONTRACTOR) {
    return null;
  }

  return (
    <ContractorDashboard
      tenantId={tenant.tenantId}
      projects={projects}
      recentTransactions={transactions}
      monthlyStats={monthlyStats}
    />
  );
}