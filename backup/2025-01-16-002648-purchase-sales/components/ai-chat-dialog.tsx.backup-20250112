'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  X,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  invoiceData?: any; // 抽出された請求書データ
  quickReplies?: Array<{ text: string; value: string }>; // クイック返信オプション
}

interface AIChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (invoiceData: any) => void;
  initialInvoiceData?: any; // 既存の請求書データ（編集モード用）
  mode?: 'create' | 'edit'; // 作成モードか編集モード
}

export default function AIChatDialog({ 
  isOpen, 
  onClose, 
  onComplete, 
  initialInvoiceData,
  mode = 'create' 
}: AIChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(mode === 'create' ? { items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 } : (initialInvoiceData || { items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 }));
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期メッセージの設定
  useEffect(() => {
    if (isOpen) {
      // ダイアログが開かれた時は常にメッセージをリセット
      if (messages.length === 0) {
        // セッション開始時のデータ設定（リセットしない）
        if (mode === 'edit' && initialInvoiceData) {
          setCurrentInvoiceData(initialInvoiceData);
        }
      
        const initialMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: mode === 'create' 
            ? 'こんにちは！請求書作成をお手伝いします。\n\n例えば以下のような内容を教えてください：\n- 顧客名（〇〇会社様）\n- 請求内容（ウェブサイト制作費など）\n- 金額（50万円など）\n- 納期や支払期限\n\nどのような請求書を作成しますか？'
            : 'こんにちは！請求書の編集をお手伝いします。\n\nどの部分を変更したいですか？例えば：\n- 金額の変更\n- 明細の追加・削除\n- 支払期限の変更\n- 備考の追加\n\nお気軽にお申し付けください。',
          timestamp: new Date(),
          quickReplies: mode === 'create'
            ? [
                { text: '例を見る', value: '請求書の作成例を見せてください' }
              ]
            : [
                { text: '金額を変更', value: '金額を変更したいです' },
                { text: '明細を追加', value: '明細を追加したいです' },
                { text: '支払期限を変更', value: '支払期限を変更したいです' }
              ]
        };
        setMessages([initialMessage]);
        setSessionId(Date.now().toString());
      }
    }
  }, [isOpen, mode, initialInvoiceData]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // currentInvoiceDataの変更を監視
  useEffect(() => {
    console.log('[Frontend] currentInvoiceData changed:', currentInvoiceData);
  }, [currentInvoiceData]);

  // メッセージ送信処理
  const sendMessage = async (customInput?: string) => {
    const messageText = customInput || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // 会話履歴を含めてAPIに送信
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      conversationHistory.push({ role: 'user', content: userMessage.content });

      console.log('[Frontend] Sending data to API:', {
        conversation: userMessage.content,
        currentInvoiceData,
        sessionId,
        mode
      });
      
      // タイムアウトを設定（30秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/invoices/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: userMessage.content,
          conversationHistory,
          sessionId,
          currentInvoiceData,
          mode
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('リクエストがタイムアウトしました。もう一度お試しください。');
        }
        throw new Error('会話の処理に失敗しました');
      }

      const result = await response.json();
      
      console.log('[Frontend] Received response from API:', {
        message: result.message,
        data: result.data
      });

      // AIの応答メッセージ
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || '請求書データを更新しました。',
        timestamp: new Date(),
        invoiceData: result.data,
        quickReplies: result.quickReplies
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 請求書データを更新
      if (result.data) {
        console.log('[Frontend] Updating invoice data:', result.data);
        console.log('[Frontend] Data details:', {
          items: result.data.items,
          subtotal: result.data.subtotal,
          taxAmount: result.data.taxAmount,
          totalAmount: result.data.totalAmount,
          customerName: result.data.customerName
        });
        
        // 各項目の詳細をログ出力
        if (result.data.items && result.data.items.length > 0) {
          console.log('[Frontend] Items detail:');
          result.data.items.forEach((item, index) => {
            console.log(`[Frontend] Item ${index}:`, {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              taxAmount: item.taxAmount,
              total: item.amount + item.taxAmount
            });
          });
        }
        
        // データが正しく設定されているか確認
        if (result.data.items && result.data.items.length > 0) {
          console.log('[Frontend] Items detected, updating currentInvoiceData');
        }
        if (result.data.customerName) {
          console.log('[Frontend] Customer name detected:', result.data.customerName);
        }
        
        // 完全なデータ構造で更新（既存データとマージ）
        setCurrentInvoiceData(prev => {
          console.log('[Frontend] Previous state:', prev);
          
          // itemsの更新は、バックエンドが明示的に送信した場合のみ行う
          // バックエンドは常に完全な更新後のitemsを送信するので、そのまま使用する
          const newData = {
            ...prev,
            ...result.data,
            // itemsは常にバックエンドから送られたものを使用
            items: result.data.items !== undefined ? result.data.items : prev.items || [],
            subtotal: result.data.subtotal !== undefined ? result.data.subtotal : prev.subtotal || 0,
            taxAmount: result.data.taxAmount !== undefined ? result.data.taxAmount : (result.data.totalTaxAmount !== undefined ? result.data.totalTaxAmount : prev.taxAmount || 0),
            totalAmount: result.data.totalAmount !== undefined ? result.data.totalAmount : prev.totalAmount || 0
          };
          console.log('[Frontend] New state will be:', newData);
          console.log('[Frontend] Items update:', {
            prevItemsCount: prev.items?.length || 0,
            newItemsCount: newData.items?.length || 0,
            items: newData.items
          });
          return newData;
        });
      } else {
        console.log('[Frontend] No data in result, not updating currentInvoiceData');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = '申し訳ございません。処理中にエラーが発生しました。もう一度お試しください。';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('タイムアウト')) {
          errorContent = 'リクエストがタイムアウトしました。ネットワーク接続を確認して、もう一度お試しください。';
        } else if (error.message) {
          errorContent = error.message;
        }
      }
      
      setError(errorContent);
      
      // エラーメッセージを追加
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 会話を完了して請求書データを確定
  const completeConversation = () => {
    if (currentInvoiceData && (currentInvoiceData.customerName || (currentInvoiceData.items && currentInvoiceData.items.length > 0))) {
      console.log('[Frontend] Completing conversation with data:', currentInvoiceData);
      console.log('[Frontend] Final data details:', {
        items: currentInvoiceData.items,
        subtotal: currentInvoiceData.subtotal,
        taxAmount: currentInvoiceData.taxAmount,
        totalAmount: currentInvoiceData.totalAmount
      });
      onComplete(currentInvoiceData);
    } else {
      setError('請求書データがまだ作成されていません。');
    }
  };

  // 会話ログをダウンロード
  const downloadConversationLog = () => {
    // 会話ログを整形
    let logContent = `AI請求書${mode === 'create' ? '作成' : '編集'}アシスタント 会話ログ\n`;
    logContent += `=============================================\n`;
    logContent += `ダウンロード日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}\n`;
    logContent += `=============================================\n\n`;

    messages.forEach((message) => {
      const timestamp = format(message.timestamp, 'yyyy/MM/dd HH:mm:ss', { locale: ja });
      const speaker = message.role === 'user' ? 'ユーザー' : 'AIアシスタント';
      
      logContent += `[${timestamp}] ${speaker}\n`;
      logContent += `${message.content}\n`;
      logContent += `---------------------------------------------\n\n`;
    });

    // 現在の請求書データも追記
    if (currentInvoiceData && (currentInvoiceData.customerName || (currentInvoiceData.items && currentInvoiceData.items.length > 0))) {
      logContent += `\n=============================================\n`;
      logContent += `作成された請求書データ\n`;
      logContent += `=============================================\n\n`;
      
      if (currentInvoiceData.customerName) {
        logContent += `顧客名: ${currentInvoiceData.customerName}\n`;
      }
      
      if (currentInvoiceData.items && currentInvoiceData.items.length > 0) {
        logContent += `\n明細:\n`;
        currentInvoiceData.items.forEach((item: any, index: number) => {
          logContent += `${index + 1}. ${item.description}\n`;
          logContent += `   数量: ${item.quantity} ${item.unit || ''}\n`;
          logContent += `   単価: ¥${item.unitPrice.toLocaleString()}\n`;
          logContent += `   小計: ¥${item.amount.toLocaleString()}\n`;
          logContent += `   税額: ¥${item.taxAmount.toLocaleString()}\n`;
          logContent += `   合計: ¥${(item.amount + item.taxAmount).toLocaleString()}\n\n`;
        });
      }
      
      if (currentInvoiceData.subtotal !== undefined) {
        logContent += `\n小計: ¥${currentInvoiceData.subtotal.toLocaleString()}\n`;
        logContent += `税額: ¥${currentInvoiceData.taxAmount.toLocaleString()}\n`;
        logContent += `合計: ¥${currentInvoiceData.totalAmount.toLocaleString()}\n`;
      }
    }

    // ダウンロード処理
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `請求書${mode === 'create' ? '作成' : '編集'}_会話ログ_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // エンターキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col bg-white">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              {mode === 'create' ? 'AI請求書作成アシスタント' : 'AI請求書編集アシスタント'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              // ダイアログを閉じる際にデータをリセット
              setMessages([]);
              setCurrentInvoiceData({ items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 });
              setSessionId(null);
              setError(null);
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 現在の請求書データプレビュー */}
        {currentInvoiceData && (
          currentInvoiceData.customerName || 
          (currentInvoiceData.items && currentInvoiceData.items.length > 0) ||
          (currentInvoiceData.subtotal && currentInvoiceData.subtotal > 0) ||
          (currentInvoiceData.totalAmount && currentInvoiceData.totalAmount > 0)
        ) && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">現在の請求書データ</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              {currentInvoiceData.customerName && (
                <p>顧客: {currentInvoiceData.customerName}</p>
              )}
              {currentInvoiceData.items && currentInvoiceData.items.length > 0 && (
                <p>明細: {currentInvoiceData.items.map((item: any) => item.description).join(', ')}</p>
              )}
              {(() => {
                // 合計金額を正しく計算
                const subtotal = currentInvoiceData.subtotal || 0;
                const taxAmount = currentInvoiceData.taxAmount || 0;
                const totalAmount = currentInvoiceData.totalAmount || 0;
                
                console.log('[Frontend] Display calculation:', { subtotal, taxAmount, totalAmount });
                
                return totalAmount > 0 ? (
                  <p>合計: ¥{totalAmount.toLocaleString()}（税込）</p>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* チャットメッセージエリア */}
        <ScrollArea className="flex-1 p-4 bg-gray-50" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white rounded-lg p-3'
                      : ''
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-2">
                      <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {format(message.timestamp, 'HH:mm', { locale: ja })}
                        </p>
                      </div>
                      {message.quickReplies && message.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.quickReplies.map((reply, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                sendMessage(reply.value);
                              }}
                              disabled={isLoading}
                              className="text-sm"
                            >
                              {reply.text}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 text-gray-400">
                        {format(message.timestamp, 'HH:mm', { locale: ja })}
                      </p>
                    </>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 入力エリア */}
        <div className="p-4 border-t space-y-3 bg-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-input" className="text-sm text-gray-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AIアシスタントに質問や指示を入力してください
              </Label>
              <span className="text-xs text-gray-500">Enterで送信</span>
            </div>
            <div className="flex gap-2">
              <Input
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例: 山田商事さんに、ウェブサイト制作費として50万円の請求書を作成してください"
                disabled={isLoading}
                className="flex-1 placeholder:text-gray-400"
              />
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                disabled={!input.trim() || isLoading}
                size="icon"
                title="送信 (Enter)"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {isLoading && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                AIが応答を生成中...
              </p>
            )}
          </div>
          
          {/* アクションボタン */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  // ダイアログを閉じる際にデータをリセット
                  setMessages([]);
                  setCurrentInvoiceData({ items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 });
                  setSessionId(null);
                  setError(null);
                  onClose();
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  downloadConversationLog();
                }}
                disabled={messages.length <= 1} // 初期メッセージのみの場合は無効
                title="会話ログをダウンロード"
              >
                <Download className="mr-2 h-4 w-4" />
                ログ
              </Button>
            </div>
            <Button
              onClick={(e) => {
                e.preventDefault();
                completeConversation();
              }}
              disabled={!currentInvoiceData || (!currentInvoiceData.customerName && (!currentInvoiceData.items || currentInvoiceData.items.length === 0))}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              会話を終了して確定
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}