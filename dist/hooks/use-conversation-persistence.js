"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useConversationPersistence = useConversationPersistence;
const react_1 = require("react");
const logger_1 = require("@/lib/logger");
function useConversationPersistence({ conversationId, companyId, invoiceId, enabled = true }) {
    const messagesBufferRef = (0, react_1.useRef)([]);
    const saveTimeoutRef = (0, react_1.useRef)();
    // 会話を保存する関数
    const saveConversation = (0, react_1.useCallback)(async (messages, metadata) => {
        if (!enabled || !conversationId || !companyId || messages.length === 0) {
            return;
        }
        try {
            logger_1.logger.debug('[ConversationPersistence] Saving conversation:', {
                conversationId,
                messagesCount: messages.length
            });
            const response = await fetch('/api/ai-conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    invoiceId,
                    companyId,
                    messages,
                    metadata
                })
            });
            if (!response.ok) {
                logger_1.logger.error('[ConversationPersistence] Failed to save conversation');
            }
            else {
                const result = await response.json();
                logger_1.logger.debug('[ConversationPersistence] Conversation saved:', result);
            }
        }
        catch (error) {
            logger_1.logger.error('[ConversationPersistence] Error saving conversation:', error);
        }
    }, [conversationId, companyId, invoiceId, enabled]);
    // メッセージを追加し、遅延保存する関数
    const addMessages = (0, react_1.useCallback)((newMessages, metadata) => {
        if (!enabled)
            return;
        // バッファに追加
        messagesBufferRef.current = [...messagesBufferRef.current, ...newMessages];
        // 既存のタイムアウトをクリア
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // 2秒後に保存（連続的な入力をまとめて保存）
        saveTimeoutRef.current = setTimeout(() => {
            if (messagesBufferRef.current.length > 0) {
                saveConversation(messagesBufferRef.current, metadata);
                messagesBufferRef.current = [];
            }
        }, 2000);
    }, [enabled, saveConversation]);
    // 即座に保存する関数
    const saveImmediately = (0, react_1.useCallback)(async (messages, metadata) => {
        if (!enabled)
            return;
        // タイムアウトをクリア
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        // バッファに残っているメッセージも含めて保存
        const allMessages = [...messagesBufferRef.current, ...messages];
        messagesBufferRef.current = [];
        if (allMessages.length > 0) {
            await saveConversation(allMessages, metadata);
        }
    }, [enabled, saveConversation]);
    // コンポーネントのアンマウント時にバッファを保存
    (0, react_1.useEffect)(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (messagesBufferRef.current.length > 0 && enabled) {
                // 同期的に保存を試みる（ベストエフォート）
                saveConversation(messagesBufferRef.current);
            }
        };
    }, [enabled, saveConversation]);
    return {
        addMessages,
        saveImmediately
    };
}
