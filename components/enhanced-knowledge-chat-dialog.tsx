'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
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
  Download,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  FileText,
  Share2,
  MoreVertical,
  Search,
  ChevronRight,
  Archive,
  Bookmark
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import TypingIndicator from '@/components/ui/typing-indicator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  feedback?: 'good' | 'bad';
  copied?: boolean;
  isStreaming?: boolean;
  faqGenerated?: boolean;
}

interface KnowledgeFilters {
  categories?: string[];
  tags?: string[];
  sourceTypes?: string[];
  difficulty?: string;
  contentType?: string;
  verifiedOnly?: boolean;
}

interface EnhancedKnowledgeChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placeholder?: string;
  defaultFilters?: KnowledgeFilters;
  enableVoiceInput?: boolean;
  enableStreaming?: boolean;
}

export default function EnhancedKnowledgeChatDialog({ 
  isOpen, 
  onClose, 
  title = "税務・会計ナレッジチャット",
  placeholder = "税務や会計に関する質問を入力してください...",
  defaultFilters = {},
  enableVoiceInput = true,
  enableStreaming = true
}: EnhancedKnowledgeChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<KnowledgeFilters>(defaultFilters);
  const [expandedKnowledge, setExpandedKnowledge] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [multiLine, setMultiLine] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初期化
  useEffect(() => {
    if (isOpen && !sessionId) {
      setSessionId(generateSessionId());
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'こんにちは！税務・会計に関する質問にお答えします。\n\n消費税、法人税、会計処理、インボイス制度など、何でもお気軽にご相談ください。',
        timestamp: new Date()
      }]);
      
      // 初期の提案質問
      setSuggestedQuestions([
        'インボイス制度について教えてください',
        '法人税の基本税率を教えてください',
        '減価償却の計算方法は？',
        '電子帳簿保存法の改正ポイント'
      ]);
    }
  }, [isOpen]);

  // メッセージが追加されたときにスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // 音声認識の初期化
  useEffect(() => {
    if (enableVoiceInput && typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enableVoiceInput]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Cmd/Ctrl + Enter で送信
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && input.trim()) {
        e.preventDefault();
        handleSendMessage();
      }
      
      // Shift + Enter で改行
      if (e.shiftKey && e.key === 'Enter') {
        setMultiLine(true);
      }
      
      // Escape でモーダルを閉じる
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, input, onClose]);

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
    setMultiLine(false);
    setIsLoading(true);
    setError(null);
    setSuggestedQuestions([]);

    try {
      if (enableStreaming) {
        // ストリーミング対応
        abortControllerRef.current = new AbortController();
        
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
            knowledgeFilters: filters,
            stream: true
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(true);

        if (reader) {
          let done = false;
          let buffer = '';

          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    done = true;
                    break;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, content: msg.content + parsed.content }
                          : msg
                      ));
                    }
                    if (parsed.knowledgeUsed) {
                      setMessages(prev => prev.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, knowledgeUsed: parsed.knowledgeUsed }
                          : msg
                      ));
                    }
                    if (parsed.suggestedQuestions) {
                      setSuggestedQuestions(parsed.suggestedQuestions);
                    }
                  } catch (e) {
                    console.error('Failed to parse SSE data:', e);
                  }
                }
              }
            }
          }
        }

        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, isStreaming: false }
            : msg
        ));
        
      } else {
        // 通常のレスポンス
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
        
        if (data.suggestedQuestions) {
          setSuggestedQuestions(data.suggestedQuestions);
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Knowledge chat error:', error);
        setError(error instanceof Error ? error.message : 'エラーが発生しました');
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'good' | 'bad') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));

    // フィードバックをサーバーに送信
    try {
      await fetch('/api/knowledge/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, sessionId, feedback })
      });
    } catch (error) {
      console.error('Failed to send feedback:', error);
    }
  };

  const handleGenerateFaq = async (messageId: string) => {
    // 対象のメッセージとその前のユーザーメッセージを取得
    const targetIndex = messages.findIndex(msg => msg.id === messageId);
    const assistantMessage = messages[targetIndex];
    const userMessage = messages[targetIndex - 1];
    
    if (!assistantMessage || !userMessage || userMessage.role !== 'user') {
      alert('FAQを生成するには、質問と回答のペアが必要です。');
      return;
    }
    
    try {
      const response = await fetch('/api/faq/generate-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatSessionId: sessionId,
          userMessage: userMessage.content,
          assistantMessage: assistantMessage.content,
          category: 'tax', // デフォルトカテゴリ
          quality: {
            accuracy: 90,
            completeness: 85,
            clarity: 88,
            usefulness: 87
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`FAQ記事が生成されました！\nカテゴリ: ${result.metadata.category}\n品質スコア: ${result.metadata.qualityScore}`);
        
        // メッセージにFAQ生成済みマークを追加
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, faqGenerated: true } : msg
        ));
      } else {
        alert('FAQ生成に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('FAQ generation error:', error);
      alert('FAQ生成中にエラーが発生しました。');
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const exportChat = () => {
    const content = messages
      .map(msg => `${msg.role === 'user' ? 'あなた' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${sessionId}_${format(new Date(), 'yyyyMMdd_HHmmss')}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  const toggleKnowledgeExpansion = (knowledgeId: string) => {
    const newExpanded = new Set(expandedKnowledge);
    if (newExpanded.has(knowledgeId)) {
      newExpanded.delete(knowledgeId);
    } else {
      newExpanded.add(knowledgeId);
    }
    setExpandedKnowledge(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ rotate: -180 }}
                animate={{ rotate: 0 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
              >
                <BookOpen className="w-6 h-6 text-white" />
              </motion.div>
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
                <Filter className="w-4 h-4 mr-1" />
                フィルター
                {Object.keys(filters).length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {Object.keys(filters).length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChat}
                className="text-gray-600"
                disabled={messages.length <= 1}
              >
                <Download className="w-4 h-4" />
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
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-b bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">コンテンツタイプ</Label>
                      <select 
                        className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.verifiedOnly || false}
                          onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                          className="mr-2 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">検証済みのみ</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* メッセージエリア */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex gap-3 group"
                  >
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15, delay: index * 0.05 + 0.1 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-gray-600 to-gray-800' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-600'
                      } shadow-md`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'あなた' : 'AIアシスタント'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {format(message.timestamp, 'HH:mm', { locale: ja })}
                        </span>
                        {message.role === 'assistant' && !message.isStreaming && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className="h-6 w-6 p-0"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, 'good')}
                              className={`h-6 w-6 p-0 ${message.feedback === 'good' ? 'text-green-600' : ''}`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, 'bad')}
                              className={`h-6 w-6 p-0 ${message.feedback === 'bad' ? 'text-red-600' : ''}`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        
                        {/* FAQ生成ボタン（アシスタントメッセージのみ） */}
                        {message.role === 'assistant' && !message.isStreaming && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateFaq(message.id)}
                            className={`h-6 w-6 p-0 ${message.faqGenerated ? 'text-green-600' : 'text-gray-400'}`}
                            title={message.faqGenerated ? 'FAQ生成済み' : 'FAQに保存'}
                          >
                            {message.faqGenerated ? <Bookmark className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                          </Button>
                        )}
                      </div>
                      <div className={`rounded-lg p-4 ${
                        message.role === 'user' 
                          ? 'bg-gray-100' 
                          : 'bg-gradient-to-r from-blue-50 to-purple-50'
                      }`}>
                        {message.isStreaming ? (
                          <div className="space-y-2">
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                      >
                                        {String(children).replace(/\n$/, '')}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    )
                                  }
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {isTyping && <TypingIndicator />}
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                code({node, inline, className, children, ...props}) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        
                        {/* 使用されたナレッジの表示 */}
                        {message.knowledgeUsed && message.knowledgeUsed.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="mt-4 pt-4 border-t border-gray-200"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800">参考にしたナレッジ</span>
                              <Badge variant="secondary" className="text-xs">
                                {message.knowledgeUsed.length}件
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {message.knowledgeUsed.map((knowledge, idx) => (
                                <motion.div 
                                  key={knowledge.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                                  className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                                >
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
                                      <AnimatePresence>
                                        {expandedKnowledge.has(knowledge.id) && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                          >
                                            <p className="text-xs text-gray-600 mb-2">
                                              {knowledge.excerpt}
                                            </p>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
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
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && !isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
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
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* 提案質問 */}
          <AnimatePresence>
            {suggestedQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-2 border-t bg-gray-50 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600 font-medium">関連する質問</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      onClick={() => {
                        setInput(question);
                        setSuggestedQuestions([]);
                      }}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors flex items-center gap-1"
                    >
                      {question}
                      <ChevronRight className="w-3 h-3" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* エラー表示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 border-t overflow-hidden"
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 入力エリア */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  disabled={isLoading}
                  rows={multiLine ? 3 : 1}
                  className="w-full resize-none pr-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !multiLine) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                {enableVoiceInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleVoiceInput}
                    className={`absolute right-2 bottom-2 h-8 w-8 p-0 ${isListening ? 'text-red-600' : 'text-gray-400'}`}
                    disabled={isLoading}
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
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}