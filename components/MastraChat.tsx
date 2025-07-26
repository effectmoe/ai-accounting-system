'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minimize2, Maximize2, Users, Calculator, Database, FileText, Settings, Package, Wrench, Code, Layout, HardHat } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MastraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('general');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // エージェント一覧
  const agents = [
    { id: 'general', name: '汎用', icon: Bot, description: 'すべての機能' },
    { id: 'accountingAgent', name: '会計', icon: Calculator, description: '仕訳・税計算' },
    { id: 'customerAgent', name: '顧客', icon: Users, description: '顧客管理' },
    { id: 'japanTaxAgent', name: '税務', icon: FileText, description: '税金計算' },
    { id: 'ocrAgent', name: 'OCR', icon: FileText, description: '書類読取' },
    { id: 'databaseAgent', name: 'DB', icon: Database, description: 'データ管理' },
    { id: 'productAgent', name: '商品', icon: Package, description: '商品管理' },
    { id: 'refactorAgent', name: 'リファクタ', icon: Code, description: 'コード改善' },
    { id: 'uiAgent', name: 'UI', icon: Layout, description: 'UI改善' },
    { id: 'constructionAgent', name: '構築', icon: HardHat, description: 'システム構築' },
    { id: 'accountCodeAgent', name: '勘定科目', icon: FileText, description: '勘定科目の相談' }
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent) || agents[0];

  // ページコンテキストを解析
  const getPageContext = () => {
    const pathParts = pathname.split('/').filter(Boolean);
    const context: any = {
      page: pathname,
      type: 'general',
      entityId: null,
      entityType: null
    };

    // ページタイプの判定
    if (pathname === '/') {
      context.type = 'dashboard';
      context.description = 'ダッシュボード';
    } else if (pathname.includes('/invoices')) {
      context.type = 'invoice';
      context.entityType = 'invoice';
      context.description = '請求書';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/quotes')) {
      context.type = 'quote';
      context.entityType = 'quote';
      context.description = '見積書';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/journal')) {
      context.type = 'journal';
      context.entityType = 'journal';
      context.description = '仕訳';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/customers')) {
      context.type = 'customer';
      context.entityType = 'customer';
      context.description = '顧客';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/suppliers')) {
      context.type = 'supplier';
      context.entityType = 'supplier';
      context.description = '仕入先';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/products')) {
      context.type = 'product';
      context.entityType = 'product';
      context.description = '商品';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/documents')) {
      context.type = 'document';
      context.entityType = 'document';
      context.description = '書類';
      if (pathParts.length > 1 && pathParts[1] !== 'new') {
        context.entityId = pathParts[1];
      }
    } else if (pathname.includes('/accounts')) {
      context.type = 'account';
      context.description = '勘定科目';
    } else if (pathname.includes('/settings')) {
      context.type = 'settings';
      context.description = '設定';
    }

    return context;
  };

  // セッションIDの生成
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, []);

  // エージェントの自動選択と初回メッセージ
  useEffect(() => {
    const context = getPageContext();
    
    // ページに応じて最適なエージェントを提案
    let agentId = 'general';
    let welcomeMessage = 'こんにちは！会計AIアシスタントです。どのようなお手伝いができますか？';
    
    if (context.type === 'invoice') {
      agentId = 'accountingAgent';
      welcomeMessage = `請求書ページにいらっしゃいますね。請求書の作成、編集、PDF生成などをお手伝いできます。${context.entityId ? 'この請求書について何かご質問はありますか？' : '新しい請求書を作成しますか？'}`;
    } else if (context.type === 'quote') {
      agentId = 'accountingAgent';
      welcomeMessage = `見積書ページにいらっしゃいますね。見積書の作成、編集、請求書への変換などをお手伝いできます。${context.entityId ? 'この見積書について何かご質問はありますか？' : '新しい見積書を作成しますか？'}`;
    } else if (context.type === 'customer') {
      agentId = 'customerAgent';
      welcomeMessage = `顧客管理ページにいらっしゃいますね。顧客情報の管理、取引履歴の確認などをお手伝いできます。${context.entityId ? 'この顧客について何かご質問はありますか？' : '新規顧客を追加しますか？'}`;
    } else if (context.type === 'supplier') {
      agentId = 'customerAgent';
      welcomeMessage = `仕入先管理ページにいらっしゃいますね。仕入先情報の管理、取引履歴の確認などをお手伝いできます。${context.entityId ? 'この仕入先について何かご質問はありますか？' : '新規仕入先を追加しますか？'}`;
    } else if (context.type === 'journal') {
      agentId = 'accountingAgent';
      welcomeMessage = `仕訳ページにいらっしゃいますね。仕訳の作成、勘定科目の選択、残高確認などをお手伝いできます。${context.entityId ? 'この仕訳について何かご質問はありますか？' : '新しい仕訳を作成しますか？'}`;
    } else if (context.type === 'document') {
      agentId = 'ocrAgent';
      welcomeMessage = `書類管理ページにいらっしゃいますね。書類のOCR読取、分類、仕訳作成などをお手伝いできます。${context.entityId ? 'この書類について何かご質問はありますか？' : '新しい書類をアップロードしますか？'}`;
    } else if (context.type === 'product') {
      agentId = 'productAgent';
      welcomeMessage = `商品管理ページにいらっしゃいますね。商品情報の管理、在庫確認などをお手伝いできます。${context.entityId ? 'この商品について何かご質問はありますか？' : '新規商品を追加しますか？'}`;
    } else if (context.type === 'dashboard') {
      welcomeMessage = 'ダッシュボードへようこそ！売上確認、経費分析、仕訳作成など、何でもお手伝いします。';
    }
    
    setSelectedAgent(agentId);
    
    // 初回メッセージを設定（まだメッセージがない場合のみ）
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
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
    const context = getPageContext();
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // エージェント別のエンドポイントを使用
      const endpoint = selectedAgent === 'general' 
        ? '/api/mastra/working'
        : '/api/mastra/chat';
      
      const body = selectedAgent === 'general'
        ? { 
            message: userMessage,
            context: {
              ...context,
              agent: selectedAgent,
              sessionId
            }
          }
        : { 
            agent: selectedAgent, 
            message: userMessage,
            context: {
              ...context,
              sessionId
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

  // ページコンテキストに応じたショートカット
  const getContextualShortcuts = () => {
    const context = getPageContext();
    
    switch (context.type) {
      case 'invoice':
        return [
          { label: '請求書作成', action: '新しい請求書を作成してください' },
          { label: 'PDF生成', action: 'この請求書のPDFを生成してください' },
          { label: '送付準備', action: 'この請求書の送付準備をしてください' },
        ];
      case 'quote':
        return [
          { label: '見積書作成', action: '新しい見積書を作成してください' },
          { label: '請求書変換', action: 'この見積書を請求書に変換してください' },
          { label: '有効期限延長', action: '見積書の有効期限を延長してください' },
        ];
      case 'journal':
        return [
          { label: '仕訳作成', action: '新しい仕訳を作成してください' },
          { label: '勘定科目相談', action: 'この取引の適切な勘定科目を教えてください' },
          { label: '残高確認', action: '関連する勘定科目の残高を確認してください' },
        ];
      case 'customer':
        return [
          { label: '顧客追加', action: '新規顧客を追加してください' },
          { label: '取引履歴', action: 'この顧客の取引履歴を表示してください' },
          { label: '請求書作成', action: 'この顧客への請求書を作成してください' },
        ];
      case 'document':
        return [
          { label: 'OCR読取', action: 'この書類をOCRで読み取ってください' },
          { label: '仕訳作成', action: 'この書類から仕訳を作成してください' },
          { label: '分類', action: 'この書類の種類を分類してください' },
        ];
      default:
        return [
          { label: '税計算', action: '100万円の消費税を計算してください' },
          { label: '顧客追加', action: '新規顧客を追加したい' },
          { label: '仕訳作成', action: '仕訳を作成してください' },
        ];
    }
  };

  const shortcuts = getContextualShortcuts();

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
        {!isMinimized && getPageContext().description && (
          <div className="text-xs text-blue-100 mt-1">
            現在のページ: {getPageContext().description}
            {getPageContext().entityId && ` (ID: ${getPageContext().entityId})`}
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

          {/* ショートカットボタン */}
          <div className="px-4 pb-2 flex gap-2">
            {shortcuts.map((shortcut, idx) => (
              <button
                key={idx}
                onClick={() => setInput(shortcut.action)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
              >
                {shortcut.label}
              </button>
            ))}
          </div>

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