'use client';

import { useState, useEffect } from 'react';
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
      body: `{{customerName}}


いつもお世話になっております、{{companyName}}でございます。

PDFファイルにて以下の内容の請求書をお送りさせていただきました。


請求書番号：{{documentNumber}}
請求金額：{{totalAmount}}
お支払期限：{{dueDate}}


添付ファイルをご確認の上、何卒期限までにお支払いをお願いいたします。
ご不明な点がございましたら、お気軽にお問い合わせくださいませ。

ご査収の程、お願いいたします。


──────────────────────────
{{companyName}}
{{companyAddress}}
TEL: {{companyPhone}}
Email: {{companyEmail}}
──────────────────────────`
    },
    {
      documentType: 'quote',
      subject: '【見積書】{{documentNumber}} のご送付',
      body: `{{customerName}}

いつもお世話になっております、{{companyName}}でございます。

ご依頼いただきました見積書をお送りいたします。

見積書番号：{{documentNumber}}
見積金額：{{totalAmount}}
有効期限：{{validityDate}}

添付ファイルをご確認ください。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。


──────────────────────────
{{companyName}}
{{companyAddress}}
TEL: {{companyPhone}}
Email: {{companyEmail}}
──────────────────────────`
    },
    {
      documentType: 'delivery-note',
      subject: '【納品書】{{documentNumber}} のご送付',
      body: `{{customerName}}

いつもお世話になっております、{{companyName}}でございます。

納品書をお送りいたします。

納品書番号：{{documentNumber}}
納品日：{{deliveryDate}}
合計金額：{{totalAmount}}

添付ファイルをご確認ください。

ご不明な点がございましたら、お気軽にお問い合わせください。

よろしくお願いいたします。


──────────────────────────
{{companyName}}
{{companyAddress}}
TEL: {{companyPhone}}
Email: {{companyEmail}}
──────────────────────────`
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
        }
      }
    } catch (error) {
      logger.error('Error fetching company info:', error);
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

  const getPreviewContent = (template: EmailTemplate): { subject: string; body: string } => {
    const sampleData = {
      customerName: '社労士法人労務ニュース 御中',
      documentNumber: 'INV-20250729-001',
      totalAmount: '¥1,000,000',
      dueDate: '2025年07月31日',
      validityDate: '2025年08月31日',
      deliveryDate: '2025年07月29日',
      companyName: companyInfo.company_name || '株式会社EFFECT',
      companyAddress: companyInfo.address || '東京都千代田区大手町1-1-1',
      companyPhone: companyInfo.phone || '03-1234-5678',
      companyEmail: companyInfo.email || 'info@effect.moe',
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
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
          <code className="ml-2 text-sm bg-gray-100 px-1 py-0.5 rounded">
            {`{{customerName}}, {{documentNumber}}, {{totalAmount}}, {{dueDate}}, {{companyName}}, {{companyPhone}}, {{companyEmail}}, {{companyAddress}}`}
          </code>
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
                onClick={() => setShowPreview(!showPreview)}
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
        {showPreview && activeTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">件名</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {getPreviewContent(activeTemplate).subject}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">本文</Label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-md whitespace-pre-wrap font-mono text-sm">
                    {getPreviewContent(activeTemplate).body}
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