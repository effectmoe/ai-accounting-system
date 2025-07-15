import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';

const knowledgeService = new KnowledgeService();

// DeepSeek APIを直接呼び出す関数
async function callDeepSeekAPI(messages: Array<{role: string, content: string}>, temperature: number = 0.7, maxTokens: number = 1000) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.error('[DeepSeek] API key is not configured');
    throw new Error('DeepSeek API key is not configured');
  }
  
  console.log('[DeepSeek] Calling API for knowledge chat');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[DeepSeek] Knowledge chat API response received');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Knowledge Chat] API called at', new Date().toISOString());
    
    const body = await request.json();
    const { 
      conversation, 
      conversationHistory = [],
      sessionId,
      includeKnowledge = true,
      knowledgeFilters = {}
    } = body;
    
    if (!conversation || typeof conversation !== 'string') {
      return NextResponse.json(
        { error: 'Conversation text is required' },
        { status: 400 }
      );
    }

    await knowledgeService.connect();

    // ナレッジ検索の実行
    let relevantKnowledge = [];
    let knowledgeContext = '';

    if (includeKnowledge) {
      console.log('[Knowledge Chat] Searching for relevant knowledge...');
      
      const searchResult = await knowledgeService.searchArticles({
        text: conversation,
        categories: knowledgeFilters.categories,
        tags: knowledgeFilters.tags,
        sourceTypes: knowledgeFilters.sourceTypes,
        difficulty: knowledgeFilters.difficulty,
        contentType: knowledgeFilters.contentType,
        isActive: true,
        isVerified: knowledgeFilters.verifiedOnly ? true : undefined,
        limit: 5
      });

      relevantKnowledge = searchResult.articles;
      
      if (relevantKnowledge.length > 0) {
        knowledgeContext = `

=== 関連する税務・会計ナレッジ ===
${relevantKnowledge.map((article, index) => `
${index + 1}. **${article.title}**
   出典: ${article.sourceUrl}
   内容: ${article.excerpt || article.content.substring(0, 300)}...
   分類: ${article.taxonomyTags.contentType} | 難易度: ${article.taxonomyTags.difficulty}
   タグ: ${article.tags.join(', ')}
`).join('\n')}

上記のナレッジを参考にして、正確で実用的な回答を提供してください。
`;
      }
    }

    // システムプロンプトの構築
    const systemPrompt = `あなたは日本の税務・会計業務に特化したAIアシスタントです。

## 専門領域
- 日本の税法（法人税、所得税、消費税、地方税）
- 会計処理（仕訳、決算、財務諸表）
- インボイス制度
- 電子帳簿保存法
- 給与計算・社会保険
- 各種申告書作成

## 回答方針
1. 正確性を最優先に、最新の法令に基づいて回答
2. 実務的で具体的なアドバイスを提供
3. 必要に応じて注意点やリスクを明記
4. 複雑な内容は段階的に説明
5. 関連する法令や制度も併せて説明

## 回答形式
- 結論を先に述べる
- 根拠となる法令や制度を明記
- 具体例があれば提示
- 注意点やリスクがあれば明記

${knowledgeContext}

以下の会話履歴とユーザーの質問に基づいて、専門的で実用的な回答を提供してください。`;

    // 会話履歴の構築
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // 過去の会話履歴を追加
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10); // 最新10件のみ
      messages.push(...recentHistory);
    }

    // 現在の質問を追加
    messages.push({ role: 'user', content: conversation });

    console.log('[Knowledge Chat] Prepared', messages.length, 'messages for AI');

    // DeepSeek APIを使用して回答生成
    const aiResponse = await callDeepSeekAPI(messages, 0.7, 1500);
    
    if (!aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error('No response from AI service');
    }

    const response = aiResponse.choices[0].message.content;

    // 会話履歴をMongoDBに保存
    const conversationData = {
      sessionId,
      userId: null,
      documentType: 'knowledge',
      conversationContext: {
        knowledgeQuery: conversation,
        searchFilters: knowledgeFilters,
        relevantArticles: relevantKnowledge.map(article => article._id)
      },
      messages: [
        ...conversationHistory,
        { 
          role: 'user', 
          content: conversation, 
          timestamp: new Date() 
        },
        { 
          role: 'assistant', 
          content: response, 
          timestamp: new Date(),
          metadata: {
            knowledgeUsed: relevantKnowledge.map(article => ({
              articleId: article._id,
              relevanceScore: 0.8, // 簡易スコア
              title: article.title,
              sourceUrl: article.sourceUrl
            })),
            processingTime: Date.now() - Date.now(),
            aiModel: 'deepseek'
          }
        }
      ],
      metadata: {
        aiModel: 'deepseek',
        knowledgeVersion: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 会話履歴を保存（エラーが発生しても処理を継続）
    try {
      // await saveConversationHistory(conversationData);
      console.log('[Knowledge Chat] Conversation history would be saved');
    } catch (error) {
      console.error('[Knowledge Chat] Failed to save conversation history:', error);
    }

    const result = {
      success: true,
      response,
      knowledgeUsed: relevantKnowledge.map(article => ({
        id: article._id,
        title: article.title,
        sourceUrl: article.sourceUrl,
        excerpt: article.excerpt,
        relevanceScore: 0.8,
        categories: article.categories,
        tags: article.tags,
        difficulty: article.taxonomyTags.difficulty,
        contentType: article.taxonomyTags.contentType
      })),
      searchStats: {
        totalResults: relevantKnowledge.length,
        searchQuery: conversation,
        filters: knowledgeFilters
      },
      metadata: {
        aiModel: 'deepseek',
        processingTime: Date.now(),
        sessionId,
        includeKnowledge
      }
    };

    console.log('[Knowledge Chat] Response generated successfully');
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Knowledge Chat] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process knowledge chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await knowledgeService.disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // 会話履歴を取得
    // const conversationHistory = await getConversationHistory(sessionId);

    return NextResponse.json({
      sessionId,
      // conversations: conversationHistory,
      available: true
    });

  } catch (error) {
    console.error('[Knowledge Chat] Get conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation history' },
      { status: 500 }
    );
  }
}