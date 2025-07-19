'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
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
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface KnowledgeArticle {
  id: string;
  title: string;
  sourceUrl: string;
  excerpt: string;
  relevanceScore: number;
  categories: string[];
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contentType: 'news' | 'guide' | 'case_study' | 'regulation' | 'faq' | 'opinion';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  knowledgeUsed?: KnowledgeArticle[];
}

interface KnowledgeFilters {
  categories?: string[];
  tags?: string[];
  sourceTypes?: string[];
  difficulty?: string;
  contentType?: string;
  verifiedOnly?: boolean;
}

interface KnowledgeChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  defaultFilters?: KnowledgeFilters;
}

export default function KnowledgeChatDialog({ 
  isOpen, 
  onClose, 
  title = "税務・会計ナレッジチャット",
  placeholder = "税務や会計に関する質問を入力してください...",
  defaultFilters = {}
}: KnowledgeChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<KnowledgeFilters>(defaultFilters);
  const [expandedKnowledge, setExpandedKnowledge] = useState<Set<string>>(new Set());
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期化
  useEffect(() => {
    if (isOpen && !sessionId) {
      setSessionId(generateSessionId());
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'こんにちは！税務・会計に関する質問にお答えします。消費税、法人税、会計処理、インボイス制度など、何でもお気軽にご相談ください。',
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // メッセージが追加されたときにスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // エンターキーでの送信
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, input]);

  const generateSessionId = () => {
    return `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/knowledge/analyze-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: userMessage.content,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          sessionId,
          includeKnowledge: true,
          knowledgeFilters: filters
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        knowledgeUsed: data.knowledgeUsed || []
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      logger.error('Knowledge chat error:', error);
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKnowledgeExpansion = (knowledgeId: string) => {
    const newExpanded = new Set(expandedKnowledge);
    if (newExpanded.has(knowledgeId)) {
      newExpanded.delete(knowledgeId);
    } else {
      newExpanded.add(knowledgeId);
    }
    setExpandedKnowledge(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'news': return '📰';
      case 'guide': return '📖';
      case 'case_study': return '💼';
      case 'regulation': return '⚖️';
      case 'faq': return '❓';
      case 'opinion': return '💭';
      default: return '📄';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
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
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-600"
            >
              <Filter className="w-4 h-4" />
              フィルター
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={filters.contentType || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, contentType: e.target.value || undefined }))}
                >
                  <option value="">すべて</option>
                  <option value="guide">ガイド</option>
                  <option value="news">ニュース</option>
                  <option value="regulation">規制・法令</option>
                  <option value="faq">FAQ</option>
                  <option value="case_study">事例</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium">難易度</Label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md text-sm"
                  value={filters.difficulty || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value || undefined }))}
                >
                  <option value="">すべて</option>
                  <option value="beginner">初級</option>
                  <option value="intermediate">中級</option>
                  <option value="advanced">上級</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">検証済みのみ</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* メッセージエリア */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
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
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    
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
                          {message.knowledgeUsed.map((knowledge) => (
                            <div key={knowledge.id} className="border border-gray-200 rounded-md p-3 bg-white">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs">
                                      {getContentTypeIcon(knowledge.contentType)}
                                    </span>
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {knowledge.title}
                                    </h4>
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                      <span className="text-xs text-gray-500">
                                        {Math.round(knowledge.relevanceScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getDifficultyColor(knowledge.difficulty)}`}
                                    >
                                      {knowledge.difficulty === 'beginner' ? '初級' : 
                                       knowledge.difficulty === 'intermediate' ? '中級' : '上級'}
                                    </Badge>
                                    {knowledge.tags.slice(0, 3).map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  {expandedKnowledge.has(knowledge.id) && (
                                    <p className="text-xs text-gray-600 mb-2">
                                      {knowledge.excerpt}
                                    </p>
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
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">AIアシスタント</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
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
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4"
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
              Enterで送信 • {Object.keys(filters).length > 0 ? 'フィルター適用中' : 'すべてのナレッジを検索'}
            </div>
            <div className="text-xs text-gray-400">
              Session: {sessionId.slice(-8)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}