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
  ExternalLink,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Quote, CompanyInfo } from '@/types/collections';
import { generateDefaultSuggestedOptions, generateDefaultTooltips } from '@/lib/html-quote-generator';
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
  console.log('HtmlQuoteEditor mounted with:', { quote, companyInfo });
  console.log('Customer data:', quote.customer);
  console.log('onSend function received:', !!onSend); // デバッグ用
  
  // 税率を正しい形式に変換（0.1 -> 10）
  const normalizedTaxRate = quote.taxRate < 1 ? quote.taxRate * 100 : quote.taxRate;
  
  // 初期値を適切に設定
  const initialQuote = {
    ...quote,
    taxRate: normalizedTaxRate,
    customerName: quote.customerName || quote.customer?.companyName || quote.customer?.name || '',
    customerEmail: quote.customerEmail || quote.customer?.email || '',
    assignee: quote.assignee || companyInfo?.representative || companyInfo?.representativeName || ''
  };
  
  const [editedQuote, setEditedQuote] = useState(initialQuote);
  const [customMessage, setCustomMessage] = useState('いつもお世話になっております。\nご依頼いただいた内容について、お見積りをお送りいたします。\nご不明な点がございましたら、お気軽にお問い合わせください。');
  
  // 送信先情報の初期化（顧客の担当者情報を優先）
  const [recipientEmail, setRecipientEmail] = useState(
    initialQuote.customer?.contacts?.[0]?.email || 
    initialQuote.customerEmail || 
    initialQuote.customer?.email || 
    ''
  );
  const [recipientName, setRecipientName] = useState(
    initialQuote.customer?.contacts?.[0]?.name || ''  // 顧客担当者名のみ使用（会社名は使わない）
  );
  
  // 送信元情報の初期化（自社の営業担当者）- 任意項目なのでデフォルトは空
  const [staffName, setStaffName] = useState('');
  
  // デバッグ用: 初期値を確認
  console.log('=== Initial Values Debug ===');
  console.log('initialQuote.assignee:', initialQuote.assignee);
  console.log('staffName initial value:', initialQuote.assignee);
  console.log('companyInfo?.representative:', companyInfo?.representative || companyInfo?.representativeName);
  console.log('=== End Initial Debug ===');
  const [suggestedOptions, setSuggestedOptions] = useState(generateDefaultSuggestedOptions(quote));
  const [tooltips, setTooltips] = useState(generateDefaultTooltips());
  const [productLinks, setProductLinks] = useState(new Map<string, string>());
  const [includeTracking, setIncludeTracking] = useState(true);
  const [includeInteractiveElements, setIncludeInteractiveElements] = useState(true); // デフォルトはオン
  const [useWebLayout, setUseWebLayout] = useState(false); // Web最適化レイアウトフラグ
  const [attachPdf, setAttachPdf] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // アクティブなタブを追跡
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null); // プレビューウィンドウの参照

  // staffNameが変更されたときにeditedQuote.assigneeも同期する
  useEffect(() => {
    console.log('=== staffName Changed Effect ===');
    console.log('New staffName:', staffName);
    console.log('Current editedQuote.assignee before update:', editedQuote.assignee);
    
    // staffNameが変更されたときのみeditedQuote.assigneeを更新
    // 無限ループを避けるため、editedQuote.assigneeは依存配列から除外
    setEditedQuote(prev => {
      if (staffName !== prev.assignee) {
        console.log('Updating editedQuote.assignee from:', prev.assignee, 'to:', staffName);
        const updated = {
          ...prev,
          assignee: staffName
        };
        console.log('Updated editedQuote:', updated);
        return updated;
      }
      console.log('No update needed, values are the same');
      return prev;
    });
  }, [staffName]); // staffNameが変更されたときのみ実行

  // HTMLプレビューを生成
  const generatePreview = useCallback(async () => {
    try {
      // プレビュー用のデータを準備（customerName, customerEmailを確実に含める）
      const previewQuote = {
        ...editedQuote,
        customerName: editedQuote.customerName || recipientName || quote.customer?.name || quote.customer?.customerName,
        customerEmail: editedQuote.customerEmail || recipientEmail || quote.customer?.email,
        assignee: staffName || editedQuote.assignee || companyInfo?.representative || companyInfo?.representativeName,
        customer: quote.customer // 元の顧客情報も含める
      };
      
      // デバッグ用ログ
      console.log('=== Preview Generation Debug ===');
      console.log('1. staffName:', staffName);
      console.log('2. editedQuote.assignee:', editedQuote.assignee);
      console.log('3. companyInfo?.representative:', companyInfo?.representative || companyInfo?.representativeName);
      console.log('4. Final assignee (calculated):', previewQuote.assignee);
      console.log('5. Full previewQuote:', JSON.stringify(previewQuote, null, 2));
      console.log('6. Company Info being sent:', JSON.stringify(companyInfo, null, 2));
      console.log('=== End Debug ===');
      
      console.log('Generating preview with data:', {
        quote: previewQuote,
        companyInfo,
        recipientName,
        customMessage,
      });
      
      const response = await fetch('/api/quotes/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: previewQuote,
          companyInfo,
          recipientName: recipientName || previewQuote.customerName,
          customMessage,
          suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
          tooltips: includeInteractiveElements ? Array.from(tooltips.entries()) : [],
          productLinks: includeInteractiveElements ? Array.from(productLinks.entries()) : [],
          includeTracking,
          useWebLayout, // Web最適化レイアウト設定を送信
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview API error:', errorText);
        throw new Error(`Failed to generate preview: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Preview data received:', data);
      
      if (data.html) {
        setHtmlPreview(data.html);
      } else {
        console.error('No HTML in response:', data);
        setHtmlPreview('<p>プレビューを生成できませんでした</p>');
      }
    } catch (error) {
      logger.error('Error generating preview:', error);
      console.error('Preview generation error:', error);
      setHtmlPreview(`<p style="color: red;">エラー: ${error.message}</p>`);
    }
  }, [editedQuote, companyInfo, recipientName, customMessage, suggestedOptions, tooltips, productLinks, includeTracking, includeInteractiveElements, useWebLayout, staffName]); // staffNameも依存配列に追加

  // プレビュータブが選択された時、または全画面プレビューが開かれた時に生成
  useEffect(() => {
    if (activeTab === 'preview' || isPreviewOpen) {
      generatePreview();
    }
  }, [activeTab, isPreviewOpen, generatePreview]);

  // 提案オプションを追加
  const addSuggestedOption = () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
    setSuggestedOptions([
      ...suggestedOptions,
      {
        title: '新しいオプション',
        description: '説明を入力',
        price: '¥0',
        features: ['機能1'],
        ctaText: '詳細を見る',
        ctaUrl: `${baseUrl}/contact`, // デフォルトでお問い合わせページへのリンク
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
          pdfBuffer = Buffer.from(arrayBuffer).toString('base64'); // Base64エンコード
        }
      }

      // APIエンドポイント経由でメール送信
      const response = await fetch('/api/quotes/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: editedQuote,
          companyInfo,
          recipientEmail,
          recipientName,
          customMessage,
          attachPdf,
          pdfBuffer,
          suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
        }),
      });

      const result = await response.json();

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

  // 全画面プレビューを別ウィンドウで開く
  const openFullScreenPreview = async () => {
    // 既存のウィンドウがあれば閉じる
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }
    
    // htmlPreviewが空の場合は生成
    if (!htmlPreview) {
      await generatePreview();
    }
    
    // 新しいウィンドウを開く
    const newWindow = window.open('', 'quote-preview', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    
    if (newWindow) {
      // HTMLコンテンツを新しいウィンドウに書き込む
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>見積書プレビュー - ${editedQuote.quoteNumber}</title>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            .preview-header {
              background: #f8f9fa;
              padding: 10px 20px;
              border-bottom: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: sticky;
              top: 0;
              z-index: 100;
            }
            .preview-title {
              font-size: 14px;
              color: #6b7280;
            }
            .preview-actions {
              display: flex;
              gap: 10px;
            }
            .preview-button {
              padding: 6px 12px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
            }
            .preview-button:hover {
              background: #2563eb;
            }
            .preview-button.secondary {
              background: white;
              color: #3b82f6;
              border: 1px solid #3b82f6;
            }
            .preview-button.secondary:hover {
              background: #eff6ff;
            }
            .preview-content {
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="preview-header">
            <div class="preview-title">見積書プレビュー: ${editedQuote.quoteNumber}</div>
            <div class="preview-actions">
              <button class="preview-button secondary" onclick="window.print()">印刷</button>
              <button class="preview-button" onclick="window.close()">閉じる</button>
            </div>
          </div>
          <div class="preview-content">
            ${htmlPreview}
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
      setPreviewWindow(newWindow);
    }
  };

  // コンポーネントのクリーンアップ時にウィンドウを閉じる
  useEffect(() => {
    return () => {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
    };
  }, [previewWindow]);

  return (
    <div className="space-y-6 pb-40">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            HTML見積書エディタ
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            見積書の内容を編集し、HTML形式でプレビューできます。
            各タブで詳細な設定が可能です。
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="items">見積項目</TabsTrigger>
              <TabsTrigger value="message">メッセージ</TabsTrigger>
              <TabsTrigger value="settings">送信設定</TabsTrigger>
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
            </TabsList>

            {/* 基本情報タブ */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="quote-number">見積書番号</Label>
                  <Input
                    id="quote-number"
                    value={editedQuote.quoteNumber}
                    onChange={(e) => setEditedQuote({...editedQuote, quoteNumber: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quote-title">件名</Label>
                  <Input
                    id="quote-title"
                    value={editedQuote.title || ''}
                    onChange={(e) => setEditedQuote({...editedQuote, title: e.target.value})}
                    placeholder="見積書の件名"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-name">顧客名</Label>
                  <Input
                    id="customer-name"
                    value={editedQuote.customerName}
                    onChange={(e) => setEditedQuote({...editedQuote, customerName: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-email">顧客メールアドレス</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={editedQuote.customerEmail || ''}
                    onChange={(e) => {
                      setEditedQuote({...editedQuote, customerEmail: e.target.value});
                      setRecipientEmail(e.target.value); // 送信先も自動更新
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="issue-date">発行日</Label>
                  <Input
                    id="issue-date"
                    type="date"
                    value={editedQuote.issueDate ? new Date(editedQuote.issueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditedQuote({...editedQuote, issueDate: new Date(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="validity-date">有効期限</Label>
                  <Input
                    id="validity-date"
                    type="date"
                    value={editedQuote.validityDate ? new Date(editedQuote.validityDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditedQuote({...editedQuote, validityDate: new Date(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tax-rate">消費税率 (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    value={editedQuote.taxRate}
                    onChange={(e) => {
                      const taxRatePercent = parseFloat(e.target.value) || 0;
                      const subtotal = editedQuote.subtotal;
                      const taxAmount = Math.floor(subtotal * taxRatePercent / 100);
                      const totalAmount = subtotal + taxAmount;
                      setEditedQuote({
                        ...editedQuote, 
                        taxRate: taxRatePercent, 
                        taxAmount,
                        totalAmount
                      });
                    }}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="quote-notes">備考</Label>
                <Textarea
                  id="quote-notes"
                  value={editedQuote.notes || ''}
                  onChange={(e) => setEditedQuote({...editedQuote, notes: e.target.value})}
                  placeholder="お支払い条件や注意事項など"
                  rows={3}
                  className="mt-1"
                />
              </div>
            </TabsContent>

            {/* 見積項目タブ */}
            <TabsContent value="items" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Label>見積項目</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem = {
                      itemName: '新規項目',
                      description: '',
                      quantity: 1,
                      unit: '個',
                      unitPrice: 0,
                      amount: 0,
                    };
                    setEditedQuote({
                      ...editedQuote,
                      items: [...editedQuote.items, newItem]
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  項目追加
                </Button>
              </div>
              
              {editedQuote.items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label>項目名</Label>
                        <Input
                          value={item.itemName || item.description || ''}
                          onChange={(e) => {
                            const newItems = [...editedQuote.items];
                            newItems[index] = {...item, itemName: e.target.value};
                            setEditedQuote({...editedQuote, items: newItems});
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="w-24">
                        <Label>数量</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...editedQuote.items];
                            const quantity = parseFloat(e.target.value) || 0;
                            const amount = quantity * item.unitPrice;
                            newItems[index] = {...item, quantity, amount};
                            const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0);
                            const taxAmount = Math.floor(subtotal * editedQuote.taxRate / 100);
                            setEditedQuote({
                              ...editedQuote, 
                              items: newItems,
                              subtotal,
                              taxAmount,
                              totalAmount: subtotal + taxAmount
                            });
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="w-20">
                        <Label>単位</Label>
                        <Input
                          value={item.unit || '個'}
                          onChange={(e) => {
                            const newItems = [...editedQuote.items];
                            newItems[index] = {...item, unit: e.target.value};
                            setEditedQuote({...editedQuote, items: newItems});
                          }}
                          className="mt-1"
                        />
                      </div>
                      <div className="w-32">
                        <Label>単価</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...editedQuote.items];
                            const unitPrice = parseFloat(e.target.value) || 0;
                            const amount = item.quantity * unitPrice;
                            newItems[index] = {...item, unitPrice, amount};
                            const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0);
                            const taxAmount = Math.floor(subtotal * editedQuote.taxRate / 100);
                            setEditedQuote({
                              ...editedQuote, 
                              items: newItems,
                              subtotal,
                              taxAmount,
                              totalAmount: subtotal + taxAmount
                            });
                          }}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-6"
                        onClick={() => {
                          const newItems = editedQuote.items.filter((_, i) => i !== index);
                          const subtotal = newItems.reduce((sum, i) => sum + i.amount, 0);
                          const taxAmount = Math.floor(subtotal * editedQuote.taxRate / 100);
                          setEditedQuote({
                            ...editedQuote,
                            items: newItems,
                            subtotal,
                            taxAmount,
                            totalAmount: subtotal + taxAmount
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        小計: ¥{item.amount.toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const itemText = item.itemName || item.description || '';
                          const url = prompt(`${itemText}の詳細ページURLを入力:`, productLinks.get(itemText) || '');
                          if (url) {
                            addProductLink(itemText, url);
                          }
                        }}
                      >
                        <Link className="h-4 w-4 mr-1" />
                        リンク追加
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>小計</span>
                    <span className="font-medium">¥{editedQuote.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>消費税（{editedQuote.taxRate}%）</span>
                    <span className="font-medium">¥{editedQuote.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>合計</span>
                    <span>¥{editedQuote.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* メッセージタブ */}
            <TabsContent value="message" className="space-y-4">
              <div>
                <Label htmlFor="custom-message">カスタムメッセージ</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="お客様へのメッセージを入力"
                  rows={6}
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  見積書の冒頭に表示されるメッセージです
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="interactive-elements">インタラクティブ要素を含める</Label>
                <Switch
                  id="interactive-elements"
                  checked={includeInteractiveElements}
                  onCheckedChange={setIncludeInteractiveElements}
                />
              </div>
              
              {includeInteractiveElements && (
                <>
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      追加提案オプションやツールチップなどのインタラクティブ要素を含めます。
                    </AlertDescription>
                  </Alert>

                  {/* ツールチップ設定 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">ツールチップ設定</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>用語説明を追加</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="用語（例：SaaS）"
                            id="tooltip-term"
                          />
                          <Input 
                            placeholder="説明（例：クラウド経由で提供されるソフトウェア）"
                            id="tooltip-desc"
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const term = (document.getElementById('tooltip-term') as HTMLInputElement)?.value;
                              const desc = (document.getElementById('tooltip-desc') as HTMLInputElement)?.value;
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
                      </div>
                      
                      {/* 登録済みツールチップ一覧 */}
                      {tooltips.size > 0 && (
                        <div className="space-y-1">
                          <Label className="text-sm">登録済みツールチップ</Label>
                          <div className="space-y-1">
                            {Array.from(tooltips.entries()).map(([term, desc]) => (
                              <div key={term} className="flex items-center justify-between text-sm bg-muted rounded p-2">
                                <span><strong>{term}</strong>: {desc}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newTooltips = new Map(tooltips);
                                    newTooltips.delete(term);
                                    setTooltips(newTooltips);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 追加提案オプション設定 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">追加提案オプション</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {suggestedOptions.map((option, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <Input
                                value={option.title}
                                onChange={(e) => updateSuggestedOption(index, 'title', e.target.value)}
                                placeholder="オプションタイトル"
                                className="flex-1 mr-2"
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
                                placeholder="価格（例：¥50,000）"
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
                              placeholder="https://example.com/details または /contact"
                            />
                          </div>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        onClick={addSuggestedOption}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        オプションを追加
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* 送信設定タブ */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="recipient-email">送信先メールアドレス</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const email = editedQuote.customerEmail || editedQuote.customer?.email || '';
                        if (email) {
                          setRecipientEmail(email);
                        } else {
                          alert('顧客メールアドレスが設定されていません。基本情報タブで設定してください。');
                        }
                      }}
                    >
                      顧客メールを使用
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipient-name">送信先担当者名（顧客）</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="recipient-name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="顧客担当者名を入力"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // 顧客の担当者情報を優先的に使用
                        const contactName = editedQuote.customer?.contacts?.[0]?.name;
                        const contactEmail = editedQuote.customer?.contacts?.[0]?.email;
                        
                        if (contactName) {
                          setRecipientName(contactName);
                          // メールアドレスも一緒に設定
                          if (contactEmail) {
                            setRecipientEmail(contactEmail);
                          }
                        } else {
                          // 担当者情報がない場合は会社名を使用（ただし警告を表示）
                          const companyName = editedQuote.customerName || editedQuote.customer?.companyName || editedQuote.customer?.name || '';
                          if (companyName) {
                            alert('顧客の担当者情報が登録されていません。会社名を設定します。\n顧客マスタで担当者情報を登録することをお勧めします。');
                            setRecipientName(companyName + ' ご担当者様');
                          } else {
                            alert('顧客情報が設定されていません。基本情報タブで設定してください。');
                          }
                        }
                      }}
                    >
                      顧客担当者を使用
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="sender-name">営業担当者名（自社）</Label>
                  <Input
                    id="sender-name"
                    value={staffName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log('[送信設定タブ] 担当者名変更:', newValue);
                      setStaffName(newValue);
                      // useEffectで自動的に同期されるため、ここでの直接更新は不要
                    }}
                    placeholder="営業担当者の名前（任意）"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    メール署名に使用される名前です（空欄可）
                  </p>
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
              {/* デバッグ情報 */}
              <div className="text-xs text-muted-foreground mb-2">
                onSend available: {onSend ? 'Yes' : 'No'}
              </div>
              {/* シンプル化されたアクションバー */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `/quotes/view/${quote._id}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  ブラウザで表示
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
                {typeof onSend === 'function' && (
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
                )}
              </div>

              {/* プレビューエリア（レスポンシブ対応） */}
              <div
                className="border rounded-lg overflow-hidden"
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
            {typeof onSend === 'function' && (
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* 全画面プレビューダイアログは削除（別ウィンドウ方式に変更） */}
    </div>
  );
}
// Force reload: 2025-08-10T12:01
