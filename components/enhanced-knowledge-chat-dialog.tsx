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
  Bookmark,
  History,
  Clock,
  Calendar,
  Trash2,
  FolderOpen,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import TypingIndicator from '@/components/ui/typing-indicator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { KnowledgeChatSession, ChatMessage as ChatMessageType } from '@/types/collections';

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

interface Message extends Omit<ChatMessageType, 'metadata'> {
  knowledgeUsed?: KnowledgeArticle[];
  feedback?: 'good' | 'bad';
  copied?: boolean;
  showFaqDialog?: boolean;
  metadata?: ChatMessageType['metadata'] & {
    knowledgeUsed?: KnowledgeArticle[];
  };
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
  // セッション管理状態
  const [currentSession, setCurrentSession] = useState<KnowledgeChatSession | null>(null);
  const [sessions, setSessions] = useState<KnowledgeChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionCategory, setSessionCategory] = useState<'tax' | 'accounting' | 'journal' | 'mixed'>('mixed');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
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
  const [faqDialogMessageId, setFaqDialogMessageId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初期化
  useEffect(() => {
    if (isOpen && !sessionId) {
      // 過去のセッションを読み込み
      loadSessions();
      // 新しいセッションを作成
      createNewSession();
    }
  }, [isOpen]);

  // セッション作成関数
  const createNewSession = async (category: 'tax' | 'accounting' | 'journal' | 'mixed' = 'mixed') => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `税務・会計相談 ${new Date().toLocaleDateString()}`,
          userId: undefined // TODO: ユーザーIDの実装
        })
      });

      if (!response.ok) throw new Error('Failed to create session');

      const result = await response.json();
      const session: KnowledgeChatSession = {
        ...result.data,
        category,
        specialization: {
          primaryDomain: category === 'tax' ? '税務' : category === 'accounting' ? '会計' : category === 'journal' ? '仕訳' : '総合',
          subDomains: [],
          detectedTopics: []
        },
        knowledgeContext: {
          searchFilters: filters,
          relevantArticles: [],
          faqCandidates: []
        }
      };

      setCurrentSession(session);
      setSessionId(session.sessionId);
      setSessionCategory(category);
      
      // 初期メッセージを設定
      const initialMessage = getInitialMessage(category);
      setMessages([{
        id: '1',
        role: 'assistant',
        content: initialMessage.content,
        timestamp: new Date(),
        isComplete: true
      }]);
      
      // 提案質問を設定
      setSuggestedQuestions(initialMessage.suggestions);
    } catch (error) {
      console.error('Failed to create session:', error);
      // フォールバック
      setSessionId(generateSessionId());
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'こんにちは！税務・会計に関する質問にお答えします。',
        timestamp: new Date(),
        isComplete: true
      }]);
    }
  };

  // カテゴリ別の初期メッセージ
  const getInitialMessage = (category: 'tax' | 'accounting' | 'journal' | 'mixed') => {
    switch (category) {
      case 'tax':
        return {
          content: 'こんにちは！税務相談アシスタントです。\n\n法人税、消費税、所得税、インボイス制度など、税務に関するご質問にお答えします。',
          suggestions: [
            'インボイス制度の概要を教えて',
            '法人税率の最新情報',
            '消費税の軽減税率制度について',
            '電子帳簿保存法の要件'
          ]
        };
      case 'accounting':
        return {
          content: 'こんにちは！会計処理アシスタントです。\n\n会計基準、減価償却、引当金、財務諸表など、会計処理に関するご質問にお答えします。',
          suggestions: [
            '減価償却の計算方法',
            '貸倒引当金の設定基準',
            '収益認識基準について',
            '棚卸資産の評価方法'
          ]
        };
      case 'journal':
        return {
          content: 'こんにちは！仕訳・勘定科目アシスタントです。\n\n仕訳処理、勘定科目の選定、複式簿記など、経理処理に関するご質問にお答えします。',
          suggestions: [
            '売上計上の仕訳例',
            '経費精算の勘定科目',
            '消費税の仕訳処理',
            '固定資産購入の仕訳'
          ]
        };
      default:
        return {
          content: 'こんにちは！税務・会計総合アシスタントです。\n\n税務、会計処理、仕訳、勘定科目など、幅広いご質問にお答えします。どのようなことでもお気軽にご相談ください。',
          suggestions: [
            'インボイス制度について教えて',
            '減価償却の計算方法',
            '売上計上の仕訳例',
            '法人税の基本税率'
          ]
        };
    }
  };

  // セッション履歴の読み込み
  const loadSessions = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/chat-history?limit=50&status=active');
      if (!response.ok) throw new Error('Failed to load sessions');
      
      const result = await response.json();
      if (result.success && result.data) {
        setSessions(result.data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

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
      timestamp: new Date(),
      isComplete: true
    };

    // セッションにメッセージを保存
    if (currentSession) {
      try {
        console.log('[Chat Component] Saving message to session:', currentSession.sessionId);
        console.log('[Chat Component] Current session:', currentSession);
        const response = await fetch(`/api/chat-history/${currentSession.sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'user',
            content: input.trim()
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('[Chat Component] Failed to save message:', error);
        } else {
          console.log('[Chat Component] Message saved successfully');
        }
      } catch (error) {
        console.error('[Chat Component] Failed to save message:', error);
      }
    } else {
      console.log('[Chat Component] No current session, skipping message save');
    }

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
          isStreaming: true,
          isComplete: false
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
            ? { ...msg, isStreaming: false, isComplete: true }
            : msg
        ));
        
        // ストリーミング完了後にFAQ追加確認ダイアログを表示
        setFaqDialogMessageId(assistantMessage.id);
        
        // アシスタントメッセージをセッションに保存
        if (currentSession) {
          const finalMessage = messages.find(m => m.id === assistantMessage.id);
          if (finalMessage) {
            try {
              await fetch(`/api/chat-history/${currentSession.sessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  role: 'assistant',
                  content: finalMessage.content,
                  metadata: {
                    knowledgeUsed: finalMessage.knowledgeUsed,
                    responseTime: Date.now() - userMessage.timestamp.getTime()
                  }
                })
              });
              
              // カテゴリ検出と更新
              await detectAndUpdateCategory(finalMessage.content);
            } catch (error) {
              console.error('Failed to save assistant message:', error);
            }
          }
        }
        
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
          knowledgeUsed: data.knowledgeUsed || [],
          isComplete: true
        };
        
        // アシスタントメッセージをセッションに保存
        if (currentSession) {
          try {
            await fetch(`/api/chat-history/${currentSession.sessionId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: 'assistant',
                content: data.response,
                metadata: {
                  knowledgeUsed: data.knowledgeUsed || [],
                  responseTime: Date.now() - userMessage.timestamp.getTime()
                }
              })
            });
            
            // カテゴリ検出と更新
            await detectAndUpdateCategory(data.response);
          } catch (error) {
            console.error('Failed to save assistant message:', error);
          }
        }

        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.suggestedQuestions) {
          setSuggestedQuestions(data.suggestedQuestions);
        }
        
        // 非ストリーミング完了後にもFAQ追加確認ダイアログを表示
        setFaqDialogMessageId(assistantMessage.id);
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
        
        // FAQ確認ダイアログを非表示
        setFaqDialogMessageId(null);
      } else {
        alert('FAQ生成に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('FAQ generation error:', error);
      alert('FAQ生成中にエラーが発生しました。');
    }
  };

  const handleFaqDialogSkip = () => {
    setFaqDialogMessageId(null);
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

  // カテゴリ検出と更新
  const detectAndUpdateCategory = async (content: string) => {
    if (!currentSession) return;
    
    // キーワードベースのカテゴリ検出
    const taxKeywords = ['税務', '税金', '法人税', '消費税', '所得税', 'インボイス', '税率', '納税'];
    const accountingKeywords = ['会計', '経理', '減価償却', '引当金', '財務諸表', '損益計算', '貸借対照表'];
    const journalKeywords = ['仕訳', '勘定科目', '複式簿記', '借方', '貸方', '伝票'];
    
    const contentLower = content.toLowerCase();
    let detectedCategories = [];
    
    if (taxKeywords.some(keyword => content.includes(keyword))) {
      detectedCategories.push('tax');
    }
    if (accountingKeywords.some(keyword => content.includes(keyword))) {
      detectedCategories.push('accounting');
    }
    if (journalKeywords.some(keyword => content.includes(keyword))) {
      detectedCategories.push('journal');
    }
    
    // カテゴリ更新
    let newCategory = sessionCategory;
    if (detectedCategories.length === 1) {
      newCategory = detectedCategories[0] as typeof sessionCategory;
    } else if (detectedCategories.length > 1) {
      newCategory = 'mixed';
    }
    
    if (newCategory !== sessionCategory) {
      setSessionCategory(newCategory);
      // TODO: セッションのカテゴリを更新するAPIコール
    }
  };

  // セッション切り替え
  const switchSession = async (session: KnowledgeChatSession) => {
    // 現在のセッションを保存
    if (currentSession && messages.length > 1) {
      await updateSessionTitle(currentSession.sessionId);
    }
    
    // 新しいセッションを読み込み
    setCurrentSession(session);
    setSessionId(session.sessionId);
    setSessionCategory(session.category);
    
    // メッセージを復元
    const sessionMessages = session.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(sessionMessages);
    
    // フィルターを復元
    if (session.knowledgeContext?.searchFilters) {
      setFilters(session.knowledgeContext.searchFilters);
    }
    
    setShowHistory(false);
  };

  // セッションタイトルの更新
  const updateSessionTitle = async (sessionId: string) => {
    try {
      await fetch(`/api/chat-history/${sessionId}/title`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  };

  // セッション削除
  const deleteSession = async (sessionId: string, permanent = false) => {
    try {
      const response = await fetch(`/api/chat-history?sessionId=${sessionId}&permanent=${permanent}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // セッションリストから削除
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        
        // 現在のセッションが削除された場合は新しいセッションを作成
        if (currentSession?.sessionId === sessionId) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // セッションアーカイブ
  const archiveSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionId}/archive`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // セッションリストから削除
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        
        // 現在のセッションがアーカイブされた場合は新しいセッションを作成
        if (currentSession?.sessionId === sessionId) {
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to archive session:', error);
    }
  };

  // セッションブックマーク
  const toggleBookmark = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-history/${sessionId}/bookmark`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // セッションリストを更新
        setSessions(prev => prev.map(s => 
          s.sessionId === sessionId 
            ? { ...s, isBookmarked: !s.isBookmarked }
            : s
        ));
        
        // 現在のセッションも更新
        if (currentSession?.sessionId === sessionId) {
          setCurrentSession(prev => prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null);
        }
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // フィルタリングされたセッション
  const filteredSessions = useMemo(() => {
    if (!historySearchQuery) return sessions;
    
    const query = historySearchQuery.toLowerCase();
    return sessions.filter(session => 
      session.title.toLowerCase().includes(query) ||
      session.category.includes(query) ||
      session.specialization?.primaryDomain.toLowerCase().includes(query) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(query))
    );
  }, [sessions, historySearchQuery]);

  if (!isOpen) return null;

  return (
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
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">税務・会計の専門知識でサポート</p>
                  {currentSession && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        sessionCategory === 'tax' ? 'border-green-500 text-green-700' :
                        sessionCategory === 'accounting' ? 'border-blue-500 text-blue-700' :
                        sessionCategory === 'journal' ? 'border-purple-500 text-purple-700' :
                        'border-gray-500 text-gray-700'
                      }`}
                    >
                      {sessionCategory === 'tax' ? '税務' :
                       sessionCategory === 'accounting' ? '会計' :
                       sessionCategory === 'journal' ? '仕訳' : '総合'}
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
                className="text-gray-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                新規
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-600 relative"
              >
                <History className="w-4 h-4 mr-1" />
                履歴
                {sessions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {sessions.length}
                  </Badge>
                )}
              </Button>
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

          {/* メインコンテンツ */}
          <div className="flex flex-1 overflow-hidden">
            {/* 履歴パネル */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-r bg-gray-50 overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b bg-white">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">チャット履歴</h4>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        placeholder="履歴を検索..."
                        className="pl-9 pr-3 py-2 text-sm"
                      />
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
                            <motion.div
                              key={session.sessionId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                currentSession?.sessionId === session.sessionId
                                  ? 'bg-blue-100 border border-blue-300'
                                  : 'bg-white hover:bg-gray-100 border border-gray-200'
                              }`}
                              onClick={() => switchSession(session)}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <h5 className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {session.title}
                                </h5>
                                {session.isBookmarked && (
                                  <Bookmark className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0 ml-1" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    session.category === 'tax' ? 'border-green-500 text-green-700' :
                                    session.category === 'accounting' ? 'border-blue-500 text-blue-700' :
                                    session.category === 'journal' ? 'border-purple-500 text-purple-700' :
                                    'border-gray-500 text-gray-700'
                                  }`}
                                >
                                  {session.category === 'tax' ? '税務' :
                                   session.category === 'accounting' ? '会計' :
                                   session.category === 'journal' ? '仕訳' : '総合'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {session.messages.length} メッセージ
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  {format(new Date(session.updatedAt), 'M/d HH:mm', { locale: ja })}
                                </span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBookmark(session.sessionId);
                                    }}
                                  >
                                    <Bookmark className={`w-3 h-3 ${
                                      session.isBookmarked ? 'text-yellow-500 fill-current' : 'text-gray-400'
                                    }`} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
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
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSession(session.sessionId);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 text-gray-400" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
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
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* メッセージエリア */}
            <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>
      </motion.div>
      
      {/* FAQ追加確認ダイアログ */}
      {faqDialogMessageId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  FAQに追加しますか？
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  この会話をFAQナレッジベースに保存して、他のユーザーと共有することができます。
                  DeepSeekによる内部検索が向上します。
                </p>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleGenerateFaq(faqDialogMessageId)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    FAQに追加
                  </Button>
                  <Button
                    onClick={handleFaqDialogSkip}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    スキップ
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      {/* 新規セッション作成ダイアログ */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新しいチャットを開始</DialogTitle>
            <DialogDescription>
              どのような相談をしますか？
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                createNewSession('tax');
                setShowNewSessionDialog(false);
              }}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium">税務相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  法人税、消費税、インボイス制度など
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                createNewSession('accounting');
                setShowNewSessionDialog(false);
              }}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium">会計処理相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  減価償却、引当金、財務諸表など
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                createNewSession('journal');
                setShowNewSessionDialog(false);
              }}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="font-medium">仕訳・勘定科目相談</span>
                </div>
                <p className="text-sm text-gray-600">
                  仕訳処理、勘定科目の選定など
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={() => {
                createNewSession('mixed');
                setShowNewSessionDialog(false);
              }}
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
    </motion.div>
  );
}