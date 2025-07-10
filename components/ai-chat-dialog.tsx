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
  X
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
  const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(initialInvoiceData || {});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期メッセージの設定
  useEffect(() => {
    if (isOpen && messages.length === 0) {
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
  }, [isOpen, mode]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

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

      const response = await fetch('/api/invoices/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: userMessage.content,
          conversationHistory,
          sessionId,
          currentInvoiceData,
          mode
        })
      });

      if (!response.ok) {
        throw new Error('会話の処理に失敗しました');
      }

      const result = await response.json();

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
        setCurrentInvoiceData(result.data);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError('メッセージの送信に失敗しました');
      
      // エラーメッセージを追加
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '申し訳ございません。処理中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 会話を完了して請求書データを確定
  const completeConversation = () => {
    if (currentInvoiceData && Object.keys(currentInvoiceData).length > 0) {
      onComplete(currentInvoiceData);
    } else {
      setError('請求書データがまだ作成されていません。');
    }
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
        {currentInvoiceData && Object.keys(currentInvoiceData).length > 0 && (
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
              {currentInvoiceData.totalAmount && (
                <p>合計: ¥{currentInvoiceData.totalAmount.toLocaleString()}</p>
              )}
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
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                completeConversation();
              }}
              disabled={!currentInvoiceData || Object.keys(currentInvoiceData).length === 0}
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