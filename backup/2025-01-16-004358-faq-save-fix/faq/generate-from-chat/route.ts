import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { FaqArticle } from '@/types/collections';
import { ObjectId } from 'mongodb';

interface GenerateFaqRequest {
  chatSessionId: string;
  userMessage: string;
  assistantMessage: string;
  category?: string;
  tags?: string[];
  quality?: {
    accuracy?: number;
    completeness?: number;
    clarity?: number;
    usefulness?: number;
  };
}

// DeepSeek APIを使用してFAQメタデータを生成
async function generateFaqMetadata(question: string, answer: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DeepSeek API key is not configured');
  }
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `あなたは税務・会計FAQの構造化データ生成エキスパートです。
            
与えられた質問と回答から、以下のJSON形式で構造化メタデータを生成してください：

{
  "category": "カテゴリ名（tax/accounting/invoice/compliance/procedure/general）",
  "subcategory": "サブカテゴリ名",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "difficulty": "beginner/intermediate/advanced",
  "contentType": "tax/accounting/invoice/compliance/procedure/general",
  "taxLaw": ["関連する税法"],
  "applicableBusinessTypes": ["適用される業種"],
  "relatedRegulations": ["関連規制"],
  "searchKeywords": ["検索キーワード1", "キーワード2"],
  "priority": 1-10の数値（重要度）
}

税務・会計の専門知識を活用して、正確で有用な分類を行ってください。`
          },
          {
            role: 'user',
            content: `質問: ${question}\n\n回答: ${answer}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from DeepSeek API');
    }
    
    // JSONを抽出（マークダウンコードブロックを除去）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from API');
    }
    
    return JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim());
    
  } catch (error) {
    console.error('Error generating FAQ metadata:', error);
    // フォールバック用のデフォルトメタデータ
    return {
      category: 'general',
      subcategory: '一般',
      tags: ['FAQ'],
      difficulty: 'intermediate',
      contentType: 'general',
      taxLaw: [],
      applicableBusinessTypes: [],
      relatedRegulations: [],
      searchKeywords: [question.substring(0, 50)],
      priority: 5
    };
  }
}

export async function POST(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const body: GenerateFaqRequest = await request.json();
    const { 
      chatSessionId, 
      userMessage, 
      assistantMessage, 
      category,
      tags = [],
      quality = {}
    } = body;
    
    if (!chatSessionId || !userMessage || !assistantMessage) {
      return NextResponse.json(
        { error: 'Required fields missing: chatSessionId, userMessage, assistantMessage' },
        { status: 400 }
      );
    }
    
    console.log('[FAQ Generator] Generating FAQ from chat...');
    
    // DeepSeek APIを使用してメタデータを生成
    const metadata = await generateFaqMetadata(userMessage, assistantMessage);
    
    // 品質スコアの計算
    const qualityMetrics = {
      accuracy: quality.accuracy || 85,
      completeness: quality.completeness || 80,
      clarity: quality.clarity || 90,
      usefulness: quality.usefulness || 85,
      overallScore: 0
    };
    qualityMetrics.overallScore = Math.round(
      (qualityMetrics.accuracy + qualityMetrics.completeness + 
       qualityMetrics.clarity + qualityMetrics.usefulness) / 4
    );
    
    // FAQ記事オブジェクトを作成
    const faqArticle: Omit<FaqArticle, '_id'> = {
      question: userMessage,
      answer: assistantMessage,
      category: category || metadata.category,
      subcategory: metadata.subcategory,
      
      tags: [...new Set([...tags, ...metadata.tags])], // 重複除去
      difficulty: metadata.difficulty,
      priority: metadata.priority,
      
      structuredData: {
        contentType: metadata.contentType,
        taxLaw: metadata.taxLaw || [],
        applicableBusinessTypes: metadata.applicableBusinessTypes || [],
        relatedRegulations: metadata.relatedRegulations || [],
        effectiveDate: new Date(),
        expirationDate: undefined
      },
      
      sourceInfo: {
        chatSessionId,
        chatMessageId: new ObjectId().toString(),
        originalQuestion: userMessage,
        generatedBy: 'chat',
        generatedAt: new Date()
      },
      
      qualityMetrics,
      
      usageStats: {
        viewCount: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        relatedQuestions: []
      },
      
      status: 'draft', // デフォルトはドラフト状態
      isPublished: false,
      isFeatured: false,
      
      version: 1,
      previousVersions: [],
      
      searchKeywords: metadata.searchKeywords,
      relatedFaqIds: [],
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // MongoDBに保存
    await knowledgeService.connect();
    
    const collection = knowledgeService.db.collection('faq_articles');
    const result = await collection.insertOne(faqArticle);
    
    await knowledgeService.disconnect();
    
    console.log(`[FAQ Generator] FAQ created with ID: ${result.insertedId}`);
    
    return NextResponse.json({
      success: true,
      faqId: result.insertedId.toString(),
      message: 'FAQ article generated successfully',
      metadata: {
        category: faqArticle.category,
        tags: faqArticle.tags,
        difficulty: faqArticle.difficulty,
        qualityScore: qualityMetrics.overallScore
      }
    });
    
  } catch (error) {
    console.error('[FAQ Generator] Error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate FAQ from chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const knowledgeService = new KnowledgeService();
    await knowledgeService.connect();
    
    // セッションから生成されたFAQを取得
    const collection = knowledgeService.db.collection('faq_articles');
    const faqs = await collection.find({
      'sourceInfo.chatSessionId': sessionId
    }).sort({ createdAt: -1 }).toArray();
    
    await knowledgeService.disconnect();
    
    return NextResponse.json({
      success: true,
      faqs: faqs.map(faq => ({
        id: faq._id.toString(),
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
        status: faq.status,
        qualityScore: faq.qualityMetrics.overallScore,
        createdAt: faq.createdAt
      }))
    });
    
  } catch (error) {
    console.error('[FAQ Generator] Get FAQs error:', error);
    return NextResponse.json(
      { error: 'Failed to get FAQ list' },
      { status: 500 }
    );
  }
}