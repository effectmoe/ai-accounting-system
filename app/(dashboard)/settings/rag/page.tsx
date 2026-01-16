'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Settings2,
  Zap,
} from 'lucide-react';
import type { LearningRule } from '@/types/learning-rule';

// フィールドと演算子の表示名
const MATCH_FIELD_LABELS: Record<string, string> = {
  issuerName: '発行元',
  itemName: '項目名',
  subject: '但し書き',
  title: 'タイトル',
  ocrText: 'OCRテキスト',
};

const MATCH_OPERATOR_LABELS: Record<string, string> = {
  contains: '含む',
  equals: '完全一致',
  startsWith: '前方一致',
  endsWith: '後方一致',
  regex: '正規表現',
};

interface RAGRecord {
  id: string;
  document: string;
  metadata: {
    store_name: string;
    category: string;
    description: string;
    item_description?: string;
    total_amount?: number;
    issue_date?: string;
    verified: boolean;
  };
}

const ACCOUNT_CATEGORIES = [
  '接待交際費',
  '会議費',
  '旅費交通費',
  '車両費',
  '消耗品費',
  '通信費',
  '福利厚生費',
  '新聞図書費',
  '雑費',
  '租税公課',
];

export default function RAGManagementPage() {
  const [activeTab, setActiveTab] = useState<'rag' | 'rules'>('rag');

  // RAG records state
  const [records, setRecords] = useState<RAGRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('verified');

  // Learning rules state
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSearchQuery, setRulesSearchQuery] = useState('');

  // Edit dialog state (RAG)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RAGRecord | null>(null);
  const [editForm, setEditForm] = useState({
    store_name: '',
    category: '',
    description: '',
    item_description: '',
    verified: false,
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog state (RAG)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<RAGRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete dialog state (Rules)
  const [deleteRuleDialogOpen, setDeleteRuleDialogOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<LearningRule | null>(null);
  const [deletingRuleLoading, setDeletingRuleLoading] = useState(false);

  // Toggle rule enabled state
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
    fetchRules();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rag');
      const data = await response.json();

      if (data.success) {
        setRecords(data.records);
      } else {
        console.error('Failed to fetch RAG records:', data.error);
      }
    } catch (error) {
      console.error('Error fetching RAG records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      setRulesLoading(true);
      const response = await fetch('/api/learning-rules');
      const data = await response.json();

      if (data.rules) {
        setRules(data.rules);
      } else {
        console.error('Failed to fetch learning rules:', data.error);
      }
    } catch (error) {
      console.error('Error fetching learning rules:', error);
    } finally {
      setRulesLoading(false);
    }
  };

  const toggleRuleEnabled = async (rule: LearningRule) => {
    const ruleId = rule._id?.toString();
    if (!ruleId) return;

    try {
      setTogglingRuleId(ruleId);
      const response = await fetch(`/api/learning-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });

      const data = await response.json();

      if (data.rule) {
        setRules(rules.map(r =>
          r._id?.toString() === ruleId ? data.rule : r
        ));
      } else {
        alert('ルールの更新に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      alert('ルールの更新中にエラーが発生しました');
    } finally {
      setTogglingRuleId(null);
    }
  };

  const openDeleteRuleDialog = (rule: LearningRule) => {
    setDeletingRule(rule);
    setDeleteRuleDialogOpen(true);
  };

  const handleDeleteRule = async () => {
    const ruleId = deletingRule?._id?.toString();
    if (!ruleId) return;

    try {
      setDeletingRuleLoading(true);
      const response = await fetch(`/api/learning-rules/${ruleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setRules(rules.filter(r => r._id?.toString() !== ruleId));
        setDeleteRuleDialogOpen(false);
      } else {
        alert('削除に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setDeletingRuleLoading(false);
    }
  };

  const openEditDialog = (record: RAGRecord) => {
    setEditingRecord(record);
    setEditForm({
      store_name: record.metadata.store_name || '',
      category: record.metadata.category || '',
      description: record.metadata.description || '',
      item_description: record.metadata.item_description || '',
      verified: record.metadata.verified || false,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/rag/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setRecords(records.map(r =>
          r.id === editingRecord.id
            ? { ...r, metadata: { ...r.metadata, ...editForm } }
            : r
        ));
        setEditDialogOpen(false);
      } else {
        alert('更新に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('更新中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (record: RAGRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/rag/${deletingRecord.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setRecords(records.filter(r => r.id !== deletingRecord.id));
        setDeleteDialogOpen(false);
      } else {
        alert('削除に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('削除中にエラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  // Filter records by search query and verification status
  const filteredRecords = records.filter(record => {
    // Verification filter
    if (verifiedFilter === 'verified' && !record.metadata.verified) return false;
    if (verifiedFilter === 'unverified' && record.metadata.verified) return false;

    // Search filter
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      record.metadata.store_name?.toLowerCase().includes(query) ||
      record.metadata.category?.toLowerCase().includes(query) ||
      record.metadata.description?.toLowerCase().includes(query) ||
      record.metadata.item_description?.toLowerCase().includes(query)
    );
  });

  // Filter rules by search query
  const filteredRules = rules.filter(rule => {
    const query = rulesSearchQuery.toLowerCase();
    if (!query) return true;
    return (
      rule.name?.toLowerCase().includes(query) ||
      rule.description?.toLowerCase().includes(query) ||
      rule.outputs?.accountCategory?.toLowerCase().includes(query) ||
      rule.outputs?.subject?.toLowerCase().includes(query) ||
      rule.conditions?.some(c => c.value.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            学習データ管理
          </h1>
          <p className="text-muted-foreground">
            領収書の自動分類に使用される学習データとカスタムルールを管理します
          </p>
        </div>
        <Button
          onClick={() => { fetchRecords(); fetchRules(); }}
          variant="outline"
          disabled={loading || rulesLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(loading || rulesLoading) ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">RAGレコード数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">検証済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {records.filter(r => r.metadata.verified).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Zap className="h-4 w-4 text-orange-500" />
              カスタムルール
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">店舗数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(records.map(r => r.metadata.store_name)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for RAG Data and Custom Rules */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rag' | 'rules')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rag" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            RAG学習データ
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            カスタムルール
            {rules.length > 0 && (
              <Badge variant="secondary" className="ml-1">{rules.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* RAG Tab Content */}
        <TabsContent value="rag" className="space-y-4 mt-4">
          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Verification Filter */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">表示:</Label>
                <div className="flex gap-1">
                  <Button
                    variant={verifiedFilter === 'verified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerifiedFilter('verified')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    検証済みのみ
                  </Button>
                  <Button
                    variant={verifiedFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerifiedFilter('all')}
                  >
                    すべて
                  </Button>
                  <Button
                    variant={verifiedFilter === 'unverified' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVerifiedFilter('unverified')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    未検証のみ
                  </Button>
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="店舗名、勘定科目、但し書きで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>学習データ一覧</CardTitle>
          <CardDescription>
            {filteredRecords.length} 件表示 / 全 {records.length} 件
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>店舗名</TableHead>
                  <TableHead>勘定科目</TableHead>
                  <TableHead>但し書き</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead>検証</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? '検索結果がありません' : 'データがありません'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.metadata.store_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.metadata.category || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.metadata.description || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.metadata.item_description || '-'}
                      </TableCell>
                      <TableCell>
                        {record.metadata.verified ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(record)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Custom Rules Tab Content */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ルール名、勘定科目、但し書きで検索..."
                  value={rulesSearchQuery}
                  onChange={(e) => setRulesSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rules Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                カスタムルール一覧
              </CardTitle>
              <CardDescription>
                {filteredRules.length} 件表示 / 全 {rules.length} 件
                <span className="ml-2 text-xs">
                  （ルールは領収書詳細ページから作成できます）
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ルール名</TableHead>
                      <TableHead>マッチ条件</TableHead>
                      <TableHead>出力設定</TableHead>
                      <TableHead>マッチ数</TableHead>
                      <TableHead>有効</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {rulesSearchQuery ? '検索結果がありません' : 'カスタムルールがありません'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRules.map((rule) => (
                        <TableRow key={rule._id?.toString()}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{rule.name}</div>
                              {rule.description && (
                                <div className="text-xs text-muted-foreground">{rule.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {rule.conditions.map((c, i) => (
                                <div key={i} className="text-xs">
                                  <Badge variant="outline" className="mr-1 text-xs">
                                    {MATCH_FIELD_LABELS[c.field] || c.field}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {MATCH_OPERATOR_LABELS[c.operator] || c.operator}:
                                  </span>
                                  <span className="ml-1 font-mono">{c.value}</span>
                                </div>
                              ))}
                              <div className="text-xs text-muted-foreground">
                                モード: {rule.matchMode === 'all' ? 'すべて一致' : 'いずれか一致'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {rule.outputs.accountCategory && (
                                <div>
                                  <Badge variant="default" className="text-xs">
                                    {rule.outputs.accountCategory}
                                  </Badge>
                                </div>
                              )}
                              {rule.outputs.subject && (
                                <div className="text-muted-foreground">
                                  但し書き: {rule.outputs.subject}
                                </div>
                              )}
                              {rule.outputs.title && (
                                <div className="text-muted-foreground">
                                  タイトル: {rule.outputs.title}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {rule.matchCount || 0} 回
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={() => toggleRuleEnabled(rule)}
                              disabled={togglingRuleId === rule._id?.toString()}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteRuleDialog(rule)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>学習データを編集</DialogTitle>
            <DialogDescription>
              RAGの学習データを修正します。変更は次回のスキャンから反映されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-store-name">店舗名</Label>
              <Input
                id="edit-store-name"
                value={editForm.store_name}
                onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">勘定科目</Label>
              <select
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {ACCOUNT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-description">但し書き</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-item-description">商品名</Label>
              <Input
                id="edit-item-description"
                value={editForm.item_description}
                onChange={(e) => setEditForm({ ...editForm, item_description: e.target.value })}
                placeholder="商品名を入力"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-verified">検証済み</Label>
                <p className="text-sm text-muted-foreground">
                  検証済みのデータは類似検索で使用されます
                </p>
              </div>
              <Switch
                id="edit-verified"
                checked={editForm.verified}
                onCheckedChange={(checked) => setEditForm({ ...editForm, verified: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (RAG) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>学習データを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
              <br />
              <strong>店舗名:</strong> {deletingRecord?.metadata.store_name}
              <br />
              <strong>勘定科目:</strong> {deletingRecord?.metadata.category}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog (Rules) */}
      <AlertDialog open={deleteRuleDialogOpen} onOpenChange={setDeleteRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カスタムルールを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
              <br />
              <strong>ルール名:</strong> {deletingRule?.name}
              <br />
              <strong>出力科目:</strong> {deletingRule?.outputs?.accountCategory || '-'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingRuleLoading}
            >
              {deletingRuleLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
