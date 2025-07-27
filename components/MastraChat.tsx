'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minimize2, Maximize2, Users, Calculator, Database, FileText, Settings, Package, Wrench, Code, Layout, HardHat, Zap, Lightbulb, Mic, Upload } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ContextAnalyzer, type PageContext } from '@/lib/context-analyzer';

export default function MastraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // エージェント一覧（機能強化版）
  const agents = [
    { id: 'general', name: '汎用', icon: Bot, description: 'すべての機能', color: 'bg-gray-500' },
    { id: 'accountingAgent', name: '会計', icon: Calculator, description: '仕訳・税計算・財務分析', color: 'bg-blue-500' },
    { id: 'customerAgent', name: '顧客', icon: Users, description: '顧客管理・営業支援', color: 'bg-green-500' },
    { id: 'japanTaxAgent', name: '税務', icon: FileText, description: '税金計算・申告支援', color: 'bg-red-500' },
    { id: 'ocrAgent', name: 'OCR', icon: FileText, description: '書類読取・自動仕訳', color: 'bg-purple-500' },
    { id: 'databaseAgent', name: 'DB', icon: Database, description: 'データ分析・レポート', color: 'bg-indigo-500' },
    { id: 'productAgent', name: '商品', icon: Package, description: '商品管理・在庫分析', color: 'bg-orange-500' },
    { id: 'refactorAgent', name: 'リファクタ', icon: Code, description: 'システム改善', color: 'bg-teal-500' },
    { id: 'uiAgent', name: 'UI', icon: Layout, description: 'UI/UX改善', color: 'bg-pink-500' },
    { id: 'constructionAgent', name: '構築', icon: HardHat, description: 'システム構築', color: 'bg-yellow-500' },
    { id: 'accountCodeAgent', name: '勘定科目', icon: FileText, description: '勘定科目コンサル', color: 'bg-cyan-500' }
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent) || agents[0];

  // ページコンテキストを解析（ContextAnalyzerを使用）
  const getPageContext = () => {
    return ContextAnalyzer.analyzePageContext(pathname);
  };

  // セッションIDの生成
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  // ページコンテキストと推奨エージェントの更新
  useEffect(() => {
    const context = getPageContext();
    setPageContext(context);
    
    // コンテキストに基づくエージェント自動選択
    setSelectedAgent(context.recommendedAgent);
    
    // コンテキスト情報に基づく初回メッセージ
    const contextualWelcome = `${context.description}へようこそ！\n\n利用可能な機能：\n${context.availableActions.map(action => `• ${action}`).join('\n')}\n\n何をお手伝いしましょうか？`;
    
    // 初回メッセージを設定（まだメッセージがない場合のみ）
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: contextualWelcome }]);
    }
  }, [pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const context = pageContext || getPageContext();
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // コンテキスト認識されたプロンプトを作成
      const contextualPrompt = ContextAnalyzer.getContextualPrompt(context, userMessage);
      
      // エージェント別のエンドポイントを使用
      const endpoint = selectedAgent === 'general' 
        ? '/api/mastra/working'
        : '/api/mastra/chat';
      
      const body = selectedAgent === 'general'
        ? { 
            message: contextualPrompt,
            context: {
              ...context,
              agent: selectedAgent,
              sessionId,
              originalMessage: userMessage
            }
          }
        : { 
            agent: selectedAgent, 
            message: contextualPrompt,
            context: {
              ...context,
              sessionId,
              originalMessage: userMessage
            }
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      const assistantMessage = { 
        role: 'assistant', 
        content: data.response || 'エラーが発生しました'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // チャット履歴を保存
      if (sessionId) {
        try {
          await fetch('/api/chat-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              messages: [
                { role: 'user', content: userMessage },
                assistantMessage
              ],
              context,
              agent: selectedAgent
            })
          });
        } catch (err) {
          console.error('Failed to save chat history:', err);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'エラーが発生しました。もう一度お試しください。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // コンテキスト別のクイックテンプレート
  const getContextualTemplates = () => {
    const context = pageContext || getPageContext();
    return ContextAnalyzer.getQuickTemplates(context);
  };

  const templates = getContextualTemplates();

  if (!isOpen) {
    return (
      <>
        {/* チャットボタン */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-50"
        >
          <Bot size={24} />
        </button>
        
        {/* エージェント選択ボタン */}
        <div className="fixed bottom-4 right-20">
          <button
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="bg-gray-800 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 transition-colors"
            title="エージェント選択"
          >
            <Users size={20} />
          </button>
          
          {showAgentMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl p-2 min-w-[200px]">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent.id);
                    setShowAgentMenu(false);
                    setIsOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-3 p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <agent.icon size={16} className="text-gray-600" />
                  <div>
                    <div className="font-medium text-sm">{agent.name}</div>
                    <div className="text-xs text-gray-500">{agent.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl z-50 transition-all ${
      isMinimized ? 'w-64 h-12' : 'w-96 h-[600px]'
    }`}>
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <currentAgent.icon size={20} />
            <span className="font-semibold">{currentAgent.name}エージェント</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-blue-700 p-1 rounded"
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                // オプション：チャットを閉じる時に履歴をクリアする場合は以下をコメントアウト
                // setMessages([]);
                // setSessionId(`chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
              }}
              className="hover:bg-blue-700 p-1 rounded"
              title="チャットを閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {!isMinimized && pageContext && (
          <div className="text-xs text-blue-100 mt-1">
            {pageContext.description}
            {pageContext.entityId && ` (ID: ${pageContext.entityId})`}
          </div>
        )}
      </div>

      {!isMinimized && (
        <>
          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 h-[450px]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-lg bg-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* クイックテンプレート */}
          {!showTemplates && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 px-3 py-1 rounded-full mb-2"
              >
                クイックテンプレート表示
              </button>
            </div>
          )}
          
          {showTemplates && (
            <div className="px-4 pb-2 max-h-20 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-600">クイックテンプレート</span>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {templates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(template.prompt);
                      setShowTemplates(false);
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-left"
                    title={template.prompt}
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 入力エリア */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}