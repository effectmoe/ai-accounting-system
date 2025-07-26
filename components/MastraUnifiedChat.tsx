'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minimize2, Maximize2, MessageSquare, Calculator, FileText, Users } from 'lucide-react';
import AIChatDialog from './ai-chat-dialog';
import DocumentAIChat from './documents/DocumentAIChat';
import JournalAIChat from './journals/JournalAIChat';

export default function MastraUnifiedChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'mastra' | 'document' | 'journal' | 'invoice'>('mastra');
  const [showModeMenu, setShowModeMenu] = useState(false);

  // チャットモード一覧
  const chatModes = [
    { 
      id: 'mastra', 
      name: 'Mastraエージェント', 
      icon: Bot, 
      description: '汎用AIアシスタント',
      component: 'MastraChat'
    },
    { 
      id: 'document', 
      name: '書類AI', 
      icon: FileText, 
      description: '書類管理・OCR',
      component: 'DocumentAIChat'
    },
    { 
      id: 'invoice', 
      name: '請求書AI', 
      icon: Calculator, 
      description: '請求書作成・編集',
      component: 'AIChatDialog'
    },
    { 
      id: 'journal', 
      name: '仕訳AI', 
      icon: MessageSquare, 
      description: '仕訳作成・確認',
      component: 'JournalAIChat'
    }
  ];

  const currentMode = chatModes.find(m => m.id === chatMode) || chatModes[0];

  // 既存のチャットコンポーネントを条件付きでレンダリング
  const renderChatComponent = () => {
    switch (chatMode) {
      case 'invoice':
        return (
          <AIChatDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            mode="create"
            documentType="invoice"
            title="請求書AIアシスタント"
          />
        );
      
      case 'document':
        // DocumentAIChatコンポーネントがモーダル形式でない場合は調整が必要
        return null; // TODO: 実装

      case 'journal':
        // JournalAIChatコンポーネントがモーダル形式でない場合は調整が必要
        return null; // TODO: 実装

      case 'mastra':
      default:
        // 既存のMastraChat機能をここに組み込む
        return <MastraChatContent />;
    }
  };

  if (!isOpen) {
    return (
      <>
        {/* 統一チャットボタン */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-50"
          title={currentMode.name}
        >
          <currentMode.icon size={24} />
        </button>
        
        {/* モード選択ボタン */}
        <div className="fixed bottom-4 right-20">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="bg-gray-800 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 transition-colors"
            title="チャットモード選択"
          >
            <MessageSquare size={20} />
          </button>
          
          {showModeMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl p-2 min-w-[200px]">
              <div className="text-xs font-semibold text-gray-500 px-2 py-1">チャットモード</div>
              {chatModes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setChatMode(mode.id as any);
                    setShowModeMenu(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-2 hover:bg-gray-100 rounded transition-colors ${
                    chatMode === mode.id ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <mode.icon size={16} className={chatMode === mode.id ? 'text-blue-600' : 'text-gray-600'} />
                  <div>
                    <div className="font-medium text-sm">{mode.name}</div>
                    <div className="text-xs text-gray-500">{mode.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // 特定のモードは既存のコンポーネントを使用
  if (chatMode === 'invoice') {
    return renderChatComponent();
  }

  // その他のモードは共通UIを使用
  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl z-50 w-96 h-[600px]">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <currentMode.icon size={20} />
          <span className="font-semibold">{currentMode.name}</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-blue-700 p-1 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {renderChatComponent() || (
          <div className="text-center text-gray-500 mt-20">
            <currentMode.icon size={48} className="mx-auto mb-4 text-gray-300" />
            <p>{currentMode.name}の実装準備中...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mastraチャットの内容（既存のMastraChatから移植）
function MastraChatContent() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([
    { role: 'assistant', content: 'こんにちは！Mastraエージェントです。どのようなお手伝いができますか？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/mastra/working', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'エラーが発生しました'
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'エラーが発生しました。もう一度お試しください。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto p-4">
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
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="メッセージを入力..."
            className="flex-1 border rounded-lg px-3 py-2"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white rounded-lg px-4 py-2"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}