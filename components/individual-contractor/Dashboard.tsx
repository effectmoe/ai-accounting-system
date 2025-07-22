'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock as Timeline, Calendar, Layout as Kanban, BarChart3 } from 'lucide-react';
import { Project, TransactionWithProject, MonthlyStats } from '@/types/tenant-collections';
import TimelineView from './TimelineView';
import ProjectKanbanView from './ProjectKanbanView';
// import CalendarView from './CalendarView';
// import ReportsView from './ReportsView';

interface DashboardProps {
  tenantId: string;
  projects: Project[];
  recentTransactions: TransactionWithProject[];
  monthlyStats: MonthlyStats;
}

export default function ContractorDashboard({ 
  tenantId, 
  projects, 
  recentTransactions, 
  monthlyStats 
}: DashboardProps) {
  const [activeView, setActiveView] = useState<'timeline' | 'kanban' | 'calendar' | 'reports'>('timeline');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">匠クラウド会計</h1>
        <p className="text-gray-600">1人親方専用ダッシュボード</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">現金残高</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{monthlyStats.cashBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              前月比 {monthlyStats.cashBalanceChange > 0 ? '+' : ''}{monthlyStats.cashBalanceChange}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の売上</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{monthlyStats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              目標達成率 {Math.round((monthlyStats.monthlyRevenue / monthlyStats.monthlyTarget) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未収金</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{monthlyStats.receivables.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              30日以内: {monthlyStats.receivablesWithin30Days}件
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ビュー切り替えタブ */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Timeline className="h-4 w-4" />
            タイムライン
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            プロジェクト
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            カレンダー
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            レポート
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <TimelineView transactions={recentTransactions} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-6">
          <ProjectKanbanView projects={projects} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          {/* TODO: CalendarViewコンポーネントを実装 */}
          <div className="text-center py-12 text-gray-500">
            カレンダービューは開発中です
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {/* TODO: ReportsViewコンポーネントを実装 */}
          <div className="text-center py-12 text-gray-500">
            レポートビューは開発中です
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}