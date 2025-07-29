'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Loader2, AlertCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface EmailTemplate {
  documentType: 'invoice' | 'quote' | 'delivery-note';
  subject: string;
  body: string;
}

interface CompanyInfo {
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([
    {
      documentType: 'invoice',
      subject: '請求書送付（{{documentNumber}}）',
      body: '{{customerName}}\n\n\nいつもお世話になっております、{{companyName}}でございます。\n\nPDFファイルにて以下の内容の請求書をお送りさせていただきました。\n\n\n請求書番号：{{documentNumber}}\n{{documentTitle}}請求金額：{{totalAmount}}\nお支払期限：{{dueDate}}\n\n\n添付ファイルをご確認の上、何卒期限までにお支払いをお願いいたします。\nご不明な点がございましたら、お気軽にお問い合わせくださいませ。\n\nご査収の程、お願いいたします。\n\n\n──────────────────────────\n{{companyName}}\n{{companyAddress}}\nTEL: {{companyPhone}}\nEmail: {{companyEmail}}\n──────────────────────────'
    },
    {
      documentType: 'quote',
      subject: '【見積書】{{documentNumber}} のご送付',
      body: '{{customerName}}\n\nいつもお世話になっております、{{companyName}}でございます。\n\nご依頼いただきました見積書をお送りいたします。\n\n見積書番号：{{documentNumber}}\n見積金額：{{totalAmount}}\n有効期限：{{validityDate}}\n\n添付ファイルをご確認ください。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\nよろしくお願いいたします。\n\n\n──────────────────────────\n{{companyName}}\n{{companyAddress}}\nTEL: {{companyPhone}}\nEmail: {{companyEmail}}\n──────────────────────────'
    },
    {
      documentType: 'delivery-note',
      subject: '【納品書】{{documentNumber}} のご送付',
      body: '{{customerName}}\n\nいつもお世話になっております、{{companyName}}でございます。\n\n納品書をお送りいたします。\n\n納品書番号：{{documentNumber}}\n納品日：{{deliveryDate}}\n合計金額：{{totalAmount}}\n\n添付ファイルをご確認ください。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\nよろしくお願いいたします。\n\n\n──────────────────────────\n{{companyName}}\n{{companyAddress}}\nTEL: {{companyPhone}}\nEmail: {{companyEmail}}\n──────────────────────────'
    }
  ]);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({});
  const [activeTab, setActiveTab] = useState<string>('invoice');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/company-info');
      if (response.ok) {
        const data = await response.json();
        if (data.companyInfo) {
          setCompanyInfo(data.companyInfo);
        } else {
          // 会社情報が存在しない場合はデフォルト値を設定
          setCompanyInfo({});
        }
      } else {
        // APIエラーの場合もデフォルト値を設定
        setCompanyInfo({});
      }
    } catch (error) {
      logger.error('Error fetching company info:', error);
      // エラーの場合もデフォルト値を設定
      setCompanyInfo({});
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates');
      if (response.ok) {
        const data = await response.json();
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
      }
    } catch (error) {
      logger.error('Error fetching email templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (documentType: string, field: 'subject' | 'body', value: string) => {
    setTemplates(prev => 
      prev.map(template => 
        template.documentType === documentType 
          ? { ...template, [field]: value }
          : template
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templates }),
      });

      if (response.ok) {
        toast.success('メールテンプレートを保存しました');
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      logger.error('Error saving email templates:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewContent = (template: EmailTemplate | null | undefined): { subject: string; body: string } => {
    // テンプレートが存在しない場合のエラーハンドリング
    if (!template || !template.subject || !template.body) {
      return { subject: 'テンプレートが見つかりません', body: 'テンプレートが見つかりません' };
    }

    try {
      // companyInfoが存在しない場合はデフォルト値を使用
      const safeCompanyInfo = companyInfo || {};
      
      // サンプルデータを定義（全て文字列として確実に定義）
      const sampleData: Record<string, string> = {
        customerName: '社労士法人労務ニュース 御中',
        documentNumber: 'INV-20250729-001',
        documentTitle: template.documentType === 'invoice' ? '請求件名：ウェブサイト制作費用\n' : template.documentType === 'quote' ? '見積件名：ウェブサイト制作費用\n' : '',
        totalAmount: '¥1,000,000',
        dueDate: '2025年07月31日',
        validityDate: '2025年08月31日',
        deliveryDate: '2025年07月29日',
        companyName: safeCompanyInfo.name || safeCompanyInfo.company_name || safeCompanyInfo.companyName || '株式会社EFFECT',
        companyAddress: safeCompanyInfo.address || safeCompanyInfo.address1 || '東京都千代田区大手町1-1-1',
        companyPhone: safeCompanyInfo.phone_number || safeCompanyInfo.phone || '03-1234-5678', 
        companyEmail: safeCompanyInfo.email || 'info@effect.moe',
      };

      // テンプレートの値を安全に取得し、文字列として扱う
      let subject = template.subject ? String(template.subject) : '';
      let body = template.body ? String(template.body) : '';

      // 変数置換を安全に実行
      for (const [key, value] of Object.entries(sampleData)) {
        try {
          if (key && typeof key === 'string' && value !== undefined && value !== null) {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
            const safeValue = String(value);
            subject = subject.replace(regex, safeValue);
            body = body.replace(regex, safeValue);
          }
        } catch (replaceError) {
          logger.error(`Error replacing variable ${key}:`, replaceError);
          // エラーが発生した場合はそのまま継続
        }
      }

      return { subject: subject || '', body: body || '' };
    } catch (error) {
      logger.error('Error in getPreviewContent:', error);
      return { 
        subject: 'プレビューエラー', 
        body: 'プレビューを生成できませんでした。エラー: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return '請求書';
      case 'quote':
        return '見積書';
      case 'delivery-note':
        return '納品書';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeTemplate = templates.find(t => t.documentType === activeTab);

  // プレビューコンテンツをメモ化してレンダリング時のエラーを防ぐ
  const previewContent = useMemo(() => {
    if (!activeTemplate || !showPreview) {
      return { subject: '', body: '' };
    }
    return getPreviewContent(activeTemplate);
  }, [activeTemplate, showPreview, companyInfo]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </Link>
        <h1 className="text-2xl font-bold">メールテンプレート設定</h1>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          以下の変数を使用できます：
          <div className="mt-2 text-sm">
            <div>共通：<code className="bg-gray-100 px-1 py-0.5 rounded">{{customerName}}, {{documentNumber}}, {{documentTitle}}, {{totalAmount}}, {{companyName}}, {{companyPhone}}, {{companyEmail}}, {{companyAddress}}</code></div>
            <div>請求書：<code className="bg-gray-100 px-1 py-0.5 rounded">{{dueDate}}</code></div>
            <div>見積書：<code className="bg-gray-100 px-1 py-0.5 rounded">{{validityDate}}</code></div>
            <div>納品書：<code className="bg-gray-100 px-1 py-0.5 rounded">{{deliveryDate}}</code></div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 編集エリア */}
        <Card>
          <CardHeader>
            <CardTitle>テンプレート編集</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invoice">請求書</TabsTrigger>
                <TabsTrigger value="quote">見積書</TabsTrigger>
                <TabsTrigger value="delivery-note">納品書</TabsTrigger>
              </TabsList>

              {templates.map((template) => (
                <TabsContent key={template.documentType} value={template.documentType} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${template.documentType}`}>件名</Label>
                    <Input
                      id={`subject-${template.documentType}`}
                      value={template.subject}
                      onChange={(e) => handleTemplateChange(template.documentType, 'subject', e.target.value)}
                      placeholder="メールの件名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`body-${template.documentType}`}>本文</Label>
                    <Textarea
                      id={`body-${template.documentType}`}
                      value={template.body}
                      onChange={(e) => handleTemplateChange(template.documentType, 'body', e.target.value)}
                      placeholder="メール本文"
                      rows={20}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    if (!companyInfo || Object.keys(companyInfo).length === 0) {
                      // 会社情報が読み込まれていない場合は再取得
                      await fetchCompanyInfo();
                    }
                    setShowPreview(!showPreview);
                  } catch (error) {
                    logger.error('Error handling preview button click:', error);
                    setShowPreview(!showPreview);
                  }
                }}
                disabled={isLoading}
              >
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* プレビューエリア */}
        {showPreview && activeTemplate && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">件名</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {previewContent.subject || 'テンプレートが選択されていません'}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">本文</Label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-md whitespace-pre-wrap font-mono text-sm">
                    {previewContent.body || 'テンプレートが選択されていません'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}