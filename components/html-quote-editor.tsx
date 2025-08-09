'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Eye,
  Send,
  Save,
  Plus,
  Trash2,
  Link,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Code,
  FileText,
  Mail,
  Globe,
  Smartphone,
  Monitor,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Quote, CompanyInfo } from '@/types/collections';
import { generateDefaultSuggestedOptions, generateDefaultTooltips } from '@/lib/html-quote-generator';
import { sendQuoteEmail } from '@/lib/resend-service';
import { logger } from '@/lib/logger';
import { EmailTemplate } from '@/components/email-template-manager';

interface HtmlQuoteEditorProps {
  quote: Quote;
  companyInfo: CompanyInfo;
  onSave?: (updatedQuote: any) => Promise<void>;
  onSend?: (emailOptions: any) => Promise<void>;
}

export default function HtmlQuoteEditor({
  quote,
  companyInfo,
  onSave,
  onSend,
}: HtmlQuoteEditorProps) {
  const [editedQuote, setEditedQuote] = useState(quote);
  const [customMessage, setCustomMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState(quote.customerEmail || '');
  const [recipientName, setRecipientName] = useState(quote.customerName || '');
  const [suggestedOptions, setSuggestedOptions] = useState(generateDefaultSuggestedOptions(quote));
  const [tooltips, setTooltips] = useState(generateDefaultTooltips());
  const [productLinks, setProductLinks] = useState(new Map<string, string>());
  const [includeTracking, setIncludeTracking] = useState(true);
  const [includeInteractiveElements, setIncludeInteractiveElements] = useState(true);
  const [attachPdf, setAttachPdf] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [copied, setCopied] = useState(false);

  // HTMLプレビューを生成
  const generatePreview = useCallback(async () => {
    try {
      const response = await fetch('/api/quotes/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: editedQuote,
          companyInfo,
          recipientName,
          customMessage,
          suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
          tooltips: includeInteractiveElements ? Array.from(tooltips.entries()) : [],
          productLinks: includeInteractiveElements ? Array.from(productLinks.entries()) : [],
          includeTracking,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate preview');
      const data = await response.json();
      setHtmlPreview(data.html);
    } catch (error) {
      logger.error('Error generating preview:', error);
    }
  }, [editedQuote, companyInfo, recipientName, customMessage, suggestedOptions, tooltips, productLinks, includeTracking, includeInteractiveElements]);

  useEffect(() => {
    if (isPreviewOpen) {
      generatePreview();
    }
  }, [isPreviewOpen, generatePreview]);

  // 提案オプションを追加
  const addSuggestedOption = () => {
    setSuggestedOptions([
      ...suggestedOptions,
      {
        title: '新しいオプション',
        description: '説明を入力',
        price: '¥0',
        features: ['機能1'],
        ctaText: '詳細を見る',
        ctaUrl: '#',
      },
    ]);
  };

  // 提案オプションを削除
  const removeSuggestedOption = (index: number) => {
    setSuggestedOptions(suggestedOptions.filter((_, i) => i !== index));
  };

  // 提案オプションを更新
  const updateSuggestedOption = (index: number, field: string, value: any) => {
    setSuggestedOptions(
      suggestedOptions.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      )
    );
  };

  // ツールチップを追加
  const addTooltip = (term: string, description: string) => {
    const newTooltips = new Map(tooltips);
    newTooltips.set(term, description);
    setTooltips(newTooltips);
  };

  // 商品リンクを追加
  const addProductLink = (productId: string, url: string) => {
    const newLinks = new Map(productLinks);
    newLinks.set(productId, url);
    setProductLinks(newLinks);
  };

  // メール送信
  const handleSend = async () => {
    if (!recipientEmail) {
      alert('送信先メールアドレスを入力してください');
      return;
    }

    setIsSending(true);
    try {
      // PDF生成
      let pdfBuffer;
      if (attachPdf) {
        const pdfResponse = await fetch(`/api/quotes/${quote._id}/pdf`);
        if (pdfResponse.ok) {
          const blob = await pdfResponse.blob();
          const arrayBuffer = await blob.arrayBuffer();
          pdfBuffer = Buffer.from(arrayBuffer);
        }
      }

      // メール送信
      const result = await sendQuoteEmail({
        quote: editedQuote,
        companyInfo,
        recipientEmail,
        recipientName,
        customMessage,
        attachPdf,
        pdfBuffer,
        suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
      });

      if (result.success) {
        alert('見積書を送信しました');
        if (onSend) {
          await onSend({
            recipientEmail,
            recipientName,
            customMessage,
            trackingId: result.trackingId,
          });
        }
      } else {
        throw new Error(result.error || 'Send failed');
      }
    } catch (error) {
      logger.error('Error sending quote:', error);
      alert('送信に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  // 保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          ...editedQuote,
          htmlSettings: {
            customMessage,
            suggestedOptions,
            tooltips: Array.from(tooltips.entries()),
            productLinks: Array.from(productLinks.entries()),
            includeTracking,
            includeInteractiveElements,
          },
        });
        alert('保存しました');
      }
    } catch (error) {
      logger.error('Error saving:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // HTMLをコピー
  const copyHtml = () => {
    navigator.clipboard.writeText(htmlPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            HTML見積書エディタ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">内容編集</TabsTrigger>
              <TabsTrigger value="interactive">インタラクティブ</TabsTrigger>
              <TabsTrigger value="settings">送信設定</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>

            {/* 内容編集タブ */}
            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="custom-message">カスタムメッセージ</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="お客様へのメッセージを入力（オプション）"
                  rows={3}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  見積書の冒頭に表示される特別なメッセージです
                </p>
              </div>

              <div className="space-y-2">
                <Label>見積項目</Label>
                {editedQuote.items.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × ¥{item.unitPrice.toLocaleString()} = ¥{item.amount.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = prompt(`${item.description}の詳細ページURLを入力:`, productLinks.get(item.description) || '');
                          if (url) {
                            addProductLink(item.description, url);
                          }
                        }}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* インタラクティブタブ */}
            <TabsContent value="interactive" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="interactive-elements">インタラクティブ要素</Label>
                <Switch
                  id="interactive-elements"
                  checked={includeInteractiveElements}
                  onCheckedChange={setIncludeInteractiveElements}
                />
              </div>

              {includeInteractiveElements && (
                <>
                  {/* 提案オプション */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>追加提案オプション</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSuggestedOption}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        追加
                      </Button>
                    </div>
                    
                    {suggestedOptions.map((option, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Input
                              value={option.title}
                              onChange={(e) => updateSuggestedOption(index, 'title', e.target.value)}
                              placeholder="タイトル"
                              className="font-medium"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSuggestedOption(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={option.description}
                            onChange={(e) => updateSuggestedOption(index, 'description', e.target.value)}
                            placeholder="説明"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={option.price}
                              onChange={(e) => updateSuggestedOption(index, 'price', e.target.value)}
                              placeholder="価格"
                            />
                            <Input
                              value={option.ctaText}
                              onChange={(e) => updateSuggestedOption(index, 'ctaText', e.target.value)}
                              placeholder="ボタンテキスト"
                            />
                          </div>
                          <Input
                            value={option.ctaUrl}
                            onChange={(e) => updateSuggestedOption(index, 'ctaUrl', e.target.value)}
                            placeholder="リンクURL"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* ツールチップ */}
                  <div className="space-y-2">
                    <Label>用語解説（ツールチップ）</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="用語"
                        id="tooltip-term"
                      />
                      <Input
                        placeholder="説明"
                        id="tooltip-desc"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const term = (document.getElementById('tooltip-term') as HTMLInputElement).value;
                          const desc = (document.getElementById('tooltip-desc') as HTMLInputElement).value;
                          if (term && desc) {
                            addTooltip(term, desc);
                            (document.getElementById('tooltip-term') as HTMLInputElement).value = '';
                            (document.getElementById('tooltip-desc') as HTMLInputElement).value = '';
                          }
                        }}
                      >
                        追加
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(tooltips.entries()).map(([term, desc]) => (
                        <TooltipProvider key={term}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="cursor-help">
                                {term}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{desc}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* 送信設定タブ */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="recipient-email">送信先メールアドレス</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="recipient-name">送信先名</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="山田太郎"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="attach-pdf">PDFを添付</Label>
                  <Switch
                    id="attach-pdf"
                    checked={attachPdf}
                    onCheckedChange={setAttachPdf}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-tracking">開封・クリック追跡</Label>
                  <Switch
                    id="include-tracking"
                    checked={includeTracking}
                    onCheckedChange={setIncludeTracking}
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Resend Proの機能により、メールの開封率やリンクのクリック率を追跡できます。
                  Vercel Analyticsと連携して、顧客の行動を分析できます。
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* プレビュータブ */}
            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'tablet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('tablet')}
                  >
                    <Smartphone className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    全画面プレビュー
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyHtml}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    HTMLをコピー
                  </Button>
                </div>
              </div>

              <div
                className={`border rounded-lg overflow-hidden ${
                  previewMode === 'mobile' ? 'max-w-sm mx-auto' :
                  previewMode === 'tablet' ? 'max-w-2xl mx-auto' :
                  ''
                }`}
                style={{ height: '600px' }}
              >
                <iframe
                  srcDoc={htmlPreview}
                  className="w-full h-full"
                  title="HTML Quote Preview"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* アクションボタン */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  保存
                </>
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !recipientEmail}
            >
              {isSending ? (
                <>
                  <Send className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  送信
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 全画面プレビューダイアログ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-7xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>HTML見積書プレビュー</DialogTitle>
            <DialogDescription>
              実際にお客様に送信される見積書の表示です
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              srcDoc={htmlPreview}
              className="w-full h-full border rounded"
              title="Full Screen HTML Quote Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}