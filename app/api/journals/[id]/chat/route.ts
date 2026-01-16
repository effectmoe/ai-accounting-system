import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getOllamaClient } from '@/lib/ollama-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

interface JournalChatRequest {
  message: string;
  journalData: {
    _id?: any;
    journalNumber: string;
    entryDate: string;
    description: string;
    status: string;
    lines: Array<{
      accountCode: string;
      accountName: string;
      debitAmount: number;
      creditAmount: number;
      taxRate?: number;
      taxAmount?: number;
      isTaxIncluded?: boolean;
    }>;
  };
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug('[Journal Chat API] Request received for journal:', params.id);
    
    const body = await request.json() as JournalChatRequest;
    const { message, journalData, conversationHistory } = body;
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージは必須です' },
        { status: 400 }
      );
    }
    
    if (!journalData) {
      return NextResponse.json(
        { error: '仕訳データが見つかりません' },
        { status: 400 }
      );
    }
    
    // 仕訳データを分析用に整形
    const debitTotal = journalData.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const creditTotal = journalData.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;
    
    const journalContext = `
現在の仕訳情報：
- 仕訳番号: ${journalData.journalNumber}
- 取引日: ${new Date(journalData.entryDate).toLocaleDateString('ja-JP')}
- 摘要: ${journalData.description}
- ステータス: ${journalData.status === 'confirmed' ? '確定' : '下書き'}
- 貸借バランス: ${isBalanced ? '一致' : '不一致'} (借方: ¥${debitTotal.toLocaleString()}, 貸方: ¥${creditTotal.toLocaleString()})

仕訳明細:
${journalData.lines.map((line, index) => `
${index + 1}. ${line.accountName} (${line.accountCode})
   借方: ¥${line.debitAmount.toLocaleString()} | 貸方: ¥${line.creditAmount.toLocaleString()}
   ${line.taxRate !== undefined ? `税率: ${line.taxRate}%${line.isTaxIncluded ? '(内税)' : '(外税)'}` : ''}
   ${line.taxAmount ? `税額: ¥${line.taxAmount.toLocaleString()}` : ''}
`).join('')}`;
    
    // システムプロンプトを構築
    const systemPrompt = `あなたは日本の税務・会計に精通した専門的なアシスタントです。
ユーザーから表示されている特定の仕訳についての質問を受けます。

重要な制約：
1. 必ず提供された仕訳データのみに基づいて回答してください
2. 他の仕訳について聞かれた場合は「該当の仕訳ページで質問してください」と誘導してください
3. 日本の税務・会計の一般的な知識と関連付けて説明してください
4. 初心者にも分かりやすい説明を心がけてください
5. 専門用語を使う場合は、必ず簡単な説明を添えてください

${journalContext}`;

    logger.debug('[Journal Chat API] Calling Ollama Qwen3-VL with Thinking mode:', {
      journalNumber: journalData.journalNumber,
      historyLength: conversationHistory.length
    });

    // Ollama (Qwen3-VL) + Thinkingモードを使用
    // 2025-01: DeepSeek廃止 → Qwen3-VL Thinkingモードに移行
    const ollamaClient = getOllamaClient();

    // Ollamaの利用可能性を確認
    const isAvailable = await ollamaClient.checkAvailability();
    if (!isAvailable) {
      logger.error('[Journal Chat API] Ollama is not available');
      throw new Error('AI service (Ollama) is not available');
    }

    // Thinkingモード付きチャットを実行
    const response = await ollamaClient.chatWithThinking(
      systemPrompt,
      message,
      conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        temperature: 0.7,
        num_predict: 1000
      }
    );

    const aiResponse = response.content || 'すみません、回答を生成できませんでした。';

    logger.debug('[Journal Chat API] Ollama response received:', {
      responseLength: aiResponse.length,
      hasThinking: !!response.thinking
    });
    
    return NextResponse.json({
      success: true,
      response: aiResponse,
      model: 'ollama-qwen3-vl-thinking'
    });
    
  } catch (error) {
    logger.error('[Journal Chat API] Error:', error);

    let errorMessage = '処理中にエラーが発生しました';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('Ollama') || error.message.includes('AI service')) {
        errorMessage = 'AIサービス（Ollama）に接続できません';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'リクエストがタイムアウトしました';
        statusCode = 504;
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}