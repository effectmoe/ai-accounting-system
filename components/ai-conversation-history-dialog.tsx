'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { 
  Bot, 
  User, 
  Loader2, 
  MessageSquare,
  X,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';
import { AIConversation } from '@/types/ai-conversation';

interface AIConversationHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  invoiceId?: string;
}

export default function AIConversationHistoryDialog({ 
  isOpen, 
  onClose, 
  conversationId,
  invoiceId 
}: AIConversationHistoryDialogProps) {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && (conversationId || invoiceId)) {
      fetchConversation();
    }
  }, [isOpen, conversationId, invoiceId]);

  const fetchConversation = async () => {
    setIsLoading(true);
    setError(null);
    setConversation(null); // 前の状態をクリア
    
    try {
      logger.debug('[AIConversationHistoryDialog] Fetching conversation with:', {
        conversationId,
        conversationIdType: typeof conversationId,
        conversationIdLength: conversationId?.length,
        invoiceId,
        invoiceIdType: typeof invoiceId
      });
      
      const params = new URLSearchParams();
      if (conversationId) params.append('conversationId', String(conversationId)); // 文字列として送信
      if (invoiceId) params.append('invoiceId', invoiceId);
      
      logger.debug('[AIConversationHistoryDialog] Request URL:', `/api/ai-conversations?${params.toString()}`);
      
      const response = await fetch(`/api/ai-conversations?${params.toString()}`);
      const data = await response.json();
      
      logger.debug('[AIConversationHistoryDialog] API Response:', {
        status: response.status,
        ok: response.ok,
        dataSuccess: data.success,
        dataError: data.error,
        conversation: data.conversation,
        conversationExists: !!data.conversation,
        messagesCount: data.conversation?.messages?.length || 0
      });
      
      if (!response.ok || !data.success) {
        logger.error('[AIConversationHistoryDialog] API Error:', data.error);
        throw new Error(data.error || '会話履歴の取得に失敗しました');
      }
      
      logger.debug('[AIConversationHistoryDialog] Setting conversation:', data.conversation);
      setConversation(data.conversation);
      logger.debug('[AIConversationHistoryDialog] Conversation set successfully');
    } catch (error) {
      logger.error('会話履歴取得エラー:', error);
      setError(error instanceof Error ? error.message : '会話履歴の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!conversation) return;

    const conversationText = conversation.messages
      .map(msg => `[${safeFormatDate(msg.timestamp, 'yyyy/MM/dd HH:mm:ss')}] ${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-conversation-${format(new Date(), 'yyyyMMdd-HHmmss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] h-[80vh] flex flex-col bg-white mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">AI会話履歴</h2>
            {conversation && (
              <span className="text-sm text-gray-500">
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(new Date(conversation.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!conversation || conversation.messages.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              ダウンロード
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : conversation ? (
            <div className="space-y-4">
              {logger.debug('[AIConversationHistoryDialog] Rendering conversation with messages:', conversation.messages?.length)}
              {conversation.messages?.length > 0 ? conversation.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-blue-50 text-gray-900 border border-blue-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {safeFormatDate(message.timestamp, 'HH:mm')}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                </div>
              )) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  会話のメッセージがありません
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              会話履歴がありません
            </div>
          )}
        </ScrollArea>

        {conversation?.metadata && (
          <div className="p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-600">
              <p>使用モデル: {conversation.metadata.model || 'DeepSeek'}</p>
              {conversation.metadata.totalTokens && (
                <p>トークン数: {conversation.metadata.totalTokens.toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}