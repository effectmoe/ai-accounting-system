'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minimize2, Maximize2, Users, Calculator, Database, FileText, Package, Upload, Lightbulb, Zap, Star, Activity } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ContextAnalyzer, type PageContext } from '@/lib/context-analyzer';

export default function EnhancedMastraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string, content: string, metadata?: any}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 強化されたエージェント一覧
  const agents = [
    { 
      id: 'general', 
      name: '汎用AI', 
      icon: Bot, 
      description: 'すべての機能・統合サポート', 
      color: 'bg-gray-600',
      features: ['コンテキスト認識', 'マルチタスク対応', '自動エージェント選択'],
      specialty: '総合支援'
    },
    { 
      id: 'accountingAgent', 
      name: '会計エージェント', 
      icon: Calculator, 
      description: '日本の会計処理専門エージェント', 
      color: 'bg-blue-600',
      features: ['消費税計算', '仕訳作成', '財務レポート', '請求書・見積書支援'],
      specialty: '会計・財務'
    },
    { 
      id: 'customerAgent', 
      name: '顧客・仕入先CRM', 
      icon: Users, 
      description: '顧客・仕入先管理専門エージェント', 
      color: 'bg-green-600',
      features: ['顧客管理', '取引履歴分析', '売上分析', '営業支援'],
      specialty: 'CRM・営業'
    },
    { 
      id: 'japanTaxAgent', 
      name: '日本税務コンサル', 
      icon: FileText, 
      description: '日本の税制専門コンサルタント', 
      color: 'bg-red-600',
      features: ['消費税申告', '法人税計算', '税務調査対策', '節税提案'],
      specialty: '税務・法規制'
    },
    { 
      id: 'ocrAgent', 
      name: '書類解析OCR', 
      icon: Upload, 
      description: '書類解析・OCR処理専門エージェント', 
      color: 'bg-purple-600',
      features: ['テキスト抽出', '書類分類', '自動仕訳提案', 'データ品質チェック'],
      specialty: '書類処理・自動化'
    },
    { 
      id: 'databaseAgent', 
      name: 'データ分析・BI', 
      icon: Database, 
      description: 'データ分析・レポート生成エージェント', 
      color: 'bg-indigo-600',
      features: ['売上分析', '経営指標計算', 'キャッシュフロー分析', '予算実績比較'],
      specialty: 'BI・分析'
    },
    { 
      id: 'productAgent', 
      name: '商品・在庫管理', 
      icon: Package, 
      description: '商品・在庫管理最適化エージェント', 
      color: 'bg-orange-600',
      features: ['在庫監視', '発注管理', '価格分析', '商品収益性分析'],
      specialty: '在庫・商品管理'
    },
    { 
      id: 'accountCodeAgent', 
      name: '勘定科目コンサル', 
      icon: Lightbulb, 
      description: '勘定科目選択・会計処理コンサルタント', 
      color: 'bg-cyan-600',
      features: ['勘定科目提案', '会計基準準拠', '業界特有処理', '内部統制支援'],
      specialty: '会計基準・科目管理'
    }
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent) || agents[0];

  // ページコンテキストを解析（ContextAnalyzerを使用）
  const getPageContext = () => {
    return ContextAnalyzer.analyzePageContext(pathname);
  };

  // セッションIDの生成
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`enhanced_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  // ページコンテキストと推奨エージェントの更新
  useEffect(() => {
    const context = getPageContext();
    setPageContext(context);
    
    // コンテキストに基づくエージェント自動選択
    setSelectedAgent(context.recommendedAgent);
    
    // コンテキスト情報に基づく初回メッセージ
    const contextualWelcome = {
      role: 'assistant', 
      content: `${context.description}へようこそ！

利用可能な機能：
${context.availableActions.map(action => `• ${action}`).join('\n')}

何をお手伝いしましょうか？`,
      metadata: { 
        context, 
        agent: context.recommendedAgent,
        timestamp: new Date().toISOString()
      }
    };
    
    // 初回メッセージを設定（まだメッセージがない場合のみ）
    if (messages.length === 0) {
      setMessages([contextualWelcome]);
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
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      metadata: { timestamp: new Date().toISOString() }
    }]);
    setIsLoading(true);

    try {
      // コンテキスト認識されたプロンプトを作成
      const contextualPrompt = ContextAnalyzer.getContextualPrompt(context, userMessage);
      
      // すべてのエージェントで同じエンドポイントを使用
      const endpoint = '/api/mastra/chat';
      
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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // API応答の検証
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response format');
      }
      
      // エラーレスポンスの処理
      if (data.success === false || data.error) {
        throw new Error(data.error || 'API returned error');
      }
      
      const assistantMessage = { 
        role: 'assistant', 
        content: data.response || data.message || 'システムからの応答がありませんでした。',
        metadata: {
          ...data.metadata,
          agent: selectedAgent,
          timestamp: new Date().toISOString(),
          success: data.success
        }
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
      console.error('Chat error:', error);
      
      // エラーメッセージをより詳細に
      let errorMessage = 'エラーが発生しました。もう一度お試しください。';
      
      if (error instanceof Error) {
        // 特定のエラーパターンに応じてメッセージをカスタマイズ
        if (error.message.includes('mastra.init')) {
          errorMessage = '会計エージェントの初期化に問題があります。システム管理者にお問い合わせください。';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してお試しください。';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'リクエストがタイムアウトしました。しばらく待ってからお試しください。';
        }
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage,
        metadata: { 
          error: true,
          errorType: error instanceof Error ? error.name : 'Unknown',
          timestamp: new Date().toISOString()
        }
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
        {/* 統合チャットボタン */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-50"
          style={{ bottom: '24px' }}
          title={`${currentAgent.name} - ${currentAgent.specialty}`}
        >
          <currentAgent.icon size={24} />
        </button>
        
        {/* エージェント選択ボタン */}
        <div className="fixed right-24" style={{ bottom: '24px' }}>
          <button
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="bg-gray-800 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 transition-colors"
            title="AIエージェント選択"
          >
            <Users size={20} />
          </button>
          
          {showAgentMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl p-4 min-w-[380px] max-w-[420px] border border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users size={16} />
                AIエージェント選択
              </div>
              <div className="grid gap-3 max-h-[500px] overflow-y-auto">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent.id);
                      setShowAgentMenu(false);
                      setIsOpen(true);
                    }}
                    className={`w-full text-left flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all border ${
                      selectedAgent === agent.id 
                        ? 'border-blue-200 bg-blue-50 shadow-sm' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${agent.color} text-white flex-shrink-0`}>
                      <agent.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{agent.name}</span>
                        {selectedAgent === agent.id && (
                          <Zap size={14} className="text-blue-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">{agent.specialty}</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.features.slice(0, 3).map((feature, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {feature}
                          </span>
                        ))}
                        {agent.features.length > 3 && (
                          <span className="text-xs text-gray-400">+{agent.features.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                  <Activity size={12} />
                  コンテキストに応じて自動選択されます
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className={`fixed right-6 bg-white rounded-xl shadow-2xl z-50 transition-all border border-gray-200 ${
      isMinimized ? 'w-80 h-14' : 'w-[420px] h-[600px]'
    }`}
    style={{ bottom: '120px' }}>
      {/* ヘッダー */}
      <div className={`${currentAgent.color} text-white p-4 rounded-t-xl`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <currentAgent.icon size={22} />
            <div>
              <div className="font-semibold text-sm">{currentAgent.name}</div>
              <div className="text-xs opacity-90">{currentAgent.specialty}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              title="チャットを閉じる"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {!isMinimized && pageContext && (
          <div className="text-xs opacity-90 space-y-1">
            <div className="flex items-center gap-2">
              <Star size={12} />
              {pageContext.description}
            </div>
            {pageContext.entityId && (
              <div className="opacity-75">ID: {pageContext.entityId}</div>
            )}
          </div>
        )}
      </div>

      {!isMinimized && (
        <>
          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 h-[430px] bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-3 rounded-xl max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  {msg.metadata?.timestamp && (
                    <div className={`text-xs mt-2 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {new Date(msg.metadata.timestamp).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-xl bg-white shadow-sm border border-gray-100">
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
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-full transition-colors"
              >
                クイックテンプレート表示
              </button>
            </div>
          )}
          
          {showTemplates && (
            <div className="px-4 pb-2 max-h-24 overflow-y-auto">
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
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-left transition-colors"
                    title={template.prompt}
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 入力エリア */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}