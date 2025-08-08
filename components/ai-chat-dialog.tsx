'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  X,
  Download,
  Mic,
  MicOff
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { normalizeConversationId, generateConversationId } from '@/lib/ai-conversation-helper';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  invoiceData?: any; // 抽出された請求書データ
  quickReplies?: Array<{ text: string; value: string }>; // クイック返信オプション
}

interface AIChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (invoiceData: any) => void; // 後方互換性のため残す
  onDataApply?: (data: any) => void; // 新しい汎用的なコールバック
  initialInvoiceData?: any; // 既存のドキュメントデータ（編集モード用）
  mode?: 'create' | 'edit'; // 作成モードか編集モード
  companyId?: string; // 会話履歴保存用
  existingConversationId?: string; // 既存の会話ID（編集モード用）
  invoiceId?: string; // ドキュメントID（会話履歴保存用）
  documentType?: 'invoice' | 'quote'; // ドキュメントタイプ
  title?: string; // ダイアログタイトル
  placeholder?: string; // 入力プレースホルダー
}

export default function AIChatDialog({ 
  isOpen, 
  onClose, 
  onComplete, 
  onDataApply,
  initialInvoiceData,
  mode = 'create',
  companyId,
  existingConversationId,
  invoiceId,
  documentType = 'invoice',
  title,
  placeholder
}: AIChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState<any>(
    mode === 'create' 
      ? { customerName: '', items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 } 
      : (initialInvoiceData || { customerName: '', items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 })
  );
  const [conversationId, setConversationId] = useState<string | null>(normalizeConversationId(existingConversationId));
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  
  // 音声認識フック
  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,  // trueに変更：音声認識を継続的に行う
    interimResults: true,
    language: 'ja-JP',
    speechTimeout: 12000  // デフォルト10秒 + 2秒延長
  });

  // デバッグ用：音声認識の状態をコンソールに出力
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[AIChatDialog] 音声認識デバッグ情報:', {
        isSupported: isSpeechSupported,
        isListening,
        hasTranscript: !!transcript,
        transcriptLength: transcript.length,
        hasInterimTranscript: !!interimTranscript,
        speechError,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          protocol: window.location.protocol,
          hostname: window.location.hostname
        }
      });
    }
  }, [isSpeechSupported, isListening, transcript, interimTranscript, speechError]);

  // 初期メッセージの設定
  useEffect(() => {
    if (isOpen) {
      // ダイアログが開かれた時は常にメッセージをリセット
      if (messages.length === 0) {
        // セッション開始時のデータ設定（リセットしない）
        if (mode === 'edit' && initialInvoiceData) {
          // 編集モードの場合、初期データを完全にセット
          const completeInitialData = {
            ...initialInvoiceData,
            items: initialInvoiceData.items || [],
            subtotal: initialInvoiceData.subtotal || 0,
            taxAmount: initialInvoiceData.taxAmount || 0,
            totalAmount: initialInvoiceData.totalAmount || 0,
            invoiceDate: initialInvoiceData.invoiceDate || initialInvoiceData.issueDate,
            dueDate: initialInvoiceData.dueDate,
            customerName: initialInvoiceData.customerName || initialInvoiceData.customer?.companyName || initialInvoiceData.customer?.name || '',
            notes: initialInvoiceData.notes || '',
            paymentMethod: initialInvoiceData.paymentMethod || 'bank_transfer'
          };
          logger.debug('[AIChatDialog] Setting initial data for edit mode:', completeInitialData);
          setCurrentInvoiceData(completeInitialData);
        }
      
        // 編集モードの場合、現在の請求書データを含めた初期メッセージを作成
        let content = '';
        if (mode === 'create') {
          content = 'こんにちは！請求書作成をお手伝いします。\n\n例えば以下のような内容を教えてください：\n- 顧客名（〇〇会社様）\n- 請求内容（ウェブサイト制作費など）\n- 金額（50万円など）\n- 納期や支払期限\n\nどのような請求書を作成しますか？';
        } else if (mode === 'edit' && initialInvoiceData) {
          // 現在の請求書データを整形して表示
          const items = initialInvoiceData.items || [];
          const customerName = initialInvoiceData.customerName || '未設定';
          const totalAmount = items.reduce((sum: number, item: any) => sum + (item.amount || 0) + (item.taxAmount || 0), 0);
          
          content = `現在の請求書データ：\n`;
          content += `顧客名: ${customerName}\n`;
          content += `項目数: ${items.length}\n`;
          
          if (items.length > 0) {
            content += '\n現在の明細：\n';
            items.forEach((item: any, index: number) => {
              content += `${index + 1}. ${item.description || item.itemName}: ¥${((item.amount || 0) + (item.taxAmount || 0)).toLocaleString()}\n`;
            });
            content += '\n合計金額: ¥' + totalAmount.toLocaleString() + '（税込）\n';
            content += '\nどの部分を変更しますか？（明細の追加、金額の変更、項目の削除など）';
          } else {
            content += '\n現在明細がありません。どのような項目を追加しますか？';
          }
        } else {
          content = 'こんにちは！請求書の編集をお手伝いします。\n\nどの部分を変更したいですか？';
        }
      
        const initialMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          timestamp: new Date(),
          quickReplies: mode === 'create'
            ? [
                { text: '例を見る', value: '請求書の作成例を見せてください' }
              ]
            : [
                { text: '金額を変更', value: '金額を変更したいです' },
                { text: '明細を追加', value: '明細を追加したいです' },
                { text: '支払期限を変更', value: '支払期限を変更したいです' }
              ]
        };
        setMessages([initialMessage]);
        const newSessionId = Date.now().toString();
        setSessionId(newSessionId);
        
        // 会話IDの生成: ダイアログが開かれるたびに1つの会話IDを使用
        // 同じダイアログ内での複数の会話は同じIDで保存される
        if (!conversationId) {
          const newConversationId = generateConversationId();
          setConversationId(newConversationId);
          logger.debug('[AIChatDialog] New conversation started with ID:', newConversationId);
          logger.debug('[AIChatDialog] existingConversationId:', existingConversationId);
        } else {
          logger.debug('[AIChatDialog] Using existing conversation ID:', conversationId);
          logger.debug('[AIChatDialog] Normalized from:', existingConversationId, 'to:', conversationId);
        }
      }
    }
  }, [isOpen, mode, initialInvoiceData]);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // 強制再レンダリング用のステート
  const [renderKey, setRenderKey] = useState(0);
  
  // ボタンが有効かどうかを計算する関数
  const isButtonEnabled = () => {
    if (!currentInvoiceData || isLoading) {
      return false;
    }
    
    const hasCustomerName = currentInvoiceData.customerName && 
                           typeof currentInvoiceData.customerName === 'string' && 
                           currentInvoiceData.customerName.trim().length > 0;
    const hasItems = currentInvoiceData.items && 
                    Array.isArray(currentInvoiceData.items) && 
                    currentInvoiceData.items.length > 0;
    
    return hasCustomerName || hasItems;
  };

  // currentInvoiceDataの変更を監視
  useEffect(() => {
    const enabled = isButtonEnabled();
    logger.debug('[Frontend] Button state check:', {
      customerName: currentInvoiceData?.customerName,
      customerNameType: typeof currentInvoiceData?.customerName,
      customerNameLength: currentInvoiceData?.customerName?.length,
      customerNameTrimmedLength: currentInvoiceData?.customerName?.trim?.()?.length,
      items: currentInvoiceData?.items,
      itemsIsArray: Array.isArray(currentInvoiceData?.items),
      itemsLength: currentInvoiceData?.items?.length,
      isEnabled: enabled,
      isLoading
    });
    
    // データがある場合は強制再レンダリング
    if (enabled && !isLoading) {
      logger.debug('[Frontend] Data is valid, triggering re-render');
      setRenderKey(prev => prev + 1);
    }
  }, [currentInvoiceData, isLoading]);

  // カーソル位置を保存・取得する関数
  const saveCursorPosition = () => {
    if (inputRef.current) {
      const position = inputRef.current.selectionStart || 0;
      setCursorPosition(position);
      return position;
    }
    return 0;
  };

  // カーソル位置にテキストを挿入する関数
  const insertTextAtCursor = (textToInsert: string) => {
    if (inputRef.current) {
      const currentValue = input;
      const beforeCursor = currentValue.slice(0, cursorPosition);
      const afterCursor = currentValue.slice(cursorPosition);
      
      // 適切なスペース処理
      let finalText = beforeCursor;
      if (beforeCursor && !beforeCursor.endsWith(' ') && !beforeCursor.endsWith('　')) {
        finalText += ' ';
      }
      finalText += textToInsert;
      if (afterCursor && !afterCursor.startsWith(' ') && !afterCursor.startsWith('　')) {
        finalText += ' ';
      }
      finalText += afterCursor;
      
      setInput(finalText);
      
      // カーソル位置を挿入後の位置に更新
      const newCursorPosition = beforeCursor.length + (beforeCursor && !beforeCursor.endsWith(' ') && !beforeCursor.endsWith('　') ? 1 : 0) + textToInsert.length + (afterCursor && !afterCursor.startsWith(' ') && !afterCursor.startsWith('　') ? 1 : 0);
      
      // 次のフレームでカーソル位置を設定
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
          inputRef.current.focus();
          setCursorPosition(newCursorPosition);
        }
      }, 0);
    }
  };

  // 音声認識結果をカーソル位置に挿入
  useEffect(() => {
    if (transcript) {
      insertTextAtCursor(transcript);
      logger.debug('[SpeechRecognition] Transcript inserted at cursor position:', cursorPosition);
      // 挿入後にトランスクリプトをリセットして重複を防ぐ
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // 音声認識エラーをerrorステートに統合
  useEffect(() => {
    if (speechError) {
      setError(speechError);
    }
  }, [speechError]);


  // メッセージ送信処理
  const sendMessage = async (customInput?: string) => {
    const messageText = customInput || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
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
      // 会話履歴を含めてAPIに送信
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      conversationHistory.push({ role: 'user', content: userMessage.content });

      logger.debug('[Frontend] Sending data to API:', {
        conversation: userMessage.content,
        currentInvoiceData,
        sessionId,
        mode
      });
      
      // タイムアウトを設定（30秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // ドキュメントタイプに応じてAPIエンドポイントを決定
      const apiEndpoint = documentType === 'quote' 
        ? '/api/quotes/analyze-chat' 
        : '/api/invoices/analyze-chat';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: userMessage.content,
          conversationHistory,
          sessionId,
          currentInvoiceData,
          mode,
          initialInvoiceData: mode === 'edit' ? initialInvoiceData : null
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = '会話の処理に失敗しました';
        
        try {
          const errorData = await response.json();
          logger.error('[Frontend] Error response:', errorData);
          
          if (errorData.details) {
            errorMessage = errorData.details;
            
            // ユーザーフレンドリーなメッセージに変換
            if (errorData.details.includes('API key')) {
              errorMessage = 'AI サービスの設定に問題があります。管理者にお問い合わせください。';
            } else if (errorData.details.includes('timeout')) {
              errorMessage = 'リクエストがタイムアウトしました。もう一度お試しください。';
            } else if (errorData.details.includes('rate limit')) {
              errorMessage = 'API の利用制限に達しました。しばらく待ってから再度お試しください。';
            } else if (errorData.details.includes('service is temporarily unavailable')) {
              errorMessage = 'AI サービスが一時的に利用できません。後ほど再度お試しください。';
            }
          }
        } catch (parseError) {
          logger.error('[Frontend] Failed to parse error response');
          
          if (response.status === 504) {
            errorMessage = 'リクエストがタイムアウトしました。もう一度お試しください。';
          } else if (response.status === 500) {
            errorMessage = 'サーバーエラーが発生しました。管理者にお問い合わせください。';
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      logger.debug('[Frontend] Received response from API:', {
        message: result.message,
        data: result.data
      });

      // AIの応答メッセージ
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message || '請求書データを更新しました。',
        timestamp: new Date(),
        invoiceData: result.data,
        quickReplies: result.quickReplies
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 請求書データを更新
      if (result.data) {
        logger.debug('[Frontend] Updating invoice data:', result.data);
        logger.debug('[Frontend] Data details:', {
          items: result.data.items,
          subtotal: result.data.subtotal,
          taxAmount: result.data.taxAmount,
          totalAmount: result.data.totalAmount,
          customerName: result.data.customerName
        });
        
        // APIレスポンス直後にボタン状態をチェック
        const responseHasCustomerName = result.data.customerName && 
                                        typeof result.data.customerName === 'string' && 
                                        result.data.customerName.trim().length > 0;
        const responseHasItems = result.data.items && 
                                 Array.isArray(result.data.items) && 
                                 result.data.items.length > 0;
        
        logger.debug('[Frontend] API response validation:', {
          responseHasCustomerName,
          responseHasItems,
          shouldEnableButton: responseHasCustomerName || responseHasItems
        });
        
        // 各項目の詳細をログ出力
        if (result.data.items && result.data.items.length > 0) {
          logger.debug('[Frontend] Items detail:');
          result.data.items.forEach((item, index) => {
            logger.debug(`[Frontend] Item ${index}:`, {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              taxAmount: item.taxAmount,
              total: item.amount + item.taxAmount
            });
          });
        }
        
        // データが正しく設定されているか確認
        if (result.data.items && result.data.items.length > 0) {
          logger.debug('[Frontend] Items detected, updating currentInvoiceData');
        }
        if (result.data.customerName) {
          logger.debug('[Frontend] Customer name detected:', result.data.customerName);
        }
        
        // 完全なデータ構造で更新（既存データとマージ）
        setCurrentInvoiceData(prev => {
          logger.debug('[Frontend] State update START');
          logger.debug('[Frontend] Previous state:', prev);
          logger.debug('[Frontend] Result data from backend:', result.data);
          logger.debug('[Frontend] Customer name in result:', result.data.customerName);
          
          // itemsの更新は、バックエンドが明示的に送信した場合のみ行う
          // バックエンドは常に完全な更新後のitemsを送信するので、そのまま使用する
          const newData = {
            ...prev,
            ...result.data,
            // itemsは常にバックエンドから送られたものを使用
            items: result.data.items !== undefined ? result.data.items : prev.items || [],
            subtotal: result.data.subtotal !== undefined ? result.data.subtotal : prev.subtotal || 0,
            taxAmount: result.data.taxAmount !== undefined ? result.data.taxAmount : (result.data.totalTaxAmount !== undefined ? result.data.totalTaxAmount : prev.taxAmount || 0),
            totalAmount: result.data.totalAmount !== undefined ? result.data.totalAmount : prev.totalAmount || 0,
            // 日付フィールドも含める
            invoiceDate: result.data.invoiceDate !== undefined ? result.data.invoiceDate : prev.invoiceDate,
            dueDate: result.data.dueDate !== undefined ? result.data.dueDate : prev.dueDate,
            // その他のフィールドも確実に含める
            customerName: result.data.customerName !== undefined ? result.data.customerName : prev.customerName,
            notes: result.data.notes !== undefined ? result.data.notes : prev.notes,
            paymentMethod: result.data.paymentMethod !== undefined ? result.data.paymentMethod : prev.paymentMethod
          };
          
          logger.debug('[Frontend] New state will be:', newData);
          logger.debug('[Frontend] Customer name updated to:', newData.customerName);
          logger.debug('[Frontend] Date fields updated:', {
            invoiceDate: newData.invoiceDate,
            dueDate: newData.dueDate
          });
          logger.debug('[Frontend] Items update:', {
            prevItemsCount: prev.items?.length || 0,
            newItemsCount: newData.items?.length || 0,
            items: JSON.parse(JSON.stringify(newData.items))
          });
          
          // 各アイテムの詳細を個別にログ出力
          if (newData.items && newData.items.length > 0) {
            newData.items.forEach((item, index) => {
              logger.debug(`[Frontend] Item ${index} details:`, {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount,
                taxAmount: item.taxAmount,
                total: item.amount + item.taxAmount
              });
            });
          }
          
          logger.debug('[Frontend] State update END - returning newData');
          return newData;
        });
        
        // 強制再レンダリングをトリガー
        logger.debug('[Frontend] Triggering force re-render');
        setRenderKey(prev => prev + 1);
      } else {
        logger.debug('[Frontend] No data in result, not updating currentInvoiceData');
      }

    } catch (error) {
      logger.error('Error sending message:', error);
      
      let errorContent = '申し訳ございません。処理中にエラーが発生しました。もう一度お試しください。';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('タイムアウト')) {
          errorContent = 'リクエストがタイムアウトしました。ネットワーク接続を確認して、もう一度お試しください。';
        } else if (error.message) {
          errorContent = error.message;
        }
      }
      
      setError(errorContent);
      
      // エラーメッセージを追加
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 会話を完了して請求書データを確定
  const completeConversation = () => {
    logger.debug('[completeConversation] Called with currentInvoiceData:', currentInvoiceData);
    
    // 顧客名または明細が存在する場合に確定可能（金額は後で再計算されるため）
    const hasValidCustomerName = currentInvoiceData?.customerName && currentInvoiceData.customerName.trim() !== '';
    const hasValidItems = currentInvoiceData?.items && currentInvoiceData.items.length > 0;
    
    logger.debug('[completeConversation] Validation:', {
      hasValidCustomerName,
      hasValidItems,
      customerName: currentInvoiceData?.customerName,
      itemsLength: currentInvoiceData?.items?.length
    });
    
    if (currentInvoiceData && (hasValidCustomerName || hasValidItems)) {
      logger.debug('[Frontend] Completing conversation with data:', JSON.parse(JSON.stringify(currentInvoiceData)));
      logger.debug('[Frontend] Final data details:', {
        items: JSON.parse(JSON.stringify(currentInvoiceData.items)),
        subtotal: currentInvoiceData.subtotal,
        taxAmount: currentInvoiceData.taxAmount,
        totalAmount: currentInvoiceData.totalAmount,
        invoiceDate: currentInvoiceData.invoiceDate,
        dueDate: currentInvoiceData.dueDate,
        customerName: currentInvoiceData.customerName,
        notes: currentInvoiceData.notes,
        paymentMethod: currentInvoiceData.paymentMethod
      });
      
      // 各アイテムの詳細も個別にログ
      if (currentInvoiceData.items && currentInvoiceData.items.length > 0) {
        logger.debug('[Frontend] Final items breakdown:');
        currentInvoiceData.items.forEach((item, index) => {
          logger.debug(`[Frontend] Final Item ${index}:`, {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            taxAmount: item.taxAmount,
            total: item.amount + item.taxAmount
          });
        });
      }
      
      // 全てのデータが含まれることを確認
      const completeData = {
        ...currentInvoiceData,
        aiConversationId: conversationId
      };
      
      logger.debug('[Frontend] Complete data to be passed:', completeData);
      
      // 新しいコールバックがある場合はそれを優先使用
      if (onDataApply) {
        onDataApply(completeData);
      } else if (onComplete) {
        onComplete(completeData);
      }
    } else {
      // エラーの詳細を表示
      let errorDetails = [];
      if (!currentInvoiceData) {
        errorDetails.push('データが存在しません');
      } else {
        if (!currentInvoiceData.customerName?.trim() && (!currentInvoiceData.items || currentInvoiceData.items.length === 0)) {
          errorDetails.push('顧客名と明細の両方が未入力です');
        }
      }
      setError(`${documentType === 'quote' ? '見積書' : '請求書'}データを確定できません。\n${errorDetails.join('\n')}`);
    }
  };

  // 会話ログをダウンロード
  const downloadConversationLog = () => {
    // 会話ログを整形
    let logContent = `AI${documentType === 'quote' ? '見積書' : '請求書'}${mode === 'create' ? '作成' : '編集'}アシスタント 会話ログ\n`;
    logContent += `=============================================\n`;
    logContent += `ダウンロード日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}\n`;
    logContent += `=============================================\n\n`;

    messages.forEach((message) => {
      const timestamp = format(message.timestamp, 'yyyy/MM/dd HH:mm:ss', { locale: ja });
      const speaker = message.role === 'user' ? 'ユーザー' : 'AIアシスタント';
      
      logContent += `[${timestamp}] ${speaker}\n`;
      logContent += `${message.content}\n`;
      logContent += `---------------------------------------------\n\n`;
    });

    // 現在の請求書データも追記
    if (currentInvoiceData && (currentInvoiceData.customerName || (currentInvoiceData.items && currentInvoiceData.items.length > 0))) {
      logContent += `\n=============================================\n`;
      logContent += `作成された請求書データ\n`;
      logContent += `=============================================\n\n`;
      
      if (currentInvoiceData.customerName) {
        logContent += `顧客名: ${currentInvoiceData.customerName}\n`;
      }
      
      if (currentInvoiceData.items && currentInvoiceData.items.length > 0) {
        logContent += `\n明細:\n`;
        currentInvoiceData.items.forEach((item: any, index: number) => {
          logContent += `${index + 1}. ${item.description}\n`;
          logContent += `   数量: ${item.quantity} ${item.unit || ''}\n`;
          logContent += `   単価: ¥${item.unitPrice.toLocaleString()}\n`;
          logContent += `   小計: ¥${item.amount.toLocaleString()}\n`;
          logContent += `   税額: ¥${item.taxAmount.toLocaleString()}\n`;
          logContent += `   合計: ¥${(item.amount + item.taxAmount).toLocaleString()}\n\n`;
        });
      }
      
      if (currentInvoiceData.subtotal !== undefined) {
        logContent += `\n小計: ¥${currentInvoiceData.subtotal.toLocaleString()}\n`;
        logContent += `税額: ¥${currentInvoiceData.taxAmount.toLocaleString()}\n`;
        logContent += `合計: ¥${currentInvoiceData.totalAmount.toLocaleString()}\n`;
      }
    }

    // ダウンロード処理
    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `請求書${mode === 'create' ? '作成' : '編集'}_会話ログ_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // エンターキーで送信
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col bg-white">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              {title || `AI${documentType === 'quote' ? '見積書' : '請求書'}${mode === 'create' ? '作成' : '編集'}アシスタント`}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              // ダイアログを閉じる際にデータをリセット
              setMessages([]);
              setCurrentInvoiceData({ customerName: '', items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 });
              setSessionId(null);
              setConversationId(null); // 次回開く時は新しい会話IDを生成
              setError(null);
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive" className="m-4 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        )}

        {/* 音声認識サポート状況表示（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && !isSpeechSupported && (
          <Alert className="m-4 mb-0 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <p className="font-medium mb-2">音声認識がサポートされていません</p>
              <div className="text-sm space-y-1">
                <p>ブラウザ: {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
                <p>プロトコル: {window.location.protocol}</p>
                <p>ホスト: {window.location.hostname}</p>
                <p className="mt-2">対応ブラウザ: Chrome、Edge、Safari（最新版）</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 現在の請求書データプレビュー */}
        {currentInvoiceData && (
          currentInvoiceData.customerName || 
          (currentInvoiceData.items && currentInvoiceData.items.length > 0) ||
          (currentInvoiceData.subtotal && currentInvoiceData.subtotal > 0) ||
          (currentInvoiceData.totalAmount && currentInvoiceData.totalAmount > 0)
        ) && (
          <div className="mx-4 mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">現在の{documentType === 'quote' ? '見積書' : '請求書'}データ</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              {currentInvoiceData.customerName && (
                <p>顧客: {currentInvoiceData.customerName}</p>
              )}
              {currentInvoiceData.items && currentInvoiceData.items.length > 0 && (
                <p>明細: {currentInvoiceData.items.map((item: any) => item.description).join(', ')}</p>
              )}
              {(() => {
                // 合計金額を正しく計算
                const subtotal = currentInvoiceData.subtotal || 0;
                const taxAmount = currentInvoiceData.taxAmount || 0;
                const totalAmount = currentInvoiceData.totalAmount || 0;
                
                logger.debug('[Frontend] Display calculation:', { subtotal, taxAmount, totalAmount });
                
                // デバッグ: ボタンの有効化条件をチェック
                const buttonDisabled = 
                  !currentInvoiceData || 
                  isLoading ||
                  (!currentInvoiceData.customerName?.trim() && (!currentInvoiceData.items || currentInvoiceData.items.length === 0));
                  
                logger.debug('[Frontend] Button disabled state:', {
                  disabled: buttonDisabled,
                  hasData: !!currentInvoiceData,
                  isLoading,
                  customerName: currentInvoiceData?.customerName,
                  itemsLength: currentInvoiceData?.items?.length || 0,
                  totalAmount: currentInvoiceData?.totalAmount || 0,
                  conditions: {
                    noData: !currentInvoiceData,
                    loading: isLoading,
                    noCustomerAndNoItems: !currentInvoiceData?.customerName?.trim() && (!currentInvoiceData?.items || currentInvoiceData.items.length === 0)
                  }
                });
                
                return totalAmount > 0 ? (
                  <p>合計: ¥{totalAmount.toLocaleString()}（税込）</p>
                ) : null;
              })()}
            </div>
          </div>
        )}

        {/* チャットメッセージエリア */}
        <ScrollArea className="flex-1 p-4 bg-gray-50" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white rounded-lg p-3'
                      : ''
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-2">
                      <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {format(message.timestamp, 'HH:mm', { locale: ja })}
                        </p>
                      </div>
                      {message.quickReplies && message.quickReplies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.quickReplies.map((reply, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                sendMessage(reply.value);
                              }}
                              disabled={isLoading}
                              className="text-sm"
                            >
                              {reply.text}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 text-gray-400">
                        {format(message.timestamp, 'HH:mm', { locale: ja })}
                      </p>
                    </>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 入力エリア */}
        <div className="p-4 border-t space-y-3 bg-white">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-input" className="text-sm text-gray-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
{placeholder || `AI${documentType === 'quote' ? '見積書' : '請求書'}アシスタントに質問や指示を入力してください`}
              </Label>
              <span className="text-xs text-gray-500">Enterで送信</span>
            </div>
            <div className="flex gap-2">
              <Input
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onSelect={() => {
                  // カーソル位置が変更された時に保存
                  if (inputRef.current && !isListening) {
                    setCursorPosition(inputRef.current.selectionStart || 0);
                  }
                }}
                onClick={() => {
                  // クリック時にもカーソル位置を保存
                  if (inputRef.current && !isListening) {
                    setTimeout(() => {
                      setCursorPosition(inputRef.current?.selectionStart || 0);
                    }, 0);
                  }
                }}
                placeholder={isListening ? '音声を認識中...' : '例: 山田商事さんに、ウェブサイト制作費として50万円の請求書を作成してください'}
                disabled={isLoading || isListening}
                className={`flex-1 placeholder:text-gray-400 ${isListening ? 'bg-red-50 border-red-300' : ''}`}
              />
              {/* 音声入力ボタン */}
              {isSpeechSupported && (
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isListening) {
                      stopListening();
                    } else {
                      // 音声認識開始時にカーソル位置を保存
                      saveCursorPosition();
                      setError(null);
                      // 音声認識開始前に明示的にリセット
                      resetTranscript();
                      startListening();
                    }
                  }}
                  disabled={isLoading}
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  title={isListening ? '音声認識を停止' : '音声入力を開始'}
                  className={isListening ? 'animate-pulse' : ''}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                disabled={!input.trim() || isLoading || isListening}
                size="icon"
                title="送信 (Enter)"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {(isLoading || isListening || interimTranscript) && (
              <div className="space-y-1">
                {isLoading && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    AIが応答を生成中...
                  </p>
                )}
                {isListening && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <Mic className="h-3 w-3 animate-pulse text-red-500" />
                    音声を認識中... （話し終わったらマイクボタンをクリックしてください）
                  </p>
                )}
                {interimTranscript && (
                  <p className="text-xs text-blue-600">
                    認識中: {interimTranscript}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* アクションボタン */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  // ダイアログを閉じる際にデータをリセット
                  setMessages([]);
                  setCurrentInvoiceData({ customerName: '', items: [], subtotal: 0, taxAmount: 0, totalAmount: 0 });
                  setSessionId(null);
                  setConversationId(null); // 次回開く時は新しい会話IDを生成
                  setError(null);
                  onClose();
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  downloadConversationLog();
                }}
                disabled={messages.length <= 1} // 初期メッセージのみの場合は無効
                title="会話ログをダウンロード"
              >
                <Download className="mr-2 h-4 w-4" />
                ログ
              </Button>
            </div>
            <Button
              key={`complete-btn-${renderKey}`}
              onClick={async (e) => {
                e.preventDefault();
                
                // 保存ボタンのクリック状態を確認
                logger.debug('[AIChatDialog] Save button clicked');
                logger.debug('[AIChatDialog] Document type:', documentType);
                logger.debug('[AIChatDialog] Current data:', currentInvoiceData);
                logger.debug('[AIChatDialog] Data validation:', {
                  hasCustomerName: !!currentInvoiceData?.customerName,
                  customerNameTrimmed: currentInvoiceData?.customerName?.trim(),
                  hasItems: !!(currentInvoiceData?.items && currentInvoiceData.items.length > 0),
                  itemsCount: currentInvoiceData?.items?.length || 0,
                  customerName: currentInvoiceData?.customerName,
                  subtotal: currentInvoiceData?.subtotal,
                  taxAmount: currentInvoiceData?.taxAmount,
                  totalAmount: currentInvoiceData?.totalAmount
                });
                
                // 各アイテムの詳細もログ出力
                if (currentInvoiceData?.items && currentInvoiceData.items.length > 0) {
                  logger.debug('[AIChatDialog] Items details:');
                  currentInvoiceData.items.forEach((item, index) => {
                    logger.debug(`[AIChatDialog] Item ${index}:`, {
                      description: item.description,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      amount: item.amount,
                      taxAmount: item.taxAmount,
                      total: item.amount + item.taxAmount
                    });
                  });
                }
                
                // 会話履歴を保存
                if (companyId && conversationId && messages.length > 1) {
                  // conversationIdの最終チェックと正規化
                  let finalConversationId = conversationId;
                  if (!conversationId.startsWith('conv_')) {
                    logger.warn('[AIChatDialog] Invalid conversationId format:', conversationId);
                    finalConversationId = `conv_${conversationId}`;
                    setConversationId(finalConversationId);
                    logger.debug('[AIChatDialog] Corrected conversationId to:', finalConversationId);
                  }
                  try {
                    logger.debug('[AIChatDialog] Saving conversation with ID:', finalConversationId);
                    logger.debug('[AIChatDialog] Message count:', messages.length);
                    logger.debug('[AIChatDialog] Current sessionId:', sessionId);
                    logger.debug('[AIChatDialog] existingConversationId prop:', existingConversationId);
                    
                    // 全てのメッセージを含めて保存
                    const conversationData = {
                      conversationId: String(finalConversationId), // 文字列として保存
                      invoiceId: invoiceId || currentInvoiceData._id,
                      companyId,
                      messages: messages.map(msg => ({
                        role: msg.role as 'user' | 'assistant',
                        content: msg.content,
                        timestamp: msg.timestamp
                      })),
                      metadata: {
                        model: 'deepseek',
                        invoiceData: currentInvoiceData,
                        messagesCount: messages.length,
                        sessionId: sessionId
                      }
                    };
                    
                    logger.debug('[AIChatDialog] Saving conversation with data:', {
                      conversationId: conversationData.conversationId,
                      invoiceId: conversationData.invoiceId,
                      messagesCount: conversationData.messages.length,
                      sessionId: sessionId
                    });
                    
                    const response = await fetch('/api/ai-conversations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(conversationData)
                    });
                    
                    if (!response.ok) {
                      logger.error('会話履歴の保存に失敗しました');
                    } else {
                      const result = await response.json();
                      logger.debug('[AIChatDialog] Conversation saved successfully:', result);
                      logger.debug('[AIChatDialog] Saved conversation ID:', finalConversationId);
                      logger.debug('[AIChatDialog] Total messages saved:', result.messagesCount || messages.length);
                      // 保存が成功した場合、データに会話IDを追加
                      currentInvoiceData.aiConversationId = finalConversationId;
                    }
                  } catch (error) {
                    logger.error('会話履歴保存エラー:', error);
                  }
                }
                
                logger.debug('[AIChatDialog] Calling completeConversation');
                completeConversation();
              }}
              disabled={(() => {
                const enabled = isButtonEnabled();
                logger.debug('[Button Render] Button enabled state:', {
                  enabled,
                  customerName: currentInvoiceData?.customerName,
                  itemsLength: currentInvoiceData?.items?.length,
                  isLoading
                });
                return !enabled;
              })()}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              会話を終了して確定
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}