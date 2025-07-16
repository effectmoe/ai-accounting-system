'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  X,
  BookOpen,
  Clock,
  Plus,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface SimpleKnowledgeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

export default function SimpleKnowledgeDialog({
  isOpen,
  onClose,
  title = "税務・会計ナレッジチャット",
  placeholder = "税務や会計に関する質問を入力してください"
}: SimpleKnowledgeDialogProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFaqSaveDialog, setShowFaqSaveDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isNewChat, setIsNewChat] = useState(true);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && !sessionId) {
      // 新規チャットを開始
      setIsNewChat(true);
      // sessionIdは最初のメッセージ送信時にサーバーから取得
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setIsTyping(true);

    try {
      const response = await fetch('/api/knowledge/analyze-chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          sessionId,
          includeKnowledge: true,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error('ネットワークエラーが発生しました');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setIsTyping(false);
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.content) {
                  // サーバーから送られてくる content は既に累積されているので、そのまま使用
                  accumulatedContent = parsed.content;
                  
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isTyping) {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: accumulatedContent }
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: `msg_${Date.now()}`,
                          role: 'assistant' as const,
                          content: accumulatedContent,
                          timestamp: new Date(),
                          isTyping: true
                        }
                      ];
                    }
                  });
                }
                
                // セッションIDが返された場合は更新
                if (parsed.sessionId && isNewChat) {
                  console.log('[simple-knowledge-dialog] サーバーからセッションID取得:', parsed.sessionId);
                  setSessionId(parsed.sessionId);
                  setIsNewChat(false);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_final`,
        role: 'assistant',
        content: accumulatedContent,
        timestamp: new Date()
      };

      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isTyping);
        return [...filtered, assistantMessage];
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`回答の生成に失敗しました: ${errorMessage}`);
      console.error('Chat error details:', {
        error: err,
        sessionId,
        messagesCount: messages.length
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/chat-history/list?category=tax');
      if (response.ok) {
        const data = await response.json();
        console.log('[simple-knowledge-dialog] 取得した履歴:', data.sessions?.length || 0, '件');
        setChatHistory(data.sessions || []);
      } else {
        console.error('履歴の取得に失敗しました');
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      await loadChatHistory();
    }
    setShowHistory(!showHistory);
  };

  const loadHistorySession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionId}`);
      console.log('[simple-knowledge-dialog] 履歴セッション読込みレスポンス:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[simple-knowledge-dialog] 履歴セッションデータ:', result);
        
        if (result.success && result.data) {
          const sessionData = result.data;
          
          // messagesフィールドがあるか確認
          if (sessionData.messages && Array.isArray(sessionData.messages)) {
            const formattedMessages = sessionData.messages.map((msg: any) => ({
              id: msg.id || msg._id || `msg_${Date.now()}_${Math.random()}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(formattedMessages);
            setSessionId(sessionData.sessionId || sessionId);
            setIsNewChat(false); // 既存セッションを読み込んだのでfalseに
            setShowHistory(false);
          } else {
            console.warn('セッションにメッセージが含まれていません');
          }
        }
      } else {
        const errorData = await response.json();
        console.error('履歴セッション読込みエラー:', errorData);
      }
    } catch (error) {
      console.error('履歴セッション読込みエラー:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveToFaq = (message: Message) => {
    console.log('FAQ保存が要求されました:', message);
    setSelectedMessage(message);
    setShowFaqSaveDialog(true);
  };

  const confirmSaveToFaq = async () => {
    if (!selectedMessage) return;
    
    try {
      const questionMessage = messages.find(m => m.role === 'user' && m.timestamp <= selectedMessage.timestamp);
      const requestData = {
        question: questionMessage?.content || '',
        answer: selectedMessage.content,
        sessionId,
        timestamp: selectedMessage.timestamp
      };
      
      console.log('FAQ保存リクエスト開始:', requestData);
      
      const response = await fetch('/api/faq/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('FAQ保存レスポンス:', response.status, response.statusText);
      
      const responseData = await response.json();
      console.log('FAQ保存レスポンスデータ:', responseData);

      if (response.ok) {
        console.log('FAQ保存成功:', responseData.id);
        alert('FAQに保存されました！');
      } else {
        console.error('FAQ保存失敗:', responseData.error);
        alert(`FAQの保存に失敗しました: ${responseData.error}`);
      }
    } catch (error) {
      console.error('FAQ保存エラー:', error);
      alert('FAQ保存中にエラーが発生しました。詳細はコンソールを確認してください。');
    } finally {
      setShowFaqSaveDialog(false);
      setSelectedMessage(null);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">税務・会計の専門知識でサポート</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // 新規チャットを開始
                setSessionId('');
                setMessages([]);
                setIsNewChat(true);
                setShowHistory(false);
              }}
              className="hover:bg-white/50"
              title="新規チャット"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHistory}
              className="hover:bg-white/50"
              disabled={isLoadingHistory}
            >
              <Clock className="w-4 h-4 mr-2" />
              {isLoadingHistory ? '読込中...' : '履歴'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex flex-1 overflow-hidden">
          {/* 履歴パネル */}
          {showHistory && (
            <div className="border-r bg-gray-50 overflow-hidden flex flex-col w-80">
              <div className="p-4 border-b bg-white">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">チャット履歴</h4>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="履歴を検索..."
                    className="pl-10 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                {isLoadingHistory ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    履歴を読込中...
                  </div>
                ) : chatHistory.length > 0 ? (
                  <div className="p-2 space-y-2">
                    {chatHistory.map((session) => (
                      <div
                        key={session._id}
                        onClick={() => loadHistorySession(session._id)}
                        className="p-3 bg-white rounded-lg shadow-sm border hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {session.title || `セッション ${session._id.slice(-6)}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(session.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {session.messageCount || 0} メッセージ
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    履歴はまだありません
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
          
          {/* メッセージエリア */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3 group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-gray-600 to-gray-800' 
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    } shadow-md`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'あなた' : 'AIアシスタント'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(message.timestamp, 'HH:mm', { locale: ja })}
                        </span>
                        {message.role === 'assistant' && !message.isTyping && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveToFaq(message)}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            FAQに保存
                          </Button>
                        )}
                      </div>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-gray-100' 
                          : 'bg-gradient-to-r from-blue-50 to-purple-50'
                      }`}>
                        {message.isTyping ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-gray-600 animate-pulse">
                              回答を生成中...
                            </span>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && !isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">AIアシスタント</span>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-600">ナレッジを検索して回答を生成中...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* エラー表示 */}
            {error && (
              <div className="p-4 border-t">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* 入力エリア */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="resize-none"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500">
                  Enter で送信 • Shift+Enter で改行
                </div>
                <div className="text-xs text-gray-400">
                  {sessionId ? `Session: ${sessionId.slice(-8)}` : 'New Session'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ保存確認ダイアログ */}
        {showFaqSaveDialog && selectedMessage && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">FAQに保存しますか？</h3>
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">質問:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {messages.find(m => m.role === 'user' && m.timestamp <= selectedMessage.timestamp)?.content || '質問が見つかりません'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">回答:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    {selectedMessage.content}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFaqSaveDialog(false);
                    setSelectedMessage(null);
                  }}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={confirmSaveToFaq}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}