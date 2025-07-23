'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  MessageSquare,
  Minimize2,
  Maximize2,
  AlertCircle,
  Trash2,
  History,
  Info,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Document {
  id: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  partner_name: string;
  total_amount: number;
  tax_amount: number;
  status: string;
  notes?: string;
  // OCR関連フィールド
  vendor_name?: string;
  receipt_date?: string;
  category?: string;
  // 駐車場情報
  receipt_type?: 'parking' | 'general';
  facility_name?: string;
  entry_time?: string;
  exit_time?: string;
  parking_duration?: string;
  items?: Array<{
    item_name: string;
    amount: number;
  }>;
}

interface DocumentAIChatProps {
  document: Document;
  documentId: string;
}

const documentTypeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書'
};

export default function DocumentAIChat({ document, documentId }: DocumentAIChatProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryInfo, setShowHistoryInfo] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // LocalStorageのキー
  const STORAGE_KEY = `document_chat_${documentId}`;

  // LocalStorageから履歴を読み込む関数
  const loadChatHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // タイムスタンプをDateオブジェクトに変換
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        return messagesWithDates;
      }
    } catch (error) {
      logger.error('Failed to load chat history:', error);
    }
    return [];
  };

  // LocalStorageに履歴を保存する関数
  const saveChatHistory = (messagesToSave: Message[]) => {
    try {
      // 最新の50件のみ保存（ストレージ容量対策）
      const recentMessages = messagesToSave.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentMessages));
    } catch (error) {
      logger.error('Failed to save chat history:', error);
      // ストレージがいっぱいの場合は古い履歴を削除
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          // すべての文書チャット履歴を取得して、古いものから削除
          const keys = Object.keys(localStorage).filter(key => key.startsWith('document_chat_'));
          if (keys.length > 0) {
            // 最も古いキーを削除
            localStorage.removeItem(keys[0]);
            // 再度保存を試みる
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave.slice(-50)));
          }
        } catch (retryError) {
          logger.error('Failed to save after cleanup:', retryError);
        }
      }
    }
  };

  // 古い履歴を削除する関数（30日以上前のメッセージを削除）
  const cleanOldHistory = () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // すべての文書チャット履歴のキーを取得
      const keys = Object.keys(localStorage).filter(key => key.startsWith('document_chat_'));
      
      keys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const messages = JSON.parse(stored);
            if (messages.length > 0) {
              const lastMessageDate = new Date(messages[messages.length - 1].timestamp);
              // 最後のメッセージが30日以上前の場合は削除
              if (lastMessageDate < thirtyDaysAgo) {
                localStorage.removeItem(key);
                logger.info(`Removed old chat history: ${key}`);
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to clean history for key ${key}:`, error);
          // エラーが発生したキーは削除
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.error('Failed to clean old histories:', error);
    }
  };

  // 初期化時にLocalStorageから履歴を読み込む
  useEffect(() => {
    // 古い履歴のクリーンアップ（初回のみ）
    cleanOldHistory();
    
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    } else {
      // 新規の場合は初期メッセージを設定
      const docType = documentTypeLabels[document.document_type as keyof typeof documentTypeLabels];
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `こんにちは！${docType}「${document.document_number}」について質問をお受けします。

この文書に関して、以下のような質問にお答えできます：
• この${document.document_type === 'receipt' ? '領収書' : '文書'}の内容について詳しく教えてください
• 税務上の扱いはどうなりますか？
• 仕訳を作成する際の注意点は？
${document.receipt_type === 'parking' ? '• 駐車場代の経費計上について教えてください' : ''}
• この金額の妥当性を確認できますか？`,
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    }
  }, [documentId, document]); // documentIdまたはdocumentが変わったときにも再読み込み

  // メッセージが更新されたらLocalStorageに保存
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // メッセージ送信処理
  const sendMessage = async () => {
    const messageText = input.trim();
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
      const response = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          documentData: document,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '処理中にエラーが発生しました');
      }

      const result = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      logger.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : '予期しないエラーが発生しました');
      
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

  // エンターキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // チャット履歴をクリアする関数
  const clearChatHistory = () => {
    if (confirm('この文書のチャット履歴をすべて削除しますか？\nこの操作は取り消せません。')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        // 初期メッセージを再設定
        const docType = documentTypeLabels[document.document_type as keyof typeof documentTypeLabels];
        const initialMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `こんにちは！${docType}「${document.document_number}」について質問をお受けします。

この文書に関して、以下のような質問にお答えできます：
• この${document.document_type === 'receipt' ? '領収書' : '文書'}の内容について詳しく教えてください
• 税務上の扱いはどうなりますか？
• 仕訳を作成する際の注意点は？
${document.receipt_type === 'parking' ? '• 駐車場代の経費計上について教えてください' : ''}
• この金額の妥当性を確認できますか？`,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
        setError(null);
      } catch (error) {
        logger.error('Failed to clear chat history:', error);
        setError('履歴のクリアに失敗しました');
      }
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="bg-purple-50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">この{documentTypeLabels[document.document_type as keyof typeof documentTypeLabels]}について質問する</CardTitle>
            {messages.length > 1 && (
              <div 
                className="flex items-center gap-1 text-xs text-gray-500 cursor-help"
                onMouseEnter={() => setShowHistoryInfo(true)}
                onMouseLeave={() => setShowHistoryInfo(false)}
              >
                <History className="h-3 w-3" />
                <span>{messages.length - 1}件の会話</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isExpanded && messages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearChatHistory();
                }}
                className="h-8 w-8 text-gray-500 hover:text-red-600"
                title="チャット履歴をクリア"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="h-8 w-8"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {!isExpanded && (
          <p className="text-sm text-gray-600 mt-2">
            クリックして展開し、文書について質問する
          </p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-0">
          <div className="flex flex-col" style={{ height: '500px' }}>
            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive" className="m-3 mb-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 履歴保存情報 */}
            {showHistoryInfo && (
              <Alert className="m-3 mb-0">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  チャット履歴はブラウザに保存され、最新50件まで保持されます。
                  30日以上前の履歴は自動的に削除されます。
                </AlertDescription>
              </Alert>
            )}

            {/* チャットメッセージエリア */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-3">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {format(message.timestamp, 'HH:mm', { locale: ja })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* 入力エリア */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="質問を入力してください..."
                  disabled={isLoading}
                  className="flex-1 text-sm bg-white"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}