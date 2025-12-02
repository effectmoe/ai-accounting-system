'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Clock,
  Loader2,
  Calendar,
  Landmark,
  Settings,
  Bell,
  RefreshCw,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface ScheduledConfig {
  _id: string;
  name: string;
  isEnabled: boolean;
  bankType: string;
  bankName: string;
  accountAlias?: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  importOptions: {
    autoMatch: boolean;
    autoConfirm: boolean;
    onlyHighConfidence: boolean;
    skipDuplicates: boolean;
  };
  notifications: {
    onSuccess: boolean;
    onError: boolean;
    emailAddresses: string[];
  };
  lastRunAt?: string;
  lastRunStatus?: string;
  nextRunAt?: string;
  createdAt: string;
}

interface BankOption {
  type: string;
  code: string;
  name: string;
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export default function ScheduledImportPage() {
  const [configs, setConfigs] = useState<ScheduledConfig[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduledConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    bankType: '',
    accountAlias: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    autoMatch: true,
    autoConfirm: false,
    onlyHighConfidence: true,
    skipDuplicates: true,
    notifyOnSuccess: false,
    notifyOnError: true,
    emailAddresses: '',
  });

  // 設定一覧を取得
  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bank-import/scheduled');
      const data = await response.json();
      if (data.success) {
        setConfigs(data.items);
      }
    } catch (error) {
      logger.error('Failed to fetch scheduled configs', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 銀行一覧を取得
  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/bank-import/banks');
      const data = await response.json();
      if (data.success) {
        setBanks(data.banks);
      }
    } catch (error) {
      logger.error('Failed to fetch banks', error);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchBanks();
  }, []);

  // 有効/無効を切り替え
  const toggleConfig = async (id: string, isEnabled: boolean) => {
    try {
      await fetch(`/api/bank-import/scheduled/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggle: isEnabled }),
      });
      fetchConfigs();
    } catch (error) {
      logger.error('Failed to toggle config', error);
    }
  };

  // 設定を削除
  const deleteConfig = async (id: string) => {
    if (!confirm('この定期インポート設定を削除しますか？')) return;

    try {
      await fetch(`/api/bank-import/scheduled/${id}`, {
        method: 'DELETE',
      });
      fetchConfigs();
    } catch (error) {
      logger.error('Failed to delete config', error);
    }
  };

  // フォームをリセット
  const resetForm = () => {
    setFormData({
      name: '',
      bankType: '',
      accountAlias: '',
      frequency: 'daily',
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      autoMatch: true,
      autoConfirm: false,
      onlyHighConfidence: true,
      skipDuplicates: true,
      notifyOnSuccess: false,
      notifyOnError: true,
      emailAddresses: '',
    });
    setEditingConfig(null);
  };

  // 新規作成ダイアログを開く
  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const openEditDialog = (config: ScheduledConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      bankType: config.bankType,
      accountAlias: config.accountAlias || '',
      frequency: config.schedule.frequency,
      time: config.schedule.time,
      dayOfWeek: config.schedule.dayOfWeek || 1,
      dayOfMonth: config.schedule.dayOfMonth || 1,
      autoMatch: config.importOptions.autoMatch,
      autoConfirm: config.importOptions.autoConfirm,
      onlyHighConfidence: config.importOptions.onlyHighConfidence,
      skipDuplicates: config.importOptions.skipDuplicates,
      notifyOnSuccess: config.notifications.onSuccess,
      notifyOnError: config.notifications.onError,
      emailAddresses: config.notifications.emailAddresses.join(', '),
    });
    setIsDialogOpen(true);
  };

  // 保存
  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const bank = banks.find((b) => b.type === formData.bankType);
      const body = {
        name: formData.name,
        bankType: formData.bankType,
        bankName: bank?.name || formData.bankType,
        accountAlias: formData.accountAlias || undefined,
        schedule: {
          frequency: formData.frequency,
          time: formData.time,
          dayOfWeek: formData.frequency === 'weekly' ? formData.dayOfWeek : undefined,
          dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
          timezone: 'Asia/Tokyo',
        },
        importOptions: {
          autoMatch: formData.autoMatch,
          autoConfirm: formData.autoConfirm,
          onlyHighConfidence: formData.onlyHighConfidence,
          skipDuplicates: formData.skipDuplicates,
        },
        notifications: {
          onSuccess: formData.notifyOnSuccess,
          onError: formData.notifyOnError,
          emailAddresses: formData.emailAddresses
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e),
        },
      };

      if (editingConfig) {
        await fetch(`/api/bank-import/scheduled/${editingConfig._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/bank-import/scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchConfigs();
    } catch (error) {
      logger.error('Failed to save config', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getFrequencyLabel = (config: ScheduledConfig) => {
    const { frequency, time, dayOfWeek, dayOfMonth } = config.schedule;
    switch (frequency) {
      case 'daily':
        return `毎日 ${time}`;
      case 'weekly':
        return `毎週${DAYS_OF_WEEK[dayOfWeek || 0]}曜日 ${time}`;
      case 'monthly':
        return `毎月${dayOfMonth}日 ${time}`;
      default:
        return time;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/bank-import">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              インポートに戻る
            </Button>
          </Link>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-8 w-8" />
              定期インポート設定
            </h1>
            <p className="text-gray-600 mt-2">
              銀行取引の自動インポートスケジュールを設定します
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>設定一覧</CardTitle>
          <CardDescription>
            {configs.length} 件の定期インポート設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>定期インポート設定がありません</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                最初の設定を作成
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>有効</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>銀行</TableHead>
                  <TableHead>スケジュール</TableHead>
                  <TableHead>次回実行</TableHead>
                  <TableHead>最終実行</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config._id}>
                    <TableCell>
                      <Switch
                        checked={config.isEnabled}
                        onCheckedChange={(checked) => toggleConfig(config._id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Landmark className="h-4 w-4 text-gray-400" />
                        {config.bankName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {getFrequencyLabel(config)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.nextRunAt && config.isEnabled ? (
                        <span className="text-sm text-gray-600">
                          {format(new Date(config.nextRunAt), 'MM/dd HH:mm', { locale: ja })}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {config.lastRunAt ? (
                        <div>
                          <span className="text-sm text-gray-600">
                            {format(new Date(config.lastRunAt), 'MM/dd HH:mm', { locale: ja })}
                          </span>
                          {config.lastRunStatus && (
                            <Badge
                              className={`ml-2 ${
                                config.lastRunStatus === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : config.lastRunStatus === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {config.lastRunStatus === 'success' ? '成功' :
                               config.lastRunStatus === 'failed' ? '失敗' : '一部'}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">未実行</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConfig(config._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 設定ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? '定期インポート設定を編集' : '新規定期インポート設定'}
            </DialogTitle>
            <DialogDescription>
              銀行取引の自動インポートスケジュールを設定します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 基本設定 */}
            <div className="space-y-2">
              <Label htmlFor="name">設定名</Label>
              <Input
                id="name"
                placeholder="例: 住信SBI 毎日インポート"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankType">銀行</Label>
              <Select
                value={formData.bankType}
                onValueChange={(value) => setFormData({ ...formData, bankType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="銀行を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.type} value={bank.type}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountAlias">口座名（任意）</Label>
              <Input
                id="accountAlias"
                placeholder="例: 事業用口座"
                value={formData.accountAlias}
                onChange={(e) => setFormData({ ...formData, accountAlias: e.target.value })}
              />
            </div>

            {/* スケジュール設定 */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                スケジュール
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>頻度</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">毎日</SelectItem>
                      <SelectItem value="weekly">毎週</SelectItem>
                      <SelectItem value="monthly">毎月</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>時刻</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              {formData.frequency === 'weekly' && (
                <div className="space-y-2 mt-4">
                  <Label>曜日</Label>
                  <Select
                    value={formData.dayOfWeek.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}曜日
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div className="space-y-2 mt-4">
                  <Label>日</Label>
                  <Select
                    value={formData.dayOfMonth.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}日
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* インポートオプション */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1">
                <Settings className="h-4 w-4" />
                インポートオプション
              </p>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoMatch"
                    checked={formData.autoMatch}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoMatch: checked as boolean })
                    }
                  />
                  <label htmlFor="autoMatch" className="text-sm">
                    請求書と自動マッチング
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoConfirm"
                    checked={formData.autoConfirm}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoConfirm: checked as boolean })
                    }
                  />
                  <label htmlFor="autoConfirm" className="text-sm">
                    マッチした入金を自動確認
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={formData.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, skipDuplicates: checked as boolean })
                    }
                  />
                  <label htmlFor="skipDuplicates" className="text-sm">
                    重複取引をスキップ
                  </label>
                </div>
              </div>
            </div>

            {/* 通知設定 */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3 flex items-center gap-1">
                <Bell className="h-4 w-4" />
                通知設定
              </p>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyOnError"
                    checked={formData.notifyOnError}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notifyOnError: checked as boolean })
                    }
                  />
                  <label htmlFor="notifyOnError" className="text-sm">
                    エラー時に通知
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyOnSuccess"
                    checked={formData.notifyOnSuccess}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notifyOnSuccess: checked as boolean })
                    }
                  />
                  <label htmlFor="notifyOnSuccess" className="text-sm">
                    成功時に通知
                  </label>
                </div>

                {(formData.notifyOnError || formData.notifyOnSuccess) && (
                  <div className="space-y-2">
                    <Label>通知先メールアドレス</Label>
                    <Input
                      placeholder="example@email.com, other@email.com"
                      value={formData.emailAddresses}
                      onChange={(e) => setFormData({ ...formData, emailAddresses: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">カンマ区切りで複数指定可能</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isProcessing || !formData.name || !formData.bankType}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingConfig ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
