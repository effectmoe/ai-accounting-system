import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { getOllamaClient } from '@/lib/ollama-client';

import { logger } from '@/lib/logger';
const knowledgeService = new KnowledgeService();

export async function POST(request: NextRequest) {
  try {
    logger.debug('[Knowledge Chat] API called at', new Date().toISOString());
    
    const body = await request.json();
    const { 
      conversation, 
      conversationHistory = [],
      sessionId,
      includeKnowledge = true,
      knowledgeFilters = {},
      stream = false
    } = body;
    
    // ストリーミングが有効な場合は別のエンドポイントにリダイレクト
    if (stream) {
      const streamResponse = await fetch(new URL('/api/knowledge/analyze-chat-stream', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return streamResponse;
    }
    
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
      logger.debug('[Knowledge Chat] Searching for relevant knowledge...');
      
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

    logger.debug('[Knowledge Chat] Prepared', messages.length, 'messages for AI');

    // Ollama (Qwen3-VL) + Thinkingモードを使用して回答生成
    // 2025-01: DeepSeek廃止 → Qwen3-VL Thinkingモードに移行
    const ollamaClient = getOllamaClient();

    // Ollamaの利用可能性を確認
    const isAvailable = await ollamaClient.checkAvailability();
    if (!isAvailable) {
      logger.error('[Knowledge Chat] Ollama is not available');
      throw new Error('AI service (Ollama) is not available');
    }

    logger.debug('[Knowledge Chat] Using Ollama Qwen3-VL with Thinking mode');

    // Thinkingモード付きチャットを実行
    const aiResponse = await ollamaClient.chatWithThinking(
      systemPrompt,
      conversation,
      conversationHistory?.slice(-10) || [], // 最新10件のみ
      {
        temperature: 0.7,
        num_predict: 1500
      }
    );

    if (!aiResponse.content) {
      throw new Error('No response from AI service');
    }

    const response = aiResponse.content;

    // Thinkingプロセスがあればログに記録
    if (aiResponse.thinking) {
      logger.debug('[Knowledge Chat] Thinking process:', {
        thinkingLength: aiResponse.thinking.length
      });
    }

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
            aiModel: 'ollama-qwen3-vl-thinking'
          }
        }
      ],
      metadata: {
        aiModel: 'ollama-qwen3-vl-thinking',
        knowledgeVersion: '1.0'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 会話履歴を保存（エラーが発生しても処理を継続）
    try {
      // await saveConversationHistory(conversationData);
      logger.debug('[Knowledge Chat] Conversation history would be saved');
    } catch (error) {
      logger.error('[Knowledge Chat] Failed to save conversation history:', error);
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
        aiModel: 'ollama-qwen3-vl-thinking',
        processingTime: Date.now(),
        sessionId,
        includeKnowledge
      }
    };

    logger.debug('[Knowledge Chat] Response generated successfully');
    return NextResponse.json(result);

  } catch (error) {
    logger.error('[Knowledge Chat] Error:', error);
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
    logger.error('[Knowledge Chat] Get conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation history' },
      { status: 500 }
    );
  }
}