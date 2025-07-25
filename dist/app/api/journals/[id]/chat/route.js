"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDuration = exports.runtime = exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
const deepseek_client_1 = require("@/lib/deepseek-client");
exports.dynamic = 'force-dynamic';
exports.runtime = 'nodejs';
exports.maxDuration = 30;
async function POST(request, { params }) {
    try {
        logger_1.logger.debug('[Journal Chat API] Request received for journal:', params.id);
        const body = await request.json();
        const { message, journalData, conversationHistory } = body;
        if (!message || typeof message !== 'string') {
            return server_1.NextResponse.json({ error: 'メッセージは必須です' }, { status: 400 });
        }
        if (!journalData) {
            return server_1.NextResponse.json({ error: '仕訳データが見つかりません' }, { status: 400 });
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
        // DeepSeek APIのメッセージを構築
        const messages = [
            {
                role: 'system',
                content: `あなたは日本の税務・会計に精通した専門的なアシスタントです。
ユーザーから表示されている特定の仕訳についての質問を受けます。

重要な制約：
1. 必ず提供された仕訳データのみに基づいて回答してください
2. 他の仕訳について聞かれた場合は「該当の仕訳ページで質問してください」と誘導してください
3. 日本の税務・会計の一般的な知識と関連付けて説明してください
4. 初心者にも分かりやすい説明を心がけてください
5. 専門用語を使う場合は、必ず簡単な説明を添えてください

${journalContext}`
            },
            ...conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            {
                role: 'user',
                content: message
            }
        ];
        logger_1.logger.debug('[Journal Chat API] Calling DeepSeek API with messages:', {
            messageCount: messages.length,
            journalNumber: journalData.journalNumber
        });
        // DeepSeek APIを呼び出し
        const deepseekClient = new deepseek_client_1.DeepSeekClient();
        const response = await deepseekClient.chat(messages, {
            temperature: 0.7,
            maxTokens: 1000,
            model: 'deepseek-chat'
        });
        const aiResponse = response.choices[0]?.message?.content || 'すみません、回答を生成できませんでした。';
        logger_1.logger.debug('[Journal Chat API] DeepSeek response received:', {
            responseLength: aiResponse.length,
            usage: response.usage
        });
        return server_1.NextResponse.json({
            success: true,
            response: aiResponse,
            usage: response.usage
        });
    }
    catch (error) {
        logger_1.logger.error('[Journal Chat API] Error:', error);
        let errorMessage = '処理中にエラーが発生しました';
        let statusCode = 500;
        if (error instanceof Error) {
            if (error.message.includes('DEEPSEEK_API_KEY')) {
                errorMessage = 'AIサービスの設定に問題があります';
            }
            else if (error.message.includes('timeout')) {
                errorMessage = 'リクエストがタイムアウトしました';
                statusCode = 504;
            }
            else if (error.message.includes('rate limit')) {
                errorMessage = 'APIの利用制限に達しました';
                statusCode = 429;
            }
            else {
                errorMessage = error.message;
            }
        }
        return server_1.NextResponse.json({
            success: false,
            error: errorMessage
        }, { status: statusCode });
    }
}
