'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Loader2,
  Settings,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  ToggleLeft,
  ToggleRight,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { logger } from '@/lib/logger';
import { ACCOUNT_CATEGORIES } from '@/types/receipt';
import type {
  LearningRule,
  MatchCondition,
  MatchField,
  MatchOperator,
  RuleOutput,
  MATCH_FIELD_LABELS,
  MATCH_OPERATOR_LABELS,
} from '@/types/learning-rule';

// フィールドラベル
const FIELD_LABELS: Record<MatchField, string> = {
  issuerName: '発行元',
  itemName: '項目名',
  subject: '但し書き',
  title: 'タイトル',
  ocrText: 'OCRテキスト全体',
};

// 演算子ラベル
const OPERATOR_LABELS: Record<MatchOperator, string> = {
  contains: '含む',
  equals: '完全一致',
  startsWith: '前方一致',
  endsWith: '後方一致',
  regex: '正規表現',
};

// 空のルールテンプレート
const emptyRule: Omit<LearningRule, '_id' | 'createdAt' | 'updatedAt' | 'matchCount' | 'lastMatchedAt'> = {
  name: '',
  description: '',
  conditions: [{ field: 'itemName', operator: 'contains', value: '', caseSensitive: false }],
  matchMode: 'all',
  outputs: { subject: '', accountCategory: undefined, title: '' },
  priority: 0,
  enabled: true,
};

export default function LearningRulesPage() {
  const router = useRouter();

  const [rules, setRules] = useState<LearningRule[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // ダイアログ状態
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LearningRule | null>(null);
  const [formData, setFormData] = useState(emptyRule);
  const [isSaving, setIsSaving] = useState(false);

  // 展開された行
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 検索のデバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ルール一覧を取得
  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (enabledFilter === 'enabled') params.append('enabled', 'true');
      if (enabledFilter === 'disabled') params.append('enabled', 'false');
      params.append('sortBy', 'priority');
      params.append('sortOrder', 'desc');

      const response = await fetch(`/api/learning-rules?${params}`);
      if (!response.ok) throw new Error('Failed to fetch rules');

      const data = await response.json();
      setRules(data.rules || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      logger.error('Error fetching learning rules:', error);
      toast.error('ルールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, enabledFilter]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ルールの有効/無効を切り替え
  const toggleRuleEnabled = async (rule: LearningRule) => {
    try {
      const response = await fetch(`/api/learning-rules/${rule._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      if (!response.ok) throw new Error('Failed to update rule');

      setRules(prev =>
        prev.map(r =>
          r._id === rule._id ? { ...r, enabled: !r.enabled } : r
        )
      );
      toast.success(`ルールを${!rule.enabled ? '有効' : '無効'}にしました`);
    } catch (error) {
      logger.error('Error toggling rule:', error);
      toast.error('更新に失敗しました');
    }
  };

  // ルールを削除
  const deleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/learning-rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');

      setRules(prev => prev.filter(r => r._id !== ruleId));
      setTotalCount(prev => prev - 1);
      toast.success('ルールを削除しました');
    } catch (error) {
      logger.error('Error deleting rule:', error);
      toast.error('削除に失敗しました');
    }
  };

  // 新規作成ダイアログを開く
  const openCreateDialog = () => {
    setEditingRule(null);
    setFormData({ ...emptyRule });
    setIsDialogOpen(true);
  };

  // 編集ダイアログを開く
  const openEditDialog = (rule: LearningRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      conditions: [...rule.conditions],
      matchMode: rule.matchMode,
      outputs: { ...rule.outputs },
      priority: rule.priority,
      enabled: rule.enabled,
    });
    setIsDialogOpen(true);
  };

  // 複製
  const duplicateRule = (rule: LearningRule) => {
    setEditingRule(null);
    setFormData({
      name: `${rule.name}（コピー）`,
      description: rule.description || '',
      conditions: [...rule.conditions],
      matchMode: rule.matchMode,
      outputs: { ...rule.outputs },
      priority: rule.priority,
      enabled: false, // 複製は無効状態で作成
    });
    setIsDialogOpen(true);
  };

  // 条件を追加
  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: 'itemName', operator: 'contains', value: '', caseSensitive: false },
      ],
    }));
  };

  // 条件を削除
  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  // 条件を更新
  const updateCondition = (index: number, updates: Partial<MatchCondition>) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((cond, i) =>
        i === index ? { ...cond, ...updates } : cond
      ),
    }));
  };

  // 出力を更新
  const updateOutputs = (updates: Partial<RuleOutput>) => {
    setFormData(prev => ({
      ...prev,
      outputs: { ...prev.outputs, ...updates },
    }));
  };

  // 保存
  const handleSave = async () => {
    // バリデーション
    if (!formData.name.trim()) {
      toast.error('ルール名は必須です');
      return;
    }
    if (formData.conditions.length === 0) {
      toast.error('少なくとも1つのマッチ条件が必要です');
      return;
    }
    if (formData.conditions.some(c => !c.value.trim())) {
      toast.error('すべての条件に値を入力してください');
      return;
    }
    if (!formData.outputs.subject && !formData.outputs.accountCategory && !formData.outputs.title) {
      toast.error('少なくとも1つの出力設定が必要です');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingRule
        ? `/api/learning-rules/${editingRule._id}`
        : '/api/learning-rules';
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save rule');

      toast.success(editingRule ? 'ルールを更新しました' : 'ルールを作成しました');
      setIsDialogOpen(false);
      fetchRules();
    } catch (error) {
      logger.error('Error saving rule:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 行の展開切り替え
  const toggleRowExpanded = (ruleId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  if (loading && rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">学習ルール管理</h1>
          </div>
          <p className="text-muted-foreground">
            領収書の自動分類ルールを管理します。ルールは優先度順に評価されます。
          </p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新しいルール
        </Button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総ルール数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">有効なルール</CardTitle>
            <ToggleRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.enabled).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総マッチ数</CardTitle>
            <PlayCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.reduce((sum, r) => sum + (r.matchCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ルール名、説明で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={enabledFilter} onValueChange={(v) => setEnabledFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="状態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="enabled">有効のみ</SelectItem>
                <SelectItem value="disabled">無効のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ルール一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ルール一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ルールが見つかりません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>ルール名</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>出力</TableHead>
                  <TableHead className="text-center">優先度</TableHead>
                  <TableHead className="text-center">マッチ数</TableHead>
                  <TableHead className="text-center">状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <>
                    <TableRow key={String(rule._id)}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpanded(String(rule._id))}
                        >
                          {expandedRows.has(String(rule._id)) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {rule.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {rule.conditions.length}件（{rule.matchMode === 'all' ? 'すべて一致' : 'いずれか一致'}）
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {rule.outputs.subject && (
                            <Badge variant="outline" className="text-xs">但し書き</Badge>
                          )}
                          {rule.outputs.accountCategory && (
                            <Badge variant="outline" className="text-xs">勘定科目</Badge>
                          )}
                          {rule.outputs.title && (
                            <Badge variant="outline" className="text-xs">タイトル</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {rule.matchCount || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRuleEnabled(rule)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateRule(rule)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(String(rule._id))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(String(rule._id)) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-2 gap-6">
                            {/* 条件 */}
                            <div>
                              <h4 className="font-medium mb-2">マッチ条件</h4>
                              <div className="space-y-2">
                                {rule.conditions.map((cond, idx) => (
                                  <div key={idx} className="bg-background p-2 rounded border text-sm">
                                    <span className="font-medium">{FIELD_LABELS[cond.field]}</span>
                                    <span className="text-muted-foreground mx-2">が</span>
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                      {cond.value}
                                    </span>
                                    <span className="text-muted-foreground mx-2">を</span>
                                    <span>{OPERATOR_LABELS[cond.operator]}</span>
                                    {cond.caseSensitive && (
                                      <Badge variant="outline" className="ml-2 text-xs">大文字小文字区別</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* 出力 */}
                            <div>
                              <h4 className="font-medium mb-2">出力設定</h4>
                              <div className="space-y-2 text-sm">
                                {rule.outputs.subject && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">但し書き:</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                      {rule.outputs.subject}
                                    </span>
                                  </div>
                                )}
                                {rule.outputs.accountCategory && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">勘定科目:</span>
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                      {rule.outputs.accountCategory}
                                    </span>
                                  </div>
                                )}
                                {rule.outputs.title && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">タイトル:</span>
                                    <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                                      {rule.outputs.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {rule.lastMatchedAt && (
                                <div className="mt-4 text-xs text-muted-foreground">
                                  最終マッチ: {new Date(rule.lastMatchedAt).toLocaleString('ja-JP')}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 作成/編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'ルールを編集' : '新しいルールを作成'}
            </DialogTitle>
            <DialogDescription>
              領収書のフィールドにマッチする条件と、マッチ時に適用する出力を設定します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 基本情報 */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">ルール名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例: 駐車場料金ルール"
                />
              </div>
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="例: 駐車場関連の領収書を自動分類"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">優先度</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">数値が大きいほど優先</p>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="enabled">有効</Label>
                </div>
              </div>
            </div>

            {/* マッチ条件 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>マッチ条件 *</Label>
                <Select
                  value={formData.matchMode}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, matchMode: v as 'all' | 'any' }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて一致（AND）</SelectItem>
                    <SelectItem value="any">いずれか一致（OR）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.conditions.map((condition, index) => (
                <Card key={index} className="p-3">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Select
                        value={condition.field}
                        onValueChange={(v) => updateCondition(index, { field: v as MatchField })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FIELD_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={condition.operator}
                        onValueChange={(v) => updateCondition(index, { operator: v as MatchOperator })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5">
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="マッチする値"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={condition.caseSensitive || false}
                        onChange={(e) => updateCondition(index, { caseSensitive: e.target.checked })}
                        title="大文字小文字を区別"
                        className="h-4 w-4"
                      />
                    </div>
                    <div className="col-span-1">
                      {formData.conditions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCondition(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={addCondition} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                条件を追加
              </Button>
            </div>

            {/* 出力設定 */}
            <div className="space-y-4">
              <Label>出力設定 *（少なくとも1つ必要）</Label>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="outputSubject">但し書き</Label>
                  <Input
                    id="outputSubject"
                    value={formData.outputs.subject || ''}
                    onChange={(e) => updateOutputs({ subject: e.target.value })}
                    placeholder="例: 駐車場代"
                  />
                </div>
                <div>
                  <Label htmlFor="outputCategory">勘定科目</Label>
                  <Select
                    value={formData.outputs.accountCategory || ''}
                    onValueChange={(v) => updateOutputs({ accountCategory: v || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">未設定</SelectItem>
                      {ACCOUNT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="outputTitle">タイトル</Label>
                  <Input
                    id="outputTitle"
                    value={formData.outputs.title || ''}
                    onChange={(e) => updateOutputs({ title: e.target.value })}
                    placeholder="例: 来客用駐車場代"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingRule ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
