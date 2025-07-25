"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentAIChat;
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const scroll_area_1 = require("@/components/ui/scroll-area");
const alert_1 = require("@/components/ui/alert");
const logger_1 = require("@/lib/logger");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const documentTypeLabels = {
    estimate: '見積書',
    invoice: '請求書',
    delivery_note: '納品書',
    receipt: '領収書'
};
function DocumentAIChat({ document, documentId }) {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(true);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [input, setInput] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [showHistoryInfo, setShowHistoryInfo] = (0, react_1.useState)(false);
    const scrollAreaRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    // LocalStorageのキー
    const STORAGE_KEY = `document_chat_${documentId}`;
    // LocalStorageから履歴を読み込む関数
    const loadChatHistory = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // タイムスタンプをDateオブジェクトに変換
                const messagesWithDates = parsed.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                return messagesWithDates;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load chat history:', error);
        }
        return [];
    };
    // LocalStorageに履歴を保存する関数
    const saveChatHistory = (messagesToSave) => {
        try {
            // 最新の50件のみ保存（ストレージ容量対策）
            const recentMessages = messagesToSave.slice(-50);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(recentMessages));
        }
        catch (error) {
            logger_1.logger.error('Failed to save chat history:', error);
            // ストレージがいっぱいの場合は古い履歴を削除
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                try {
                    // すべての文書チャット履歴を取得して、古いものから削除
                    const keys = Object.keys(localStorage).filter(key => key.startsWith('document_chat_'));
                    if (keys.length > 0) {
                        // 最も古いキーを削除
                        localStorage.removeItem(keys[0]);
                        // 再度保存を試みる
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave.slice(-50)));
                    }
                }
                catch (retryError) {
                    logger_1.logger.error('Failed to save after cleanup:', retryError);
                }
            }
        }
    };
    // 古い履歴を削除する関数（30日以上前のメッセージを削除）
    const cleanOldHistory = () => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            // すべての文書チャット履歴のキーを取得
            const keys = Object.keys(localStorage).filter(key => key.startsWith('document_chat_'));
            keys.forEach(key => {
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const messages = JSON.parse(stored);
                        if (messages.length > 0) {
                            const lastMessageDate = new Date(messages[messages.length - 1].timestamp);
                            // 最後のメッセージが30日以上前の場合は削除
                            if (lastMessageDate < thirtyDaysAgo) {
                                localStorage.removeItem(key);
                                logger_1.logger.info(`Removed old chat history: ${key}`);
                            }
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Failed to clean history for key ${key}:`, error);
                    // エラーが発生したキーは削除
                    localStorage.removeItem(key);
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to clean old histories:', error);
        }
    };
    // 初期化時にLocalStorageから履歴を読み込む
    (0, react_1.useEffect)(() => {
        // デバッグログを追加
        console.log('=== DocumentAIChat Debug ===');
        console.log('Document:', document);
        console.log('Document ID:', documentId);
        console.log('Document Type:', document?.document_type);
        console.log('Document Number:', document?.document_number);
        console.log('===========================');
        // 古い履歴のクリーンアップ（初回のみ）
        cleanOldHistory();
        const savedMessages = loadChatHistory();
        if (savedMessages.length > 0) {
            setMessages(savedMessages);
        }
        else {
            // 新規の場合は初期メッセージを設定
            const docType = documentTypeLabels[document.document_type] || '文書';
            const docNumber = document.document_number || '不明';
            const initialMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `こんにちは！${docType}「${docNumber}」について質問をお受けします。

この文書に関して、以下のような質問にお答えできます：
• この${document.document_type === 'receipt' ? '領収書' : '文書'}の内容について詳しく教えてください
• 税務上の扱いはどうなりますか？
• 仕訳を作成する際の注意点は？
${document.receipt_type === 'parking' ? '• 駐車場代の経費計上について教えてください' : ''}
• この金額の妥当性を確認できますか？`,
                timestamp: new Date()
            };
            setMessages([initialMessage]);
        }
    }, [documentId, document]); // documentIdまたはdocumentが変わったときにも再読み込み
    // メッセージが更新されたらLocalStorageに保存
    (0, react_1.useEffect)(() => {
        if (messages.length > 0) {
            saveChatHistory(messages);
        }
    }, [messages]);
    // メッセージが追加されたらスクロール
    (0, react_1.useEffect)(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);
    // メッセージ送信処理
    const sendMessage = async () => {
        const messageText = input.trim();
        if (!messageText || isLoading)
            return;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/documents/${documentId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    documentData: document,
                    conversationHistory: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '処理中にエラーが発生しました');
            }
            const result = await response.json();
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        }
        catch (error) {
            logger_1.logger.error('Error sending message:', error);
            setError(error instanceof Error ? error.message : '予期しないエラーが発生しました');
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '申し訳ございません。処理中にエラーが発生しました。もう一度お試しください。',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    // エンターキーで送信
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
            e.preventDefault();
            sendMessage();
        }
    };
    // チャット履歴をクリアする関数
    const clearChatHistory = () => {
        if (confirm('この文書のチャット履歴をすべて削除しますか？\nこの操作は取り消せません。')) {
            try {
                localStorage.removeItem(STORAGE_KEY);
                // 初期メッセージを再設定
                const docType = documentTypeLabels[document.document_type] || '文書';
                const docNumber = document.document_number || '不明';
                const initialMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `こんにちは！${docType}「${docNumber}」について質問をお受けします。

この文書に関して、以下のような質問にお答えできます：
• この${document.document_type === 'receipt' ? '領収書' : '文書'}の内容について詳しく教えてください
• 税務上の扱いはどうなりますか？
• 仕訳を作成する際の注意点は？
${document.receipt_type === 'parking' ? '• 駐車場代の経費計上について教えてください' : ''}
• この金額の妥当性を確認できますか？`,
                    timestamp: new Date()
                };
                setMessages([initialMessage]);
                setError(null);
            }
            catch (error) {
                logger_1.logger.error('Failed to clear chat history:', error);
                setError('履歴のクリアに失敗しました');
            }
        }
    };
    return (<card_1.Card className="mt-6">
      <card_1.CardHeader className="bg-purple-50 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.Receipt className="h-5 w-5 text-purple-600"/>
            <card_1.CardTitle className="text-lg">この{documentTypeLabels[document.document_type]}について質問する</card_1.CardTitle>
            {messages.length > 1 && (<div className="flex items-center gap-1 text-xs text-gray-500 cursor-help" onMouseEnter={() => setShowHistoryInfo(true)} onMouseLeave={() => setShowHistoryInfo(false)}>
                <lucide_react_1.History className="h-3 w-3"/>
                <span>{messages.length - 1}件の会話</span>
              </div>)}
          </div>
          <div className="flex items-center gap-1">
            {isExpanded && messages.length > 1 && (<button_1.Button variant="ghost" size="icon" onClick={(e) => {
                e.stopPropagation();
                clearChatHistory();
            }} className="h-8 w-8 text-gray-500 hover:text-red-600" title="チャット履歴をクリア">
                <lucide_react_1.Trash2 className="h-4 w-4"/>
              </button_1.Button>)}
            <button_1.Button variant="ghost" size="icon" onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
        }} className="h-8 w-8">
              {isExpanded ? (<lucide_react_1.Minimize2 className="h-4 w-4"/>) : (<lucide_react_1.Maximize2 className="h-4 w-4"/>)}
            </button_1.Button>
          </div>
        </div>
        {!isExpanded && (<p className="text-sm text-gray-600 mt-2">
            クリックして展開し、文書について質問する
          </p>)}
      </card_1.CardHeader>

      {isExpanded && (<card_1.CardContent className="p-0">
          <div className="flex flex-col" style={{ height: '500px' }}>
            {/* エラー表示 */}
            {error && (<alert_1.Alert variant="destructive" className="m-3 mb-0">
                <lucide_react_1.AlertCircle className="h-4 w-4"/>
                <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
              </alert_1.Alert>)}

            {/* 履歴保存情報 */}
            {showHistoryInfo && (<alert_1.Alert className="m-3 mb-0">
                <lucide_react_1.Info className="h-4 w-4"/>
                <alert_1.AlertDescription>
                  チャット履歴はブラウザに保存され、最新50件まで保持されます。
                  30日以上前の履歴は自動的に削除されます。
                </alert_1.AlertDescription>
              </alert_1.Alert>)}

            {/* チャットメッセージエリア */}
            <scroll_area_1.ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-3">
                {messages.map(message => (<div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (<div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <lucide_react_1.Bot className="h-4 w-4 text-purple-600"/>
                      </div>)}
                    <div className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'}`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {(0, date_fns_1.format)(message.timestamp, 'HH:mm', { locale: locale_1.ja })}
                      </p>
                    </div>
                    {message.role === 'user' && (<div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <lucide_react_1.User className="h-4 w-4 text-white"/>
                      </div>)}
                  </div>))}
                {isLoading && (<div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <lucide_react_1.Bot className="h-4 w-4 text-purple-600"/>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
                    </div>
                  </div>)}
              </div>
            </scroll_area_1.ScrollArea>

            {/* 入力エリア */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input_1.Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="質問を入力してください..." disabled={isLoading} className="flex-1 text-sm bg-white"/>
                <button_1.Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="bg-purple-600 hover:bg-purple-700">
                  <lucide_react_1.Send className="h-4 w-4"/>
                </button_1.Button>
              </div>
            </div>
          </div>
        </card_1.CardContent>)}
    </card_1.Card>);
}
