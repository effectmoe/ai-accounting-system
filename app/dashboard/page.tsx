'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, FileText, AlertCircle } from 'lucide-react';

interface DashboardData {
  revenue: number;
  expenses: number;
  profit: number;
  recentEntries: number;
  error?: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    recentEntries: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/metrics');
      
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      
      const result = await response.json();
      
      // APIからのデータを使用
      setData({
        revenue: result.totalRevenue || 0,
        expenses: Math.floor((result.totalRevenue || 0) * 0.7), // 仮の経費計算
        profit: Math.floor((result.totalRevenue || 0) * 0.3), // 仮の利益計算
        recentEntries: result.recentActivities?.length || 0
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      setData({
        revenue: 0,
        expenses: 0,
        profit: 0,
        recentEntries: 0,
        error: 'データの読み込みに失敗しました'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">AAMマストラ会計</h1>
      
      {data.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {data.error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">今月の売上</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ¥{loading ? '...' : data.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">今月の経費</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ¥{loading ? '...' : data.expenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">利益</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ¥{loading ? '...' : data.profit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              音声入力
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition-colors">
              🎤 音声入力
            </button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              レポート・分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button className="w-full bg-gray-100 text-gray-700 py-3 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
              📊 レポート 📈 分析
            </button>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>最近の入力</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {loading ? '読み込み中...' : `${data.recentEntries}件`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}