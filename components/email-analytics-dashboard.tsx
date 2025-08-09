'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface EmailStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  openRate: number;
  clickRate: number;
  totalEmails: number;
}

interface EmailEvent {
  _id: string;
  messageId: string;
  quoteId: string;
  recipientEmail: string;
  trackingId?: string;
  sentAt: Date;
  status: string;
  events: Array<{
    type: string;
    timestamp: Date;
    data?: any;
  }>;
}

interface EmailAnalyticsDashboardProps {
  quoteId?: string;
  dateRange?: 'day' | 'week' | 'month' | 'year';
}

export default function EmailAnalyticsDashboard({
  quoteId,
  dateRange = 'week',
}: EmailAnalyticsDashboardProps) {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [quoteId, selectedDateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 統計データを取得
      if (quoteId) {
        const statsResponse = await fetch(`/api/email-events/stats?quoteId=${quoteId}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // イベント履歴を取得
        const eventsResponse = await fetch(`/api/email-events?quoteId=${quoteId}`);
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData);
        }
      } else {
        // 全体の統計を取得（実装が必要な場合）
        setStats({
          sent: 124,
          delivered: 120,
          opened: 89,
          clicked: 45,
          bounced: 3,
          complained: 1,
          openRate: 71.8,
          clickRate: 36.3,
          totalEmails: 124,
        });

        // サンプルデータ
        setEvents([
          {
            _id: '1',
            messageId: 'msg-001',
            quoteId: 'quote-001',
            recipientEmail: 'customer1@example.com',
            trackingId: 'track-001',
            sentAt: new Date('2024-12-01T10:00:00'),
            status: 'opened',
            events: [
              { type: 'sent', timestamp: new Date('2024-12-01T10:00:00') },
              { type: 'delivered', timestamp: new Date('2024-12-01T10:00:05') },
              { type: 'opened', timestamp: new Date('2024-12-01T10:30:00') },
            ],
          },
          {
            _id: '2',
            messageId: 'msg-002',
            quoteId: 'quote-002',
            recipientEmail: 'customer2@example.com',
            trackingId: 'track-002',
            sentAt: new Date('2024-12-01T11:00:00'),
            status: 'clicked',
            events: [
              { type: 'sent', timestamp: new Date('2024-12-01T11:00:00') },
              { type: 'delivered', timestamp: new Date('2024-12-01T11:00:03') },
              { type: 'opened', timestamp: new Date('2024-12-01T11:15:00') },
              { type: 'clicked', timestamp: new Date('2024-12-01T11:16:00') },
            ],
          },
        ]);
      }
    } catch (error) {
      logger.error('Error fetching email analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'opened':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-purple-500" />;
      case 'bounced':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'complained':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-gray-100 text-gray-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'opened':
        return 'bg-blue-100 text-blue-800';
      case 'clicked':
        return 'bg-purple-100 text-purple-800';
      case 'bounced':
        return 'bg-red-100 text-red-800';
      case 'complained':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // チャート用のデータ
  const chartData = [
    { name: '送信', value: stats?.sent || 0, color: '#6B7280' },
    { name: '配信済み', value: stats?.delivered || 0, color: '#10B981' },
    { name: '開封', value: stats?.opened || 0, color: '#3B82F6' },
    { name: 'クリック', value: stats?.clicked || 0, color: '#8B5CF6' },
  ];

  const timelineData = [
    { time: '0-1時間', opens: 12, clicks: 5 },
    { time: '1-6時間', opens: 35, clicks: 18 },
    { time: '6-24時間', opens: 28, clicks: 15 },
    { time: '1-3日', opens: 10, clicks: 5 },
    { time: '3-7日', opens: 4, clicks: 2 },
  ];

  const filteredEvents = events.filter(
    event => selectedStatus === 'all' || event.status === selectedStatus
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">メール分析ダッシュボード</h2>
          <p className="text-muted-foreground mt-1">
            メール送信の効果を可視化・分析します
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">今日</SelectItem>
              <SelectItem value="week">今週</SelectItem>
              <SelectItem value="month">今月</SelectItem>
              <SelectItem value="year">今年</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">送信数</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">
                配信成功率: {stats.delivered > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">開封率</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openRate}%</div>
              <Progress value={stats.openRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.opened} / {stats.sent} 通
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">クリック率</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clickRate}%</div>
              <Progress value={stats.clickRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.clicked} / {stats.sent} 通
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">エラー率</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.sent > 0 ? Math.round(((stats.bounced + stats.complained) / stats.sent) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                バウンス: {stats.bounced} / 苦情: {stats.complained}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* チャート */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="timeline">タイムライン</TabsTrigger>
          <TabsTrigger value="history">送信履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 円グラフ */}
            <Card>
              <CardHeader>
                <CardTitle>メールステータス分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 棒グラフ */}
            <Card>
              <CardHeader>
                <CardTitle>開封・クリックのタイミング</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="opens" fill="#3B82F6" name="開封" />
                    <Bar dataKey="clicks" fill="#8B5CF6" name="クリック" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>時系列分析</CardTitle>
              <CardDescription>
                開封率とクリック率の推移
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={[
                    { date: '12/1', openRate: 65, clickRate: 30 },
                    { date: '12/2', openRate: 68, clickRate: 32 },
                    { date: '12/3', openRate: 70, clickRate: 35 },
                    { date: '12/4', openRate: 72, clickRate: 36 },
                    { date: '12/5', openRate: 71, clickRate: 38 },
                    { date: '12/6', openRate: 73, clickRate: 37 },
                    { date: '12/7', openRate: 72, clickRate: 36 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="openRate" stroke="#3B82F6" name="開封率 (%)" />
                  <Line type="monotone" dataKey="clickRate" stroke="#8B5CF6" name="クリック率 (%)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>送信履歴</CardTitle>
              <CardDescription>
                メール送信の詳細履歴
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="sent">送信済み</SelectItem>
                    <SelectItem value="delivered">配信済み</SelectItem>
                    <SelectItem value="opened">開封済み</SelectItem>
                    <SelectItem value="clicked">クリック済み</SelectItem>
                    <SelectItem value="bounced">バウンス</SelectItem>
                    <SelectItem value="complained">苦情</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>送信日時</TableHead>
                    <TableHead>宛先</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>最終イベント</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => {
                    const lastEvent = event.events[event.events.length - 1];
                    return (
                      <TableRow key={event._id}>
                        <TableCell>
                          {format(new Date(event.sentAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                        </TableCell>
                        <TableCell>{event.recipientEmail}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(event.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(event.status)}
                              {event.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lastEvent && format(new Date(lastEvent.timestamp), 'MM/dd HH:mm', { locale: ja })}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            詳細
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}