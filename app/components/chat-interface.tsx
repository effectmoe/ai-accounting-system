'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DocumentGenerator, generateDocumentHTML, DocumentData } from '@/lib/document-generator';
import { OCRProcessor } from '@/lib/ocr-processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const documentGenerator = new DocumentGenerator();
const ocrProcessor = new OCRProcessor();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: 'image';
    url: string;
    name: string;
  }>;
  documentData?: DocumentData;
  actions?: Array<{
    label: string;
    action: 'download_pdf' | 'confirm_journal' | 'edit_document' | 'save_document' | 'view_documents';
    data?: any;
  }>;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAction = async (action: string, data: any) => {
    if (action === 'download_pdf') {
      try {
        // PDFライブラリの動的インポート（クライアントサイドのみ）
        const { downloadPDF } = await import('@/lib/pdf-export');
        
        // ローディングメッセージ
        const loadingMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'PDFを生成しています...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // PDF生成とダウンロード
        await downloadPDF(data);
        
        // 成功メッセージ（ローディングメッセージを削除して追加）
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
          return [...filtered, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${data.documentNumber}.pdf をダウンロードしました。`,
            timestamp: new Date()
          }];
        });
      } catch (error) {
        console.error('PDF生成エラー:', error);
        
        // エラー時はHTMLでダウンロード（フォールバック）
        const html = generateDocumentHTML(data);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.documentNumber}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const feedbackMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `PDF生成中にエラーが発生したため、HTML形式でダウンロードしました。\n${data.documentNumber}.html`,
          timestamp: new Date()
        };
        setMessages(prev => prev.filter(msg => msg.content !== 'PDFを生成しています...').concat(feedbackMessage));
      }
    } else if (action === 'save_document') {
      try {
        // 文書保存サービスの動的インポート
        const { DocumentService } = await import('@/services/document-service');
        
        // ローディングメッセージ
        const loadingMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '文書を保存しています...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // 文書を保存
        const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用
        const savedDoc = await DocumentService.saveDocument(data, companyId);
        
        // 成功メッセージ
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
          return [...filtered, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `文書を保存しました。\n\n文書番号: ${savedDoc.documentNumber}\nステータス: 下書き\n\n文書一覧で確認できます。`,
            timestamp: new Date(),
            actions: [{
              label: '文書一覧を表示',
              action: 'view_documents',
              data: null
            }]
          }];
        });
      } catch (error) {
        console.error('文書保存エラー:', error);
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '文書の保存中にエラーが発生しました。もう一度お試しください。',
          timestamp: new Date()
        };
        setMessages(prev => prev.filter(msg => msg.content !== '文書を保存しています...').concat(errorMessage));
      }
    } else if (action === 'view_documents') {
      // 文書一覧ページに遷移
      window.open('/documents', '_blank');
    } else if (action === 'confirm_journal') {
      try {
        // 仕訳保存サービスの動的インポート
        const { JournalService } = await import('@/services/journal-service');
        
        // ローディングメッセージ
        const loadingMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '仕訳を登録しています...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, loadingMessage]);
        
        // 勘定科目IDの取得（簡易実装）
        const companyId = '11111111-1111-1111-1111-111111111111';
        const debitAccountId = '11111111-1111-1111-1111-111111111111'; // デモ用
        const creditAccountId = '22222222-2222-2222-2222-222222222222'; // デモ用
        
        // 仕訳エントリを作成
        const journalEntry = {
          companyId,
          entryDate: data.date,
          description: data.description,
          sourceType: 'manual' as const,
          status: 'draft' as const,
          lines: [
            {
              accountId: debitAccountId,
              accountCode: '605',
              accountName: data.debitAccount,
              debitAmount: data.amount,
              creditAmount: 0,
              taxRate: data.taxRate,
              taxAmount: data.taxAmount,
              isTaxIncluded: data.isTaxIncluded
            },
            {
              accountId: creditAccountId,
              accountCode: '100',
              accountName: data.creditAccount,
              debitAmount: 0,
              creditAmount: data.amount,
              taxRate: data.taxRate,
              taxAmount: data.taxAmount,
              isTaxIncluded: data.isTaxIncluded
            }
          ]
        };
        
        const savedEntry = await JournalService.saveJournalEntry(journalEntry);
        
        // 成功メッセージ
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.id !== loadingMessage.id);
          return [...filtered, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `仕訳を登録しました。\n\n仕訳番号: ${savedEntry.entryNumber}\n日付: ${data.date}\n借方: ${data.debitAccount} ${data.amount}円\n貸方: ${data.creditAccount} ${data.amount}円\n摘要: ${data.description}`,
            timestamp: new Date()
          }];
        });
      } catch (error) {
        console.error('仕訳保存エラー:', error);
        
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '仕訳の登録中にエラーが発生しました。もう一度お試しください。',
          timestamp: new Date()
        };
        setMessages(prev => prev.filter(msg => msg.content !== '仕訳を登録しています...').concat(errorMessage));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setAttachedFile(file);
    } else if (file) {
      alert('画像ファイル（PNG, JPG, JPEG）またはPDFファイルをアップロードしてください。');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachedFile ? [{
        type: 'image',
        url: URL.createObjectURL(attachedFile),
        name: attachedFile.name
      }] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await processUserInput(userMessage.content, attachedFile);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        documentData: result.documentData,
        actions: result.actions
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 処理関数
  async function processUserInput(text: string, file: File | null): Promise<{ content: string; documentData?: DocumentData; actions?: Message['actions'] }> {
    const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用固定値
    
    // 領収書・PDFのOCR処理
    if (file) {
      try {
        const ocrResult = await ocrProcessor.processReceiptFile(file);
        const journalEntry = await ocrProcessor.createJournalEntry(ocrResult, companyId);
        
        const fileTypeLabel = file.type === 'application/pdf' ? 'PDF文書' : '領収書';
        
        return {
          content: `${fileTypeLabel}を解析しました。\n\n【解析結果】\n発行者: ${ocrResult.vendor}\n日付: ${ocrResult.date}\n金額: ¥${ocrResult.amount?.toLocaleString()}（税込）\n消費税: ¥${ocrResult.taxAmount?.toLocaleString()}\n\n【自動仕訳案】\n借方: ${journalEntry.debitAccount} ${journalEntry.amount}円\n貸方: ${journalEntry.creditAccount} ${journalEntry.amount}円\n摘要: ${journalEntry.description}\n\nこの内容で登録してよろしいですか？`,
          actions: [{
            label: '仕訳を登録',
            action: 'confirm_journal',
            data: journalEntry
          }]
        };
      } catch (error) {
        return {
          content: `${file.type === 'application/pdf' ? 'PDF' : '画像'}ファイルの解析中にエラーが発生しました。ファイルが正常であることを確認して、再度お試しください。\n\nエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    // 見積書・請求書・納品書・領収書の作成
    if (text.includes('見積') || text.includes('請求') || text.includes('納品') || text.includes('領収')) {
      try {
        const documentData = await documentGenerator.generateFromNaturalLanguage(text, companyId);
        const typeLabels = {
          estimate: '見積書',
          invoice: '請求書', 
          delivery_note: '納品書',
          receipt: '領収書'
        };
        
        return {
          content: `${typeLabels[documentData.documentType]}を作成しました。\n\n【内容】\n宛先: ${documentData.partner.name}\n金額: ¥${documentData.total.toLocaleString()}（税込）\n発行日: ${documentData.issueDate}\n\nPDFで出力しますか？`,
          documentData,
          actions: [
            {
              label: 'PDFダウンロード',
              action: 'download_pdf',
              data: documentData
            },
            {
              label: '保存',
              action: 'save_document',
              data: documentData
            }
          ]
        };
      } catch (error) {
        return {
          content: '文書の作成中にエラーが発生しました。もう少し詳しい情報を教えてください。'
        };
      }
    }

    // 自然言語での仕訳入力
    if (text.includes('飲み') || text.includes('交際') || text.includes('仕訳')) {
      const amountMatch = text.match(/(\d+[,，\d]*)\s*円/);
      const amount = amountMatch ? parseInt(amountMatch[1].replace(/[,，]/g, '')) : 0;
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
      const date = dateMatch ? `2025-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}` : new Date().toISOString().split('T')[0];
      
      const journalEntry = {
        date,
        description: '顧客との飲食代',
        debitAccount: '接待交際費',
        creditAccount: '現金',
        amount,
        taxAmount: Math.round(amount * 0.1 / 1.1)
      };
      
      return {
        content: `承知いたしました。以下の仕訳を作成します：\n\n日付: ${date}\n借方: ${journalEntry.debitAccount} ${journalEntry.amount}円\n貸方: ${journalEntry.creditAccount} ${journalEntry.amount}円\n摘要: ${journalEntry.description}\n\nこの内容で登録してよろしいですか？`,
        actions: [{
          label: '仕訳を登録',
          action: 'confirm_journal',
          data: journalEntry
        }]
      };
    }

    // デフォルトレスポンス
    return {
      content: `「${text}」について処理します。\n\n具体的にどのような処理をご希望ですか？\n・仕訳の作成\n・見積書/請求書/領収書の作成\n・取引の検索\n・レポートの作成`
    };
  }

  return (
    <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          AI会計アシスタント
        </h2>
        <p className="text-sm text-gray-500">
          自然な言葉で会計処理をお手伝いします
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium mb-2">こんにちは！</p>
            <p className="text-sm">
              領収書の画像やPDFファイルをアップロードしたり、<br />
              「7/1にお客さんと飲みに行った」のように<br />
              自然な言葉で入力してください。
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.attachments && message.attachments.map((attachment, idx) => (
                  <div key={idx} className="mb-2">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-full h-auto rounded"
                    />
                    <p className="text-xs mt-1 opacity-80">{attachment.name}</p>
                  </div>
                ))}
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAction(action.action, action.data)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white hover:bg-blue-400'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ja-JP')}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-200">
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
            <span>📎 {attachedFile.name}</span>
            <button
              type="button"
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer p-2 text-gray-500 hover:text-gray-700"
          >
            📎
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !attachedFile)}
            className={`p-2 rounded-full ${
              isLoading || (!input.trim() && !attachedFile)
                ? 'bg-gray-300 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}