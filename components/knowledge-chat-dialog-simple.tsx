'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
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
  MessageSquare,
  X,
  Mic,
  MicOff,
  BookOpen,
  Filter,
  ExternalLink,
  Star,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  ChevronRight,
  Clock,
  Calendar,
  Hash,
  RefreshCw,
  Trash2,
  FolderOpen,
  Download,
  Info,
  Archive,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { KnowledgeChatSession } from '@/types/collections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EnhancedKnowledgeChatDialogProps {
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
  knowledgeUsed?: KnowledgeItem[];
  responseTime?: number;
  isFAQCandidate?: boolean;
}

interface KnowledgeItem {
  id: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  contentType: 'article' | 'regulation' | 'case' | 'news' | 'guide' | 'other';
  tags: string[];
  sourceUrl?: string;
  lastUpdated?: Date;
  isVerified?: boolean;
}

const getContentTypeIcon = (type: string) => {
  switch (type) {
    case 'article': return '📄';
    case 'regulation': return '⚖️';
    case 'case': return '📋';
    case 'news': return '📰';
    case 'guide': return '📚';
    default: return '📌';
  }
};

const getContentTypeLabel = (type: string) => {
  switch (type) {
    case 'article': return '記事';
    case 'regulation': return '法令';
    case 'case': return '事例';
    case 'news': return 'ニュース';
    case 'guide': return 'ガイド';
    default: return 'その他';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'tax': return '税務相談';
    case 'accounting': return '会計相談';
    case 'journal': return '仕訳相談';
    case 'mixed': return '総合相談';
    default: return category;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'tax': return 'text-blue-600 bg-blue-50';
    case 'accounting': return 'text-green-600 bg-green-50';
    case 'journal': return 'text-purple-600 bg-purple-50';
    case 'mixed': return 'text-orange-600 bg-orange-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export default function EnhancedKnowledgeChatDialog({
  isOpen,
  onClose,
  title = "税務・会計ナレッジチャット",
  placeholder = "税務や会計に関する質問を入力してください"
}: EnhancedKnowledgeChatDialogProps) {
  // ステート管理
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [expandedKnowledge, setExpandedKnowledge] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [faqDialogMessageId, setFaqDialogMessageId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<KnowledgeChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<KnowledgeChatSession | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  
  // 音声入力関連
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  
  // フィルター関連
  const [filters, setFilters] = useState({
    contentType: 'all',
    dateRange: 'all',
    verifiedOnly: false
  });
  
  // 設定関連
  const [multiLine, setMultiLine] = useState(false);
  
  // ref
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // セッション初期化
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
      loadSessions();
    }
  }, [isOpen]);

  // 新規セッション作成
  const initializeSession = async (category: 'tax' | 'accounting' | 'journal' | 'mixed' = 'mixed') => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category,
          title: `${getCategoryLabel(category)} - ${new Date().toLocaleDateString()}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      
      const data = await response.json();
      setSessionId(data.data.sessionId);
      setCurrentSession(data.data);
      setMessages([]);
      setShowNewSessionDialog(false);
    } catch (err) {
      console.error('Failed to initialize session:', err);
      // フォールバック: ローカルセッションID生成
      const fallbackId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(fallbackId);
    }
  };

  // セッション一覧読み込み
  const loadSessions = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'active',
        limit: '50',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/chat-history?${params}`);
      if (!response.ok) throw new Error('Failed to load sessions');
      
      const data = await response.json();
      setSessions(data.data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // セッション切り替え
  const switchSession = async (session: KnowledgeChatSession) => {
    try {
      const response = await fetch(`/api/chat-history/${session.sessionId}/messages`);
      if (!response.ok) throw new Error('Failed to load messages');
      
      const data = await response.json();
      setMessages(data.data || []);
      setCurrentSession(session);
      setSessionId(session.sessionId);
    } catch (err) {
      console.error('Failed to switch session:', err);
    }
  };

  // セッション削除
  const deleteSession = async (sessionIdToDelete: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionIdToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete session');
      
      // 現在のセッションが削除された場合は新規作成
      if (sessionIdToDelete === sessionId) {
        initializeSession();
      }
      
      loadSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // アーカイブ
  const archiveSession = async (sessionIdToArchive: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionIdToArchive}/archive`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to archive session');
      
      loadSessions();
    } catch (err) {
      console.error('Failed to archive session:', err);
    }
  };

  // ブックマーク切り替え
  const toggleBookmark = async (sessionIdToToggle: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionIdToToggle}/bookmark`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to toggle bookmark');
      
      loadSessions();
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // メッセージ送信
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
      const startTime = Date.now();
      
      // APIリクエスト
      const response = await fetch('/api/knowledge-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          filters,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('ネットワークエラーが発生しました');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let knowledgeUsed: KnowledgeItem[] = [];
      let detectedCategory = 'mixed';

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
                
                // カテゴリ検出
                if (parsed.category) {
                  detectedCategory = parsed.category;
                }
                
                // ナレッジ情報
                if (parsed.knowledgeUsed) {
                  knowledgeUsed = parsed.knowledgeUsed;
                }
                
                // 提案質問
                if (parsed.suggestedQuestions) {
                  setSuggestedQuestions(parsed.suggestedQuestions);
                }
                
                // コンテンツ
                if (parsed.content) {
                  accumulatedContent = parsed.content;
                  
                  // アシスタントメッセージを更新または追加
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
                          isTyping: true,
                          knowledgeUsed,
                          responseTime: Date.now() - startTime
                        }
                      ];
                    }
                  });
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      // 最終的なメッセージを確定
      const responseTime = Date.now() - startTime;
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_final`,
        role: 'assistant',
        content: accumulatedContent,
        timestamp: new Date(),
        knowledgeUsed,
        responseTime,
        isFAQCandidate: true
      };

      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isTyping);
        return [...filtered, assistantMessage];
      });

      // チャット履歴に保存
      try {
        await fetch(`/api/chat-history/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [userMessage, assistantMessage]
          })
        });

        // カテゴリ更新
        if (detectedCategory !== currentSession?.category) {
          await fetch(`/api/chat-history/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: detectedCategory })
          });
        }
      } catch (err) {
        console.error('Failed to save messages:', err);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // FAQ追加
  const handleAddToFAQ = async () => {
    if (!faqDialogMessageId) return;
    
    const message = messages.find(m => m.id === faqDialogMessageId);
    if (!message) return;
    
    const prevMessage = messages[messages.findIndex(m => m.id === faqDialogMessageId) - 1];
    
    try {
      const response = await fetch('/api/faq/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prevMessage?.content || '',
          answer: message.content,
          category: currentSession?.category || 'mixed',
          tags: ['税務相談', 'AI生成'],
          sessionId
        })
      });
      
      if (!response.ok) throw new Error('Failed to add to FAQ');
      
      setFaqDialogMessageId(null);
    } catch (err) {
      console.error('Failed to add to FAQ:', err);
      setError('FAQの追加に失敗しました');
    }
  };

  // メッセージコピー
  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // ナレッジ展開
  const toggleKnowledgeExpansion = (knowledgeId: string) => {
    setExpandedKnowledge(prev => {
      const newSet = new Set(prev);
      if (newSet.has(knowledgeId)) {
        newSet.delete(knowledgeId);
      } else {
        newSet.add(knowledgeId);
      }
      return newSet;
    });
  };

  // 音声入力初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognitionInstance = new (window as any).webkitSpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'ja-JP';

      recognitionInstance.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setInput(transcript);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // 音声入力トグル
  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

  // スクロール制御
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // キーボードショートカット
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (multiLine && !e.shiftKey) {
        return;
      }
      if (!multiLine && e.shiftKey) {
        setMultiLine(true);
        return;
      }
      if (!e.shiftKey || !multiLine) {
        e.preventDefault();
        sendMessage();
      }
    }
  };

  // セッション検索フィルタリング
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery) return sessions;
    
    const query = historySearchQuery.toLowerCase();
    return sessions.filter(session => 
      session.title.toLowerCase().includes(query) ||
      session.category.toLowerCase().includes(query) ||
      session.specialization?.primaryDomain.toLowerCase().includes(query) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(query))
    );
  }, [sessions, historySearchQuery]);

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
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">税務・会計の専門知識でサポート</p>
                  {currentSession && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getCategoryColor(currentSession.category))}
                    >
                      {getCategoryLabel(currentSession.category)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewSessionDialog(true)}
                className="hover:bg-white/50"
              >
                <Plus className="w-4 h-4 mr-2" />
                新規
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "hover:bg-white/50",
                  showHistory && "bg-white/70"
                )}
              >
                <Clock className="w-4 h-4 mr-2" />
                履歴
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "hover:bg-white/50",
                  showFilters && "bg-white/70"
                )}
              >
                <Filter className="w-4 h-4" />
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

          {/* フィルターパネル */}
          {showFilters && (
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">コンテンツタイプ</Label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.contentType}
                    onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value }))}
                  >
                    <option value="all">すべて</option>
                    <option value="article">記事</option>
                    <option value="regulation">法令</option>
                    <option value="case">事例</option>
                    <option value="news">ニュース</option>
                    <option value="guide">ガイド</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">期間</Label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  >
                    <option value="all">すべて</option>
                    <option value="today">今日</option>
                    <option value="week">今週</option>
                    <option value="month">今月</option>
                    <option value="year">今年</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                      className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">検証済みのみ</span>
                  </label>
                </div>
              </div>
            </div>
          )}

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
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="履歴を検索..."
                      className="pl-10 pr-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory('all');
                        loadSessions();
                      }}
                      className="text-xs"
                    >
                      すべて
                    </Button>
                    {['tax', 'accounting', 'journal', 'mixed'].map(cat => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedCategory(cat);
                          loadSessions();
                        }}
                        className="text-xs"
                      >
                        {getCategoryLabel(cat)}
                      </Button>
                    ))}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredSessions.length > 0 ? (
                      <div className="space-y-2">
                        {filteredSessions.map((session) => (
                          <div
                            key={session.sessionId}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              currentSession?.sessionId === session.sessionId
                                ? 'bg-blue-100 border border-blue-300'
                                : 'bg-white hover:bg-gray-100 border border-gray-200'
                            }`}
                            onClick={() => switchSession(session)}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <h5 className="text-sm font-medium text-gray-900 truncate flex-1">
                                {session.title}
                              </h5>
                              {session.isBookmarked && (
                                <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0 ml-1" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", getCategoryColor(session.category))}
                              >
                                {getCategoryLabel(session.category)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {session.messages.length}件
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(new Date(session.updatedAt), 'MM/dd HH:mm', { locale: ja })}
                            </p>
                            <div className="flex gap-1 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark(session.sessionId);
                                }}
                              >
                                <Star className={cn(
                                  "w-3 h-3",
                                  session.isBookmarked && "fill-current text-yellow-500"
                                )} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveSession(session.sessionId);
                                }}
                              >
                                <Archive className="w-3 h-3 text-gray-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.sessionId);
                                }}
                              >
                                <Trash2 className="w-3 h-3 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          {historySearchQuery ? '検索結果がありません' : '履歴がありません'}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* メッセージエリア */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className="flex gap-3 group"
                    >
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
                          {message.responseTime && (
                            <span className="text-xs text-gray-400">
                              • {(message.responseTime / 1000).toFixed(1)}秒
                            </span>
                          )}
                          {message.isFAQCandidate && message.role === 'assistant' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFaqDialogMessageId(message.id)}
                              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <BookOpen className="w-3 h-3 mr-1" />
                              FAQに保存
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content, message.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
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
                              <ReactMarkdown
                                components={{
                                  a: ({ href, children }) => (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                      {children}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ),
                                  code: ({ inline, children }) => (
                                    inline ? (
                                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                                        <code>{children}</code>
                                      </pre>
                                    )
                                  )
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          {/* 使用されたナレッジの表示 */}
                          {message.knowledgeUsed && message.knowledgeUsed.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <BookOpen className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">参考にしたナレッジ</span>
                                <Badge variant="secondary" className="text-xs">
                                  {message.knowledgeUsed.length}件
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {message.knowledgeUsed.map((knowledge, idx) => (
                                  <div 
                                    key={knowledge.id}
                                    className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs">
                                            {getContentTypeIcon(knowledge.contentType)}
                                          </span>
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {knowledge.title}
                                          </span>
                                          {knowledge.isVerified && (
                                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                              <Check className="w-3 h-3 mr-1" />
                                              検証済み
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                          <span className="flex items-center gap-1">
                                            <Hash className="w-3 h-3" />
                                            {getContentTypeLabel(knowledge.contentType)}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            関連度: {Math.round(knowledge.relevanceScore * 100)}%
                                          </span>
                                          {knowledge.lastUpdated && (
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3" />
                                              {format(new Date(knowledge.lastUpdated), 'yyyy/MM/dd')}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                          {knowledge.tags.slice(0, 3).map(tag => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                        {expandedKnowledge.has(knowledge.id) && (
                                          <div className="overflow-hidden">
                                            <p className="text-xs text-gray-600 mb-2">
                                              {knowledge.excerpt}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleKnowledgeExpansion(knowledge.id)}
                                          className="h-6 w-6 p-0"
                                        >
                                          {expandedKnowledge.has(knowledge.id) ? (
                                            <ChevronUp className="w-3 h-3" />
                                          ) : (
                                            <ChevronDown className="w-3 h-3" />
                                          )}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => window.open(knowledge.sourceUrl, '_blank')}
                                          className="h-6 w-6 p-0"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
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

          {/* 提案質問 */}
          {suggestedQuestions.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">関連する質問</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(question);
                      setSuggestedQuestions([]);
                    }}
                    className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    {question}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="p-4 border-t overflow-hidden">
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
                  className="resize-none pr-12"
                  rows={multiLine ? 3 : 1}
                  disabled={isLoading}
                />
                {recognition && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleListening}
                    disabled={isLoading}
                    className={cn(
                      "absolute right-2 bottom-2 h-8 w-8 p-0",
                      isListening && "text-red-600 animate-pulse"
                    )}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                )}
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
                {multiLine ? 'Shift+Enter で改行 • Cmd/Ctrl+Enter で送信' : 'Enter で送信 • Shift+Enter で改行'}
                {Object.keys(filters).length > 0 && ' • フィルター適用中'}
              </div>
              <div className="text-xs text-gray-400">
                Session: {sessionId.slice(-8)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FAQ追加確認ダイアログ */}
      {faqDialogMessageId && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  FAQに追加しますか？
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  この回答をFAQデータベースに追加して、今後の参考にすることができます。
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddToFAQ}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    追加する
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setFaqDialogMessageId(null)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    スキップ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 新規セッション作成ダイアログ */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新しいチャットを開始</DialogTitle>
            <DialogDescription>
              どのような相談をしますか？カテゴリを選択してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              variant="outline"
              onClick={() => initializeSession('tax')}
              className="h-auto py-4 px-3 flex flex-col items-center justify-center space-y-2 hover:bg-blue-50 hover:border-blue-300"
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">⚖️</span>
                  </div>
                  <span className="font-medium">税務相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  税金・申告に関する相談
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => initializeSession('accounting')}
              className="h-auto py-4 px-3 flex flex-col items-center justify-center space-y-2 hover:bg-green-50 hover:border-green-300"
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">📊</span>
                  </div>
                  <span className="font-medium">会計相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  会計処理・決算に関する相談
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => initializeSession('journal')}
              className="h-auto py-4 px-3 flex flex-col items-center justify-center space-y-2 hover:bg-purple-50 hover:border-purple-300"
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">📝</span>
                  </div>
                  <span className="font-medium">仕訳相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  仕訳・勘定科目に関する相談
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => initializeSession('mixed')}
              className="h-auto py-4 px-3 flex flex-col items-center justify-center space-y-2 hover:bg-orange-50 hover:border-orange-300"
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="font-medium">総合相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  税務・会計・仕訳全般の相談
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}