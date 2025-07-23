import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, documentData, conversationHistory } = await request.json();

    if (!message || !documentData) {
      return NextResponse.json(
        { error: 'メッセージと文書データが必要です' },
        { status: 400 }
      );
    }

    // 文書の種類に応じた説明を生成
    const documentTypeDescriptions: { [key: string]: string } = {
      receipt: '領収書',
      invoice: '請求書',
      estimate: '見積書',
      delivery_note: '納品書'
    };

    // 駐車場領収書の場合の追加情報
    const parkingInfo = documentData.receipt_type === 'parking' && documentData.facility_name
      ? `
駐車場情報:
- 施設名: ${documentData.facility_name}
- 入庫時刻: ${documentData.entry_time || '不明'}
- 出庫時刻: ${documentData.exit_time || '不明'}
- 駐車時間: ${documentData.parking_duration || '不明'}
- 基本料金: ${documentData.base_fee ? `¥${documentData.base_fee.toLocaleString()}` : '不明'}
- 追加料金: ${documentData.additional_fee ? `¥${documentData.additional_fee.toLocaleString()}` : '不明'}`
      : '';

    // 文書情報をコンテキストとして整形
    const documentContext = `
現在表示中の文書情報:
- 文書種別: ${documentTypeDescriptions[documentData.document_type] || documentData.document_type}
- 文書番号: ${documentData.document_number}
- 発行日: ${documentData.issue_date}
- 取引先: ${documentData.partner_name}
- 金額: ¥${documentData.total_amount.toLocaleString()}（税額: ¥${documentData.tax_amount.toLocaleString()}）
- ステータス: ${documentData.status}
${documentData.notes ? `- 備考: ${documentData.notes}` : ''}
${documentData.category ? `- カテゴリ: ${documentData.category}` : ''}
${parkingInfo}
${documentData.items && documentData.items.length > 0 ? `
明細:
${documentData.items.map(item => `- ${item.item_name}: ¥${item.amount.toLocaleString()}`).join('\n')}` : ''}
`;

    // システムプロンプト
    const systemPrompt = `あなたは会計文書（領収書・請求書・見積書）の分析と説明を行う専門的なアシスタントです。
現在表示されている文書について、ユーザーの質問に的確に答えてください。

以下の点に注意してください：
1. 現在表示中の文書に関する質問のみに回答し、他の文書や一般的な会計の話題に逸れないこと
2. 税務や会計処理に関する質問には、一般的な知識に基づいて回答しつつ、最終的には税理士や会計士に相談することを推奨すること
3. 仕訳作成に関する質問には、適切な勘定科目や処理方法を提案すること
4. 駐車場領収書の場合は、車両費（駐車場代）として経費計上できることを説明すること
5. 回答は簡潔で分かりやすく、実用的なアドバイスを含めること

${documentContext}`;

    // 会話履歴を含めたメッセージ配列を構築
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // 過去の会話履歴を追加（最新10件まで）
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }

    // 現在のユーザーメッセージを追加
    messages.push({ role: 'user', content: message });

    // OpenAI APIを使用して応答を生成
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      logger.error('OpenAI API error:', errorData);
      throw new Error('AIの応答生成に失敗しました');
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    return NextResponse.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    logger.error('Document chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}