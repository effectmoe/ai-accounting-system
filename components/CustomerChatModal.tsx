'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Upload, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getChatHistoryService } from '@/services/chat-history.service';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface CustomerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: any) => void;
  formData?: any; // 現在のフォームデータを受け取る
}

export default function CustomerChatModal({ isOpen, onClose, onDataExtracted, formData }: CustomerChatModalProps) {
  console.log('🎯 CustomerChatModal コンポーネント初期化:', { isOpen, formData });
  
  // useEffectに移動して副作用として実行
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.console.log('🔥 FORCED LOG: CustomerChatModal loaded');
    }
  }, []);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '🤖 企業登録アシスタントです。\n\n● 会社情報の自動入力：\n  → URLを入力 または 名刺画像をアップロード\n\n● 登録された企業の詳細調査：\n  → 「どんな会社？」「詳しく教えて」などで質問\n\n例：https://roumunews.jp/',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 関数定義（useEffectより前に配置）
  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '顧客登録チャット',
          userId: 'customer-registration'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSessionId(result.data.sessionId);
      }
    } catch (error) {
      console.error('セッション初期化エラー:', error);
    }
  }, []);

  const saveMessageToHistory = useCallback(async (lastMessage?: Message) => {
    if (!sessionId || !lastMessage || lastMessage.id === '1') return;
    
    try {
      await fetch(`/api/chat-history/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: lastMessage.content,
          role: lastMessage.role,
          metadata: {
            timestamp: lastMessage.timestamp,
            context: 'customer-registration'
          }
        })
      });
    } catch (error) {
      console.error('メッセージ保存エラー:', error);
    }
  }, [sessionId]);

  // セッション初期化
  useEffect(() => {
    console.log('🔄 useEffect[isOpen] 実行:', { isOpen, sessionId });
    if (isOpen && !sessionId) {
      console.log('✅ セッション初期化条件満たした');
      initializeSession();
    }
  }, [isOpen, sessionId, initializeSession]);

  // メッセージ更新時の履歴保存（最後のメッセージのみ監視）
  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id;
    console.log('🔄 useEffect[messages] 実行:', { sessionId, lastMessageId, messagesLength: messages.length });
    
    if (!sessionId || messages.length <= 1 || lastMessageId === '1') {
      return;
    }
    
    const saveTimer = setTimeout(() => {
      console.log('✅ メッセージ履歴保存実行');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        saveMessageToHistory(lastMessage);
      }
    }, 500); // 500ms遅延して保存
    
    return () => clearTimeout(saveTimer);
  }, [messages.length, sessionId, saveMessageToHistory]); // messagesの長さのみを監視

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (typeof window !== 'undefined') {
      window.console.log('🚀 チャットボット handleSend 開始:', { input, isLoading });
    }
    
    if (!input.trim() || isLoading) {
      if (typeof window !== 'undefined') {
        window.console.log('❌ 入力チェック失敗:', { inputTrim: input.trim(), isLoading });
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    if (typeof window !== 'undefined') {
      window.console.log('📝 ユーザーメッセージ作成:', userMessage);
    }
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // URLパターンを検出
      if (typeof window !== 'undefined') {
        window.console.log('🔍 URL検出チェック:', input);
      }
      const urlMatch = input.match(/https?:\/\/[^\s]+/);
      if (typeof window !== 'undefined') {
        window.console.log('🔍 URL検出結果:', urlMatch);
      }
      
      if (urlMatch) {
        if (typeof window !== 'undefined') {
          window.console.log('✅ URL検出成功:', urlMatch[0]);
          window.console.log('📡 API リクエスト開始');
        }
        const response = await fetch('/api/extract-company-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlMatch[0] })
        });

        if (typeof window !== 'undefined') {
          window.console.log('📡 API レスポンス受信:', { ok: response.ok, status: response.status });
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          if (typeof window !== 'undefined') {
            window.console.error('❌ API エラー:', errorText);
          }
          throw new Error('会社情報の取得に失敗しました');
        }

        const data = await response.json();
        if (typeof window !== 'undefined') {
          window.console.log('📋 API レスポンスデータ:', data);
        }
        
        // デバッグ: 抽出されたデータの詳細をログ出力
        if (typeof window !== 'undefined') {
          window.console.log('🔍 Extracted company data from API:', JSON.stringify(data, null, 2));
          window.console.log('📞 Contact info check:', {
            phone: data.phone,
            fax: data.fax,
            email: data.email,
            website: data.website
          });
        }
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `会社情報を取得しました。以下の情報をフォームに入力します：\n\n会社名: ${data.companyName || '不明'}${data.companyNameKana ? `\n会社名カナ: ${data.companyNameKana}` : ''}${data.department ? `\n部署: ${data.department}` : ''}\n\n住所情報:${data.postalCode ? `\n郵便番号: ${data.postalCode}` : ''}${data.prefecture ? `\n都道府県: ${data.prefecture}` : ''}${data.city ? `\n市区町村: ${data.city}` : ''}${data.address1 ? `\n住所1: ${data.address1}` : ''}${data.address2 ? `\n住所2: ${data.address2}` : ''}${data.address ? `\n住所: ${data.address}` : '不明'}\n\n連絡先:\n電話番号: ${data.phone || '不明'}${data.fax ? `\nFAX: ${data.fax}` : '❌ FAX情報なし'}\nメール: ${data.email || '不明'}${data.website ? `\nウェブサイト: ${data.website}` : '❌ ウェブサイト情報なし'}\n\n🔍 デバッグ情報:\nFAXデータ: ${data.fax || 'null/undefined'}\nWebサイトデータ: ${data.website || 'null/undefined'}${data.contactPerson ? `\n\n担当者情報:\n名前: ${data.contactPerson}` : ''}${data.notes ? `\n\n備考: ${data.notes}` : ''}`,
          role: 'assistant',
          timestamp: new Date()
        };

        if (typeof window !== 'undefined') {
          window.console.log('💬 アシスタントメッセージ設定');
        }
        setMessages(prev => [...prev, assistantMessage]);
        
        if (typeof window !== 'undefined') {
          window.console.log('📤 onDataExtracted コールバック実行:', data);
        }
        onDataExtracted(data);
        
        if (typeof window !== 'undefined') {
          window.console.log('✅ 処理完了 - トースト表示');
        }
        toast.success('会社情報を入力しました');
      } else {
        // 通常のチャット応答または企業情報調査
        const currentCompanyName = formData?.companyName || '';
        const isAskingAboutCompany = input.includes('どんな会社') || input.includes('詳しく') || input.includes('教えて') || input.includes('調べ');
        
        if (isAskingAboutCompany && currentCompanyName) {
          // 企業深掘り調査
          const investigateResponse = await fetch('/api/investigate-company', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              companyName: currentCompanyName,
              query: input
            })
          });
          
          if (investigateResponse.ok) {
            const investigationData = await investigateResponse.json();
            const assistantMessage: Message = {
              id: Date.now().toString(),
              content: investigationData.summary || '調査結果を取得できませんでした。',
              role: 'assistant',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            throw new Error('企業情報の調査に失敗しました');
          }
        } else {
          // 企業登録に関係ない質問への応答
          const assistantMessage: Message = {
            id: Date.now().toString(),
            content: '😊 申し訳ございません。私は企業登録専用のアシスタントです。\n\n以下のことでお手伝いできます：\n• 企業情報の自動入力（URLまたは名刺画像）\n• 登録された企業の詳細情報提供\n\n他のことについてはお答えできかねます。',
            role: 'assistant',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('エラーが発生しました');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルのみ許可
    if (!file.type.startsWith('image/')) {
      toast.error('画像ファイルを選択してください');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/ocr/business-card', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('名刺の読み取りに失敗しました');

      const data = await response.json();
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: `名刺画像をアップロードしました: ${file.name}`,
        role: 'user',
        timestamp: new Date()
      };

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `名刺から以下の情報を読み取りました：\n\n会社名: ${data.companyName || '不明'}${data.companyNameKana ? `\n会社名カナ: ${data.companyNameKana}` : ''}\n氏名: ${data.name || '不明'}${data.nameKana ? ` (${data.nameKana})` : ''}\n${data.department ? `部署: ${data.department}\n` : ''}${data.title ? `役職: ${data.title}\n` : ''}電話番号: ${data.phone || '不明'}${data.mobile ? `\n携帯番号: ${data.mobile}` : ''}${data.fax ? `\nFAX: ${data.fax}` : ''}\nメール: ${data.email || '不明'}${data.website ? `\nウェブサイト: ${data.website}` : ''}${data.postalCode ? `\n\n住所情報:\n郵便番号: ${data.postalCode}` : ''}${data.prefecture ? `\n都道府県: ${data.prefecture}` : ''}${data.city ? `\n市区町村: ${data.city}` : ''}${data.address1 ? `\n住所1: ${data.address1}` : ''}${data.address2 ? `\n住所2: ${data.address2}` : ''}${data.address && !data.address1 ? `\n住所: ${data.address}` : ''}\n\nこの情報をフォームに入力します。`,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      onDataExtracted(data);
      toast.success('名刺情報を入力しました');
    } catch (error) {
      console.error('Error:', error);
      toast.error('名刺の読み取りに失敗しました');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      scrollToBottom();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-[500px] bg-white rounded-lg border border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-4 border-b bg-purple-50">
        <Bot className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-800">会社情報入力アシスタント</h3>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`rounded-lg px-4 py-2 ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ja-JP', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              if (typeof window !== 'undefined') {
                window.console.log('🔧 入力フィールド変更:', e.target.value);
              }
              setInput(e.target.value);
            }}
            onKeyPress={(e) => {
              if (typeof window !== 'undefined') {
                window.console.log('⌨️ キー押下:', e.key);
                if (e.key === 'Enter') {
                  window.console.log('↵ Enterキー検出 - handleSend実行');
                }
              }
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
            placeholder="質問を入力してください..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.console.log('🖱️ 送信ボタンクリック:', { input, isLoading });
              }
              handleSend();
            }}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          URLを入力するか、名刺画像をアップロードしてください
        </p>
      </div>
    </div>
  );
}