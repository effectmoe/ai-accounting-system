/**
 * 経費分析 API
 * POST: ユーザーの説明と領収書データをAIで分析し、経費として認めるか判断
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

import { logger } from '@/lib/logger';
import { AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';

// 分析リクエスト
interface AnalyzeExpenseRequest {
  // 領収書の抽出データ
  receiptData: {
    issuerName?: string;
    issuerAddress?: string;
    issueDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    subject?: string; // 但し書き
    items?: { itemName?: string; amount?: number }[];
  };
  // ユーザーの説明
  userExplanation: string;
}

// 分析結果
interface AnalyzeExpenseResponse {
  success: boolean;
  // 経費として認めるか
  isExpense: boolean;
  // 判断理由
  reason: string;
  // 経費の場合: 推奨勘定科目
  suggestedCategory?: AccountCategory;
  // 経費除外の場合: 除外理由の詳細
  exclusionReason?: string;
  // 処理時間
  processingTime: number;
}

/**
 * AIで経費分析を実行
 */
async function analyzeWithAI(
  receiptData: AnalyzeExpenseRequest['receiptData'],
  userExplanation: string
): Promise<{
  isExpense: boolean;
  reason: string;
  suggestedCategory?: AccountCategory;
  exclusionReason?: string;
}> {
  // 有効な勘定科目コードのリスト（コードのみ）
  const validCategoryCodes = ACCOUNT_CATEGORIES.map(c => c.code).join(', ');

  const prompt = `あなたは日本の個人事業主の経費判断を支援するAIです。
以下の領収書情報とユーザーの説明を分析し、これが事業経費として認められるかどうかを判断してください。

【領収書情報】
- 発行元: ${receiptData.issuerName || '不明'}
- 発行日: ${receiptData.issueDate || '不明'}
- 金額: ¥${receiptData.totalAmount?.toLocaleString() || '不明'}
- 但し書き: ${receiptData.subject || '不明'}
${receiptData.items?.length ? `- 明細: ${receiptData.items.map(i => i.itemName).join(', ')}` : ''}

【ユーザーの説明】
${userExplanation}

【判断基準】
1. 事業との関連性があるか
2. 個人的な支出ではないか
3. 第三者（社員など）への給付・立替ではないか
4. 法的に経費として認められるか

【回答形式】
必ず以下のJSON形式で回答してください：
{
  "isExpense": true または false,
  "reason": "判断理由を1〜2文で説明",
  "suggestedCategory": "経費の場合のみ、推奨勘定科目コード",
  "exclusionReason": "経費でない場合のみ、除外理由の詳細"
}

【有効な勘定科目コード（この中から選んでください）】
${validCategoryCodes}

注意: suggestedCategoryには上記のコードをそのまま入力してください（例: "消耗品費"）。括弧や説明は不要です。

【重要】
- 「社員の生活保護費」「従業員への立替金」「個人的な医療費」などは経費ではありません
- 「事業主貸」は個人事業主本人の私的支出用で、第三者への支出には使えません
- 経費として認められない場合は、明確にその旨を伝えてください`;

  try {
    // 経費分析用のOllama設定（EXPENSE_AI_*は経費分析専用、なければOLLAMA_*を使用）
    // ※Vision用のLM Studio（localhost:1234）とは別に、テキスト分析用のOllama（localhost:11434）を使用
    const ollamaUrl = process.env.EXPENSE_AI_URL || 'http://localhost:11434';
    const ollamaModel = process.env.EXPENSE_AI_MODEL || 'command-r:latest';

    logger.info('[AnalyzeExpense] Calling Ollama...', {
      url: ollamaUrl,
      model: ollamaModel,
    });

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[AnalyzeExpense] Ollama API error:', { status: response.status, error: errorText });
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.response || '';

    logger.info('[AnalyzeExpense] Ollama response received:', {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200)
    });

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // 勘定科目が有効か確認
      let suggestedCategory: AccountCategory | undefined;
      if (parsed.suggestedCategory) {
        const validCodes = ACCOUNT_CATEGORIES.map(c => c.code);
        if (validCodes.includes(parsed.suggestedCategory)) {
          suggestedCategory = parsed.suggestedCategory as AccountCategory;
        }
      }

      return {
        isExpense: Boolean(parsed.isExpense),
        reason: parsed.reason || '判断理由なし',
        suggestedCategory,
        exclusionReason: parsed.exclusionReason,
      };
    }

    // JSONパースに失敗した場合、デフォルトの判断
    logger.warn('[AnalyzeExpense] Failed to parse AI response, using default');
    return {
      isExpense: false,
      reason: 'AIの判断結果を解析できませんでした。内容を確認してください。',
      exclusionReason: '自動判断できませんでした。',
    };
  } catch (error) {
    logger.error('[AnalyzeExpense] AI analysis failed:', { error: error instanceof Error ? error.message : String(error) });

    // Ollama接続失敗時はルールベースで判断
    return analyzeWithRules(receiptData, userExplanation);
  }
}

/**
 * ルールベースでの経費分析（AIフォールバック）
 */
function analyzeWithRules(
  receiptData: AnalyzeExpenseRequest['receiptData'],
  userExplanation: string
): {
  isExpense: boolean;
  reason: string;
  suggestedCategory?: AccountCategory;
  exclusionReason?: string;
} {
  const explanation = userExplanation.toLowerCase();

  // 明らかに経費でないパターン
  const nonExpensePatterns = [
    { pattern: /生活保護/, reason: '生活保護費は事業経費ではありません' },
    { pattern: /社員.*(立替|貸付|援助)/, reason: '社員への立替・貸付は経費ではありません' },
    { pattern: /従業員.*(立替|貸付)/, reason: '従業員への立替・貸付は経費ではありません' },
    { pattern: /個人的/, reason: '個人的な支出は経費として認められません' },
    { pattern: /家族.*(医療|治療)/, reason: '家族の医療費は事業経費ではありません' },
    { pattern: /私用/, reason: '私用の支出は経費として認められません' },
    { pattern: /プライベート/, reason: 'プライベートな支出は経費として認められません' },
  ];

  for (const { pattern, reason } of nonExpensePatterns) {
    if (pattern.test(explanation)) {
      return {
        isExpense: false,
        reason,
        exclusionReason: `「${userExplanation}」は事業経費として認められません。${reason}`,
      };
    }
  }

  // 経費パターンの検出
  const expensePatterns = [
    { pattern: /消耗品/, category: '消耗品費' as AccountCategory },
    { pattern: /文具|事務用品/, category: '消耗品費' as AccountCategory },
    { pattern: /交通|電車|バス|タクシー/, category: '旅費交通費' as AccountCategory },
    { pattern: /会議|打ち合わせ/, category: '会議費' as AccountCategory },
    { pattern: /接待|会食/, category: '接待交際費' as AccountCategory },
    { pattern: /広告|宣伝/, category: '広告宣伝費' as AccountCategory },
    { pattern: /研修|セミナー|書籍/, category: '研修費' as AccountCategory },
    { pattern: /通信|電話|インターネット/, category: '通信費' as AccountCategory },
    { pattern: /水道|電気|ガス/, category: '水道光熱費' as AccountCategory },
  ];

  for (const { pattern, category } of expensePatterns) {
    if (pattern.test(explanation)) {
      return {
        isExpense: true,
        reason: `「${userExplanation}」は${category}として認められます。`,
        suggestedCategory: category,
      };
    }
  }

  // 判断できない場合
  return {
    isExpense: false,
    reason: '内容から経費かどうか判断できませんでした。詳細な説明をお願いします。',
    exclusionReason: '判断に必要な情報が不足しています。',
  };
}

/**
 * POST /api/scan-receipt/analyze-expense
 * ユーザーの説明と領収書データをAIで分析
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeExpenseRequest = await request.json();

    if (!body.userExplanation || body.userExplanation.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '説明を入力してください',
          processingTime: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    logger.info('[AnalyzeExpense] Analyzing expense...', {
      issuerName: body.receiptData?.issuerName,
      amount: body.receiptData?.totalAmount,
      explanation: body.userExplanation.substring(0, 50),
    });

    // AI分析を実行
    const analysis = await analyzeWithAI(body.receiptData, body.userExplanation);

    const result: AnalyzeExpenseResponse = {
      success: true,
      isExpense: analysis.isExpense,
      reason: analysis.reason,
      suggestedCategory: analysis.suggestedCategory,
      exclusionReason: analysis.exclusionReason,
      processingTime: Date.now() - startTime,
    };

    logger.info('[AnalyzeExpense] Analysis complete:', {
      isExpense: result.isExpense,
      suggestedCategory: result.suggestedCategory,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[AnalyzeExpense] Error:', { error: error instanceof Error ? error.message : String(error) });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '分析に失敗しました',
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
