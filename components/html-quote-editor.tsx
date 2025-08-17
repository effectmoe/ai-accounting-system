'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
  HelpCircle,
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
import OptionQuickCreator, { QuickOption } from '@/components/option-quick-creator';

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
  // デバッグ用ログ
  console.log('[HtmlQuoteEditor] onSend type:', typeof onSend);
  console.log('[HtmlQuoteEditor] onSend value:', onSend);
  console.log('HtmlQuoteEditor mounted with:', { quote, companyInfo });
  console.log('Customer data:', quote.customer);
  console.log('Quote htmlSettings:', quote.htmlSettings);
  console.log('onSend function received:', !!onSend); // デバッグ用
  
  // 税率を正しい形式に変換（0.1 -> 10）
  const normalizedTaxRate = quote.taxRate < 1 ? quote.taxRate * 100 : quote.taxRate;
  
  // 初期値を適切に設定
  const initialQuote = {
    ...quote,
    taxRate: normalizedTaxRate,
    customerName: quote.customerName || quote.customer?.companyName || quote.customer?.name || '',
    customerEmail: quote.customerEmail || quote.customer?.email || '',
    // assigneeは元の値のみを使用（初期値での連結を避ける）
    assignee: quote.assignee || ''
  };
  
  const [editedQuote, setEditedQuote] = useState(initialQuote);
  // HTMLSettingsからの初期値設定（デバッグログ付き）
  console.log('[HtmlQuoteEditor] Initial htmlSettings:', quote.htmlSettings);
  console.log('[HtmlQuoteEditor] Initial customMessage from htmlSettings:', quote.htmlSettings?.customMessage);
  
  const [customMessage, setCustomMessage] = useState(
    quote.htmlSettings?.customMessage || 
    'いつもお世話になっております。\nご依頼いただいた内容について、お見積りをお送りいたします。\nご不明な点がございましたら、お気軽にお問い合わせください。'
  );
  
  // customMessageの変更を追跡
  const handleCustomMessageChange = (newContent: string) => {
    console.log('[HtmlQuoteEditor] customMessage changing from:', customMessage);
    console.log('[HtmlQuoteEditor] customMessage changing to:', newContent);
    setCustomMessage(newContent);
  };
  
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
  console.log('recipientEmail initial value:', recipientEmail);
  console.log('initialQuote.customer:', initialQuote.customer);
  console.log('initialQuote.customerEmail:', initialQuote.customerEmail);
  console.log('=== End Initial Debug ===');
  const [suggestedOptions, setSuggestedOptions] = useState(
    quote.htmlSettings?.suggestedOptions || generateDefaultSuggestedOptions(quote)
  );
  const [tooltips, setTooltips] = useState(() => {
    if (quote.htmlSettings?.tooltips) {
      return new Map(quote.htmlSettings.tooltips);
    }
    return generateDefaultTooltips();
  });
  const [productLinks, setProductLinks] = useState(() => {
    if (quote.htmlSettings?.productLinks) {
      return new Map(quote.htmlSettings.productLinks);
    }
    return new Map<string, string>();
  });
  const [includeTracking, setIncludeTracking] = useState(
    quote.htmlSettings?.includeTracking ?? true
  );
  const [includeInteractiveElements, setIncludeInteractiveElements] = useState(
    quote.htmlSettings?.includeInteractiveElements ?? true
  ); // デフォルトはオン
  const [useWebLayout, setUseWebLayout] = useState(
    quote.htmlSettings?.useWebLayout ?? false
  ); // Web最適化レイアウトフラグ
  const [attachPdf, setAttachPdf] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('basic'); // アクティブなタブを追跡
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null); // プレビューウィンドウの参照
  const [showQuickCreator, setShowQuickCreator] = useState(false); // クイックオプション作成ダイアログの表示状態
  const [isLoadingSuggestedOptions, setIsLoadingSuggestedOptions] = useState(false); // おすすめオプション読み込み状態

  // quoteが更新された場合に設定を復元する
  useEffect(() => {
    console.log('[HtmlQuoteEditor.useEffect] Quote changed, htmlSettings:', quote.htmlSettings);
    if (quote.htmlSettings) {
      console.log('[HtmlQuoteEditor.useEffect] Restoring HTML settings from quote:', quote.htmlSettings);
      
      // カスタムメッセージを復元
      if (quote.htmlSettings.customMessage !== undefined && quote.htmlSettings.customMessage !== customMessage) {
        console.log('[HtmlQuoteEditor.useEffect] Updating customMessage from:', customMessage, 'to:', quote.htmlSettings.customMessage);
        setCustomMessage(quote.htmlSettings.customMessage);
      }
      
      // 提案オプションを復元
      if (quote.htmlSettings.suggestedOptions) {
        setSuggestedOptions(quote.htmlSettings.suggestedOptions);
      }
      
      // ツールチップを復元
      if (quote.htmlSettings.tooltips) {
        setTooltips(new Map(quote.htmlSettings.tooltips));
      }
      
      // 商品リンクを復元
      if (quote.htmlSettings.productLinks) {
        setProductLinks(new Map(quote.htmlSettings.productLinks));
      }
      
      // フラグ設定を復元
      if (quote.htmlSettings.includeTracking !== undefined) {
        setIncludeTracking(quote.htmlSettings.includeTracking);
      }
      
      if (quote.htmlSettings.includeInteractiveElements !== undefined) {
        setIncludeInteractiveElements(quote.htmlSettings.includeInteractiveElements);
      }
      
      if (quote.htmlSettings.useWebLayout !== undefined) {
        setUseWebLayout(quote.htmlSettings.useWebLayout);
      }
    }
  }, [quote]); // quoteが変更されたときに実行
  
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
        // assigneeは最初に見つかった値のみを使用（重複を避ける）
        assignee: staffName || editedQuote.assignee || companyInfo?.representative || companyInfo?.representativeName || '',
        customer: quote.customer // 元の顧客情報も含める
      };
      
      // デバッグ用ログ
      console.log('=== Preview Generation Debug ===');
      console.log('1. staffName:', staffName);
      console.log('2. editedQuote.assignee:', editedQuote.assignee);
      console.log('3. companyInfo:', companyInfo);
      console.log('4. Final assignee (calculated):', previewQuote.assignee);
      console.log('5. suggestedOptions count:', suggestedOptions.length);
      console.log('6. suggestedOptions data:', suggestedOptions);
      console.log('7. tooltips size:', tooltips.size);
      console.log('8. tooltips entries:', Array.from(tooltips.entries()));
      console.log('9. includeInteractiveElements:', includeInteractiveElements);
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

  // APIからおすすめオプションを取得する関数
  const fetchSuggestedOptionsFromAPI = useCallback(async (amount: number) => {
    try {
      setIsLoadingSuggestedOptions(true);
      console.log('Fetching suggested options for amount:', amount);
      
      const response = await fetch(`/api/suggested-options/for-quote?amount=${amount}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received suggested options from API:', data);
      
      if (data.suggestedOptions && data.suggestedOptions.length > 0) {
        // DBから取得したオプションを設定
        setSuggestedOptions(data.suggestedOptions);
        console.log(`Updated suggested options with ${data.suggestedOptions.length} items from DB`);
      } else {
        // DBにオプションがない場合はデフォルトを使用
        const defaultOptions = generateDefaultSuggestedOptions(editedQuote);
        setSuggestedOptions(defaultOptions);
        console.log('No options found in DB, using default options');
      }
    } catch (error) {
      console.error('Error fetching suggested options:', error);
      // エラーの場合はデフォルトオプションを使用
      const defaultOptions = generateDefaultSuggestedOptions(editedQuote);
      setSuggestedOptions(defaultOptions);
    } finally {
      setIsLoadingSuggestedOptions(false);
    }
  }, [editedQuote]);

  // 見積書の合計金額が変更されたときにおすすめオプションを更新
  useEffect(() => {
    if (editedQuote.totalAmount > 0) {
      console.log('Total amount changed:', editedQuote.totalAmount);
      fetchSuggestedOptionsFromAPI(editedQuote.totalAmount);
    }
  }, [editedQuote.totalAmount, fetchSuggestedOptionsFromAPI]);

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

  // クイックオプションを追加
  const handleQuickOptionAdd = (quickOption: QuickOption) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
    setSuggestedOptions([
      ...suggestedOptions,
      {
        title: quickOption.title,
        description: quickOption.description,
        price: quickOption.price,
        features: quickOption.features,
        ctaText: quickOption.ctaText,
        ctaUrl: quickOption.ctaUrl || `${baseUrl}/contact`,
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
    console.log('[HtmlQuoteEditor] handleSend called');
    console.log('[HtmlQuoteEditor] recipientEmail:', recipientEmail);
    console.log('[HtmlQuoteEditor] isSending:', isSending);
    
    // 送信先メールアドレスの確認
    let emailToSend = recipientEmail;
    if (!emailToSend) {
      console.log('[HtmlQuoteEditor] recipientEmail is empty, prompting user');
      const email = prompt('送信先メールアドレスを入力してください:');
      if (!email) {
        console.log('[HtmlQuoteEditor] User cancelled email input');
        return;
      }
      emailToSend = email;
      setRecipientEmail(email);
      console.log('[HtmlQuoteEditor] Set recipient email to:', email);
    }

    // onSendプロップの存在確認（親コンポーネントの送信機能を優先）
    if (typeof onSend === 'function') {
      console.log('[HtmlQuoteEditor] Using parent onSend function');
      setIsSending(true);
      try {
        await onSend({
          quote: editedQuote,
          companyInfo,
          recipientEmail: emailToSend, // 更新されたemailToSendを使用
          recipientName,
          customMessage,
          attachPdf,
          suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
        });
        // アラートは親コンポーネントで表示されるので、ここでは表示しない
        console.log('[HtmlQuoteEditor] Parent onSend completed successfully');
      } catch (error) {
        logger.error('Error sending quote via parent onSend:', error);
        // エラー時のアラートは親コンポーネントで表示されるので、ここでは表示しない
        throw error; // エラーを再スローして親に伝播
      } finally {
        setIsSending(false);
      }
      return;
    }

    console.log('[HtmlQuoteEditor] Using direct API call');
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
          recipientEmail: emailToSend, // 更新されたemailToSendを使用
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
        // 成功時のトラッキング情報をログに記録
        console.log('[HtmlQuoteEditor] Email sent successfully, trackingId:', result.trackingId);
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
        // デバッグ用ログ
        console.log('[HtmlQuoteEditor.handleSave] Current customMessage:', customMessage);
        console.log('[HtmlQuoteEditor.handleSave] HTML content length:', customMessage.length);
        
        const dataToSave = {
          ...editedQuote,
          htmlSettings: {
            customMessage,
            suggestedOptions,
            tooltips: Array.from(tooltips.entries()),
            productLinks: Array.from(productLinks.entries()),
            includeTracking,
            includeInteractiveElements,
          },
        };
        
        console.log('[HtmlQuoteEditor.handleSave] Data being saved:', dataToSave);
        console.log('[HtmlQuoteEditor.handleSave] htmlSettings.customMessage:', dataToSave.htmlSettings.customMessage);
        
        await onSave(dataToSave);
        console.log('[HtmlQuoteEditor.handleSave] Save completed successfully');
        alert('保存しました');
      }
    } catch (error) {
      logger.error('Error saving:', error);
      console.error('[HtmlQuoteEditor.handleSave] Error:', error);
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
    
    // 常に最新のプレビューを生成（オプションを含む）
    await generatePreview();
    
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

  // メッセージリスナーを追加してオプションページからのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ADD_OPTION') {
        const option = event.data.option;
        setSuggestedOptions(prev => [...prev, {
          title: option.title,
          description: option.description,
          price: option.price,
          features: option.features,
          ctaText: option.ctaText,
          ctaUrl: option.ctaUrl
        }]);
        
        // オプションが追加されたことをユーザーに通知
        alert(`「${option.title}」が見積書に追加されました。`);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
  
  // コンポーネントのクリーンアップ時にウィンドウを閉じる
  useEffect(() => {
    return () => {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
    };
  }, [previewWindow]);

  return (
    <TooltipProvider>
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
                        <Label className="flex items-center gap-2">
                          項目名
                          {/* ツールチップが存在する場合にアイコンを表示 */}
                          {(() => {
                            const itemText = item.itemName || item.description || '';
                            const matchedTerms = Array.from(tooltips.keys()).filter(term => 
                              itemText.includes(term)
                            );
                            if (matchedTerms.length > 0) {
                              return (
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="top" 
                                    align="center" 
                                    className="max-w-xs z-[100] bg-background border shadow-lg"
                                    sideOffset={8}
                                  >
                                    {matchedTerms.map((term, i) => (
                                      <div key={term}>
                                        {i > 0 && <hr className="my-1" />}
                                        <strong>{term}:</strong> {tooltips.get(term)}
                                      </div>
                                    ))}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return null;
                          })()}
                        </Label>
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
                <div className="mt-1">
                  <RichTextEditor
                    content={customMessage}
                    onChange={handleCustomMessageChange}
                    placeholder="お客様へのメッセージを入力（太字、リンク、色などの装飾が可能です）"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  見積書の冒頭に表示されるメッセージです。太字、リンク、文字色などの装飾が可能です。
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">追加提案オプション</CardTitle>
                        {isLoadingSuggestedOptions && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span>読み込み中...</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        見積金額に応じてDBから自動取得されるおすすめオプション（現在の金額: ¥{editedQuote.totalAmount?.toLocaleString() || '0'}）
                      </p>
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => fetchSuggestedOptionsFromAPI(editedQuote.totalAmount || 0)}
                          disabled={isLoadingSuggestedOptions}
                          className="flex-1"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          DBから再取得
                        </Button>
                        <Button
                          variant="outline"
                          onClick={addSuggestedOption}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          手動で追加
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowQuickCreator(true)}
                          className="flex-1"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          簡単作成
                        </Button>
                      </div>
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
              {/* アクションバー with レイアウト切り替え */}
              <div className="flex items-center justify-between">
                {/* 左側: レイアウト切り替えボタン */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">レイアウト:</span>
                  <div className="flex gap-1 border rounded-lg p-1">
                    <Button
                      variant={useWebLayout ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setUseWebLayout(true)}
                      className="h-7 px-3"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      ウェブ版
                    </Button>
                    <Button
                      variant={!useWebLayout ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setUseWebLayout(false)}
                      className="h-7 px-3"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      メール版
                    </Button>
                  </div>
                </div>
                
                {/* 右側: アクションボタン */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `/quotes/${quote._id}/preview`;
                      // 新しいウィンドウを大きめのサイズで開く
                      const width = Math.min(window.screen.width * 0.9, 1400);
                      const height = Math.min(window.screen.height * 0.9, 900);
                      const left = (window.screen.width - width) / 2;
                      const top = (window.screen.height - height) / 2;
                      window.open(
                        url, 
                        'quotePreview',
                        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
                      );
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
                  <Button
                    onClick={handleSend}
                    disabled={isSending}
                    title={isSending ? '送信中です' : '見積書を送信します'}
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
                  sandbox="allow-scripts allow-popups"
                  style={{ border: 'none' }}
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
                disabled={isSending}
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
      
      {/* クイックオプション作成ダイアログ */}
      <OptionQuickCreator
        isOpen={showQuickCreator}
        onClose={() => setShowQuickCreator(false)}
        onAdd={handleQuickOptionAdd}
        baseUrl={process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app'}
      />
      </div>
    </TooltipProvider>
  );
}
// Force reload: 2025-08-10T12:01
