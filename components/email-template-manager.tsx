'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Plus,
  Trash2,
  Copy,
  FileText,
  Settings,
  Star,
  StarOff,
  Edit3,
  Eye,
  Code,
  Palette,
} from 'lucide-react';
import { logger } from '@/lib/logger';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'quote' | 'invoice' | 'reminder' | 'thank-you' | 'follow-up';
  subject: string;
  content: string;
  variables: string[];
  isDefault: boolean;
  customStyles?: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface EmailTemplateManagerProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
  selectedCategory?: EmailTemplate['category'];
}

const defaultTemplates: Partial<EmailTemplate>[] = [
  {
    name: '標準見積書テンプレート',
    description: 'シンプルで分かりやすい標準的な見積書テンプレート',
    category: 'quote',
    subject: '【お見積書】{{customerName}} 様 - {{quoteNumber}}',
    content: `{{customerName}} 様

いつもお世話になっております。
{{companyName}}の{{senderName}}です。

ご依頼いただきました件について、お見積書をお送りいたします。

■ お見積金額
合計: {{totalAmount}}円（税込）

■ 有効期限
{{validUntil}}

詳細は添付のPDFファイルをご確認ください。
ご不明な点がございましたら、お気軽にお問い合わせください。

何卒よろしくお願いいたします。`,
    variables: ['customerName', 'quoteNumber', 'companyName', 'senderName', 'totalAmount', 'validUntil'],
    isDefault: true,
  },
  {
    name: 'フレンドリー見積書テンプレート',
    description: 'カジュアルで親しみやすい見積書テンプレート',
    category: 'quote',
    subject: '{{customerName}}様へのお見積もりです 📋',
    content: `{{customerName}} 様

こんにちは！{{companyName}}の{{senderName}}です 😊

お問い合わせいただいた件について、お見積もりをご用意しました！

💰 お見積金額: {{totalAmount}}円（税込）
📅 有効期限: {{validUntil}}

✨ 今回のご提案のポイント：
{{proposalHighlights}}

詳細は添付ファイルをご覧ください。
ご質問があれば、いつでもお気軽にご連絡くださいね！

よろしくお願いします！`,
    variables: ['customerName', 'companyName', 'senderName', 'totalAmount', 'validUntil', 'proposalHighlights'],
    isDefault: false,
  },
  {
    name: 'フォローアップテンプレート',
    description: '見積書送信後のフォローアップ用テンプレート',
    category: 'follow-up',
    subject: '【ご確認】お見積書について - {{customerName}} 様',
    content: `{{customerName}} 様

お世話になっております。
{{companyName}}の{{senderName}}です。

先日お送りしました見積書（{{quoteNumber}}）はご確認いただけましたでしょうか。

ご不明な点や、内容の調整が必要な箇所がございましたら、
お気軽にご相談ください。

また、ご予算やスケジュールについてもご相談承ります。

お返事をお待ちしております。

よろしくお願いいたします。`,
    variables: ['customerName', 'companyName', 'senderName', 'quoteNumber'],
    isDefault: false,
  },
];

export default function EmailTemplateManager({
  onSelectTemplate,
  selectedCategory = 'quote',
}: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // LocalStorageからテンプレートを読み込み
      const stored = localStorage.getItem('emailTemplates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        // デフォルトテンプレートを設定
        const defaults = defaultTemplates.map((t, index) => ({
          ...t,
          id: `template-${Date.now()}-${index}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as EmailTemplate[];
        setTemplates(defaults);
        localStorage.setItem('emailTemplates', JSON.stringify(defaults));
      }
    } catch (error) {
      logger.error('Failed to load templates:', error);
    }
  };

  const saveTemplates = (newTemplates: EmailTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('emailTemplates', JSON.stringify(newTemplates));
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate.name || !editingTemplate.subject || !editingTemplate.content) {
      alert('テンプレート名、件名、本文は必須です');
      return;
    }

    const variables = extractVariables(editingTemplate.content + ' ' + editingTemplate.subject);
    
    if (editingTemplate.id) {
      // 既存テンプレートの更新
      const updated = templates.map(t =>
        t.id === editingTemplate.id
          ? { ...t, ...editingTemplate, variables, updatedAt: new Date() }
          : t
      );
      saveTemplates(updated);
    } else {
      // 新規テンプレートの作成
      const newTemplate: EmailTemplate = {
        ...editingTemplate as EmailTemplate,
        id: `template-${Date.now()}`,
        variables,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveTemplates([...templates, newTemplate]);
    }

    setIsEditing(false);
    setEditingTemplate({});
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('このテンプレートを削除しますか？')) {
      saveTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    const duplicate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (コピー)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveTemplates([...templates, duplicate]);
  };

  const handleSetDefault = (id: string, category: EmailTemplate['category']) => {
    const updated = templates.map(t =>
      t.category === category
        ? { ...t, isDefault: t.id === id }
        : t
    );
    saveTemplates(updated);
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = text.match(regex);
    if (!matches) return [];
    
    const variables = matches.map(m => m.replace(/\{\{|\}\}/g, ''));
    return [...new Set(variables)];
  };

  const previewTemplate = (template: EmailTemplate): string => {
    let preview = template.content;
    const sampleData: Record<string, string> = {
      customerName: '山田太郎',
      companyName: '株式会社サンプル',
      senderName: '営業担当',
      quoteNumber: 'Q-2024-001',
      totalAmount: '100,000',
      validUntil: '2024年12月31日',
      proposalHighlights: '・高品質なサービス\n・迅速な対応\n・競争力のある価格',
    };

    template.variables.forEach(variable => {
      const value = sampleData[variable] || `[${variable}]`;
      preview = preview.replace(new RegExp(`{{${variable}}}`, 'g'), value);
    });

    return preview;
  };

  const filteredTemplates = templates.filter(t =>
    (selectedCategory === 'quote' || t.category === selectedCategory) &&
    (searchTerm === '' || 
     t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categoryLabels = {
    quote: '見積書',
    invoice: '請求書',
    reminder: 'リマインダー',
    'thank-you': 'お礼',
    'follow-up': 'フォローアップ',
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">メールテンプレート管理</h2>
          <p className="text-muted-foreground mt-1">
            メール送信時に使用するテンプレートを管理できます
          </p>
        </div>
        <Button onClick={() => {
          setEditingTemplate({ category: selectedCategory });
          setIsEditing(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          新規テンプレート
        </Button>
      </div>

      {/* 検索バー */}
      <div className="flex gap-4">
        <Input
          placeholder="テンプレートを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedCategory} onValueChange={(v) => v as EmailTemplate['category']}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* テンプレート一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="relative">
            {template.isDefault && (
              <Badge className="absolute top-2 right-2" variant="secondary">
                デフォルト
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {template.name}
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">カテゴリ:</span> {categoryLabels[template.category]}
                </div>
                <div className="text-sm">
                  <span className="font-medium">変数:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTemplate(template);
                      setIsEditing(true);
                    }}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  {!template.isDefault && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(template.id, template.category)}
                      >
                        <Star className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 編集ダイアログ */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate.id ? 'テンプレートを編集' : '新規テンプレート'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">テンプレート名</Label>
              <Input
                id="template-name"
                value={editingTemplate.name || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="template-description">説明</Label>
              <Input
                id="template-description"
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="template-category">カテゴリ</Label>
              <Select
                value={editingTemplate.category}
                onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v as EmailTemplate['category'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template-subject">件名</Label>
              <Input
                id="template-subject"
                value={editingTemplate.subject || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                placeholder="例: 【お見積書】{{customerName}} 様"
              />
            </div>
            <div>
              <Label htmlFor="template-content">本文</Label>
              <Textarea
                id="template-content"
                value={editingTemplate.content || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                rows={10}
                placeholder="{{customerName}} 様&#10;&#10;お世話になっております..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                変数は {{`{{変数名}}`}} の形式で記述してください
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* プレビューダイアログ */}
      {selectedTemplate && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                テンプレートのプレビュー（サンプルデータ使用）
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>件名</Label>
                <div className="p-3 bg-muted rounded-md">
                  {selectedTemplate.subject.replace(/\{\{(\w+)\}\}/g, (_, v) => {
                    const sampleData: Record<string, string> = {
                      customerName: '山田太郎',
                      quoteNumber: 'Q-2024-001',
                    };
                    return sampleData[v] || `[${v}]`;
                  })}
                </div>
              </div>
              <div>
                <Label>本文</Label>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {previewTemplate(selectedTemplate)}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}