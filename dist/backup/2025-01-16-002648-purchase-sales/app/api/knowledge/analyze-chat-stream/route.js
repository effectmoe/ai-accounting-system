"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const knowledge_service_1 = require("@/services/knowledge.service");
const chat_history_service_1 = require("@/services/chat-history.service");
async function POST(request) {
    const encoder = new TextEncoder();
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const body = await request.json();
        const { conversation, conversationHistory = [], sessionId, includeKnowledge = false, knowledgeFilters = {}, stream = false } = body;
        if (!conversation) {
            return new Response(JSON.stringify({ success: false, error: 'No conversation provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // DeepSeek API key の存在確認
        if (!process.env.DEEPSEEK_API_KEY) {
            console.error('DeepSeek API key not configured');
            return new Response(JSON.stringify({
                success: false,
                error: 'AI service not configured'
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        // デバッグ用ログ
        console.log('API Request:', {
            hasApiKey: !!process.env.DEEPSEEK_API_KEY,
            conversationLength: Array.isArray(conversation) ? conversation.length : 1,
            includeKnowledge,
            sessionId: sessionId?.slice(-8)
        });
        // conversationの詳細ログ
        console.log('Conversation debug:', {
            type: typeof conversation,
            isArray: Array.isArray(conversation),
            data: JSON.stringify(conversation).slice(0, 200) + '...'
        });
        // searchTextを最初に定義
        let searchText;
        if (Array.isArray(conversation)) {
            const lastMessage = conversation[conversation.length - 1];
            console.log('Last message:', { lastMessage, hasContent: !!lastMessage?.content });
            searchText = lastMessage?.content || lastMessage?.message || String(lastMessage) || '';
        }
        else if (typeof conversation === 'object' && conversation?.content) {
            searchText = conversation.content;
        }
        else if (typeof conversation === 'object' && conversation?.message) {
            searchText = conversation.message;
        }
        else {
            searchText = String(conversation || '');
        }
        if (!searchText || searchText.trim().length === 0) {
            searchText = '税務 会計';
            console.log('Using default searchText:', searchText);
        }
        // ナレッジベースから関連記事を検索
        let knowledgeUsed = [];
        let knowledgeContext = '';
        if (includeKnowledge) {
            await knowledgeService.connect();
            console.log('Knowledge search - searchText:', searchText, 'type:', typeof searchText);
            const searchResult = await knowledgeService.searchArticles({
                text: searchText,
                ...knowledgeFilters,
                limit: 5
            });
            console.log('Knowledge search result:', searchResult.total, 'articles found');
            if (searchResult.articles.length > 0) {
                knowledgeUsed = searchResult.articles.map(article => ({
                    id: article._id?.toString() || '',
                    title: article.title,
                    sourceUrl: article.sourceUrl,
                    excerpt: article.excerpt,
                    relevanceScore: article.qualityScore / 100,
                    categories: article.categories,
                    tags: article.tags,
                    difficulty: article.taxonomyTags.difficulty,
                    contentType: article.taxonomyTags.contentType
                }));
                knowledgeContext = `
以下の参考情報を考慮して回答してください：

${searchResult.articles.map((article, index) => `【参考${index + 1}】${article.title}
  ${article.excerpt}
  出典: ${article.sourceUrl}
  カテゴリ: ${article.categories.join(', ')}
  タグ: ${article.tags.join(', ')}`).join('\n\n')}
`;
            }
        }
        // セッション作成またはメッセージ追加の処理
        let activeSessionId = sessionId;
        let isNewSession = false;
        let sessionError = null;
        try {
            await chatHistoryService.connect();
            if (!activeSessionId) {
                // 新規セッション作成
                console.log('[analyze-chat-stream] 新規セッション作成中...');
                const newSession = await chatHistoryService.createKnowledgeSession(undefined, // userId（現在は未実装）
                'tax' // カテゴリー
                );
                activeSessionId = newSession.sessionId;
                isNewSession = true;
                console.log('[analyze-chat-stream] 新規セッション作成完了:', activeSessionId);
            }
            // ユーザーメッセージを保存
            await chatHistoryService.addMessage(activeSessionId, {
                role: 'user',
                content: searchText,
                metadata: {
                    tokens: { total: searchText.length * 2 }, // 簡易的なトークン計算
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[analyze-chat-stream] セッション処理エラー:', error);
            sessionError = error instanceof Error ? error : new Error('Session error');
            // エラーが発生してもストリーミングは続行
        }
        // ストリーミングレスポンスの設定
        const responseStream = new ReadableStream({
            async start(controller) {
                try {
                    // DeepSeek APIにリクエスト（ストリーミング対応）
                    const apiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'deepseek-chat',
                            messages: [
                                {
                                    role: 'system',
                                    content: `あなたは日本の税務・会計に精通した専門アシスタントです。

${knowledgeContext}

ユーザーの質問に対して、参考情報を活用しながら正確で分かりやすい回答を提供してください。

重要な指示：
1. 税務・会計の専門用語は適切に使用し、必要に応じて説明を加える
2. 法律や制度の変更がある場合は、その時期も明記する
3. 具体的な数値や税率を示す場合は、適用条件も明確にする
4. 不確実な情報は推測せず、確認が必要である旨を伝える
5. 回答は段階的に構成し、読みやすくする`
                                },
                                ...conversationHistory.map((msg) => ({
                                    role: msg.role,
                                    content: msg.content
                                })),
                                {
                                    role: 'user',
                                    content: searchText
                                }
                            ],
                            stream: true,
                            temperature: 0.7,
                            max_tokens: 2000
                        })
                    });
                    if (!apiResponse.ok) {
                        const errorText = await apiResponse.text();
                        console.error('DeepSeek API error:', {
                            status: apiResponse.status,
                            statusText: apiResponse.statusText,
                            error: errorText
                        });
                        throw new Error(`DeepSeek API error: ${apiResponse.status} - ${errorText}`);
                    }
                    console.log('DeepSeek API response received, starting stream processing');
                    const reader = apiResponse.body?.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let fullResponse = '';
                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done)
                                break;
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';
                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    if (data === '[DONE]') {
                                        // アシスタントの返答を保存
                                        if (activeSessionId && !sessionError) {
                                            try {
                                                await chatHistoryService.addMessage(activeSessionId, {
                                                    role: 'assistant',
                                                    content: fullResponse,
                                                    metadata: {
                                                        tokens: { total: fullResponse.length * 2 }, // 簡易的なトークン計算
                                                        timestamp: new Date().toISOString(),
                                                        knowledgeUsed: knowledgeUsed.length > 0 ? knowledgeUsed : undefined
                                                    }
                                                });
                                                // 新規セッションの場合、タイトルを生成
                                                if (isNewSession) {
                                                    await chatHistoryService.generateSessionTitle(activeSessionId);
                                                }
                                            }
                                            catch (error) {
                                                console.error('[analyze-chat-stream] メッセージ保存エラー:', error);
                                            }
                                        }
                                        // 最後にナレッジ情報、提案質問、セッションIDを送信
                                        const finalData = {
                                            content: '',
                                            knowledgeUsed: knowledgeUsed,
                                            suggestedQuestions: generateSuggestedQuestions(searchText, fullResponse),
                                            sessionId: activeSessionId,
                                            isNewSession: isNewSession
                                        };
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
                                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                        controller.close();
                                        return;
                                    }
                                    try {
                                        const parsed = JSON.parse(data);
                                        const content = parsed.choices?.[0]?.delta?.content || '';
                                        if (content) {
                                            fullResponse += content;
                                            // 累積されたコンテンツ全体を送信
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fullResponse })}\n\n`));
                                        }
                                    }
                                    catch (e) {
                                        console.error('Failed to parse SSE data:', e);
                                    }
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('Streaming error:', error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`));
                    controller.close();
                }
            }
        });
        await knowledgeService.disconnect();
        await chatHistoryService.disconnect();
        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    }
    catch (error) {
        console.error('Knowledge chat streaming error:', error);
        await knowledgeService.disconnect();
        await chatHistoryService.disconnect();
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Knowledge chat failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
// 関連する質問を生成する関数
function generateSuggestedQuestions(originalQuestion, response) {
    const suggestions = [];
    // 質問の内容に基づいて関連質問を生成
    if (originalQuestion.includes('インボイス')) {
        suggestions.push('インボイス制度で必要な記載事項は？', '免税事業者からの仕入れの経過措置について', 'インボイス発行事業者の登録方法');
    }
    else if (originalQuestion.includes('法人税')) {
        suggestions.push('中小法人の特例について詳しく', '欠損金の繰越控除について', '法人税の申告期限と延長申請');
    }
    else if (originalQuestion.includes('減価償却')) {
        suggestions.push('少額減価償却資産の特例とは？', '定額法と定率法の違いを詳しく', '固定資産の耐用年数一覧');
    }
    else if (originalQuestion.includes('電子帳簿')) {
        suggestions.push('電子帳簿保存法の保存要件', 'スキャナ保存の要件と手順', 'タイムスタンプの必要性について');
    }
    else {
        // 一般的な関連質問
        suggestions.push('最新の税制改正について', '実務での注意点を教えて', '具体的な仕訳例を見せて');
    }
    return suggestions.slice(0, 4);
}
