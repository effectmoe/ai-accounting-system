'use client';

import { useState, useRef } from 'react';
import { X, Send, Upload, Loader2, Bot, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface SupplierChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted: (data: any) => void;
  formData?: any; // 現在のフォームデータを受け取る
}

export default function SupplierChatModal({ isOpen, onClose, onDataExtracted, formData }: SupplierChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '🤖 仕入先登録アシスタントです。\n\n● 仕入先情報の自動入力：\n  → URLを入力 または 名刺画像をアップロード\n\n● 登録された仕入先の詳細調査：\n  → 「どんな会社？」「詳しく教えて」などで質問\n\n例：https://example-supplier.co.jp/',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // URLパターンを検出
      const urlMatch = input.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const response = await fetch('/api/extract-company-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlMatch[0] })
        });

        if (!response.ok) throw new Error('仕入先情報の取得に失敗しました');

        const data = await response.json();
        
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: `仕入先情報を取得しました。以下の情報をフォームに入力します：\n\n会社名: ${data.companyName || '不明'}${data.companyNameKana ? `\n会社名カナ: ${data.companyNameKana}` : ''}${data.department ? `\n部署: ${data.department}` : ''}\n\n住所情報:${data.postalCode ? `\n郵便番号: ${data.postalCode}` : ''}${data.prefecture ? `\n都道府県: ${data.prefecture}` : ''}${data.city ? `\n市区町村: ${data.city}` : ''}${data.address1 ? `\n住所1: ${data.address1}` : ''}${data.address2 ? `\n住所2: ${data.address2}` : ''}${data.address ? `\n住所: ${data.address}` : '不明'}\n\n連絡先:\n電話番号: ${data.phone || '不明'}${data.fax ? `\nFAX: ${data.fax}` : ''}\nメール: ${data.email || '不明'}${data.website ? `\nウェブサイト: ${data.website}` : ''}${data.contactPerson ? `\n\n担当者情報:\n名前: ${data.contactPerson}` : ''}${data.notes ? `\n\n備考: ${data.notes}` : ''}`,
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        onDataExtracted(data);
        toast.success('仕入先情報を入力しました');
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
            throw new Error('仕入先情報の調査に失敗しました');
          }
        } else {
          // 仕入先登録に関係ない質問への応答
          const assistantMessage: Message = {
            id: Date.now().toString(),
            content: '😊 申し訳ございません。私は仕入先登録専用のアシスタントです。\n\n以下のことでお手伝いできます：\n• 仕入先情報の自動入力（URLまたは名刺画像）\n• 登録された仕入先の詳細情報提供\n\n他のことについてはお答えできかねます。',
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
      <div className="flex items-center gap-2 p-4 border-b bg-orange-50">
        <Bot className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-gray-800">仕入先情報入力アシスタント</h3>
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
                message.role === 'user' ? 'bg-blue-500' : 'bg-orange-500'
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
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
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
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="質問を入力してください..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <Upload className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
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