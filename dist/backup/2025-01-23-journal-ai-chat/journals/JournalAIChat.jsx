"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JournalAIChat;
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
function JournalAIChat({ journal, journalId }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(true);
    const [isMinimized, setIsMinimized] = (0, react_1.useState)(false);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [input, setInput] = (0, react_1.useState)('');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const scrollAreaRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    // 初期メッセージの設定
    (0, react_1.useEffect)(() => {
        if (messages.length === 0) {
            const initialMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `こんにちは！仕訳番号「${journal.journalNumber}」について質問をお受けします。\n\nこの仕訳の内容、勘定科目、税務処理などについて、どのようなことでもお尋ねください。\n\n例えば：\n• この仕訳の税務上の扱いは？\n• 勘定科目の選択は適切ですか？\n• 消費税の計算方法について教えてください`,
                timestamp: new Date()
            };
            setMessages([initialMessage]);
        }
    }, [journal.journalNumber]);
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
            const response = await fetch(`/api/journals/${journalId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    journalData: journal,
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
    if (!isOpen)
        return null;
    return (<div className="fixed bottom-4 right-4 z-40" style={{ maxWidth: '400px', width: '90vw' }}>
      <card_1.Card className={`bg-white shadow-lg border ${isMinimized ? 'h-14' : 'h-[500px]'} flex flex-col transition-all duration-300`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b bg-violet-50">
          <div className="flex items-center gap-2">
            <lucide_react_1.MessageSquare className="h-5 w-5 text-violet-600"/>
            <h3 className="text-sm font-semibold">この仕訳について質問する</h3>
          </div>
          <div className="flex items-center gap-1">
            <button_1.Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="h-8 w-8">
              {isMinimized ? (<lucide_react_1.Maximize2 className="h-4 w-4"/>) : (<lucide_react_1.Minimize2 className="h-4 w-4"/>)}
            </button_1.Button>
            <button_1.Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
              <lucide_react_1.X className="h-4 w-4"/>
            </button_1.Button>
          </div>
        </div>

        {!isMinimized && (<>
            {/* エラー表示 */}
            {error && (<alert_1.Alert variant="destructive" className="m-3 mb-0">
                <lucide_react_1.AlertCircle className="h-4 w-4"/>
                <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
              </alert_1.Alert>)}

            {/* チャットメッセージエリア */}
            <scroll_area_1.ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
              <div className="space-y-3">
                {messages.map(message => (<div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (<div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <lucide_react_1.Bot className="h-4 w-4 text-violet-600"/>
                      </div>)}
                    <div className={`max-w-[80%] rounded-lg p-2 ${message.role === 'user'
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
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                      <lucide_react_1.Bot className="h-4 w-4 text-violet-600"/>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
                    </div>
                  </div>)}
              </div>
            </scroll_area_1.ScrollArea>

            {/* 入力エリア */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <input_1.Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="質問を入力してください..." disabled={isLoading} className="flex-1 text-sm"/>
                <button_1.Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="bg-violet-600 hover:bg-violet-700">
                  <lucide_react_1.Send className="h-4 w-4"/>
                </button_1.Button>
              </div>
            </div>
          </>)}
      </card_1.Card>
    </div>);
}
