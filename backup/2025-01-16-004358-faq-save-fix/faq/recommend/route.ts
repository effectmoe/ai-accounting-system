import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { ObjectId } from 'mongodb';

interface RecommendationRequest {
  faqId?: string;
  category?: string;
  tags?: string[];
  difficulty?: string;
  limit?: number;
}

export async function POST(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const body: RecommendationRequest = await request.json();
    const { faqId, category, tags, difficulty, limit = 5 } = body;
    
    await knowledgeService.connect();
    
    const collection = knowledgeService.db.collection('faq_articles');
    
    // 基準となるFAQを取得
    let baseFaq;
    if (faqId) {
      baseFaq = await collection.findOne({ _id: new ObjectId(faqId) });
      if (!baseFaq) {
        return NextResponse.json(
          { error: 'FAQ not found' },
          { status: 404 }
        );
      }
    }
    
    // 推奨クエリを構築
    const query: any = {
      status: 'published',
      isPublished: true
    };
    
    // 同じFAQを除外
    if (faqId) {
      query._id = { $ne: new ObjectId(faqId) };
    }
    
    // カテゴリベースの推奨
    if (baseFaq?.category || category) {
      query.category = baseFaq?.category || category;
    }
    
    // タグベースの推奨
    if (baseFaq?.tags || tags) {
      const searchTags = baseFaq?.tags || tags;
      query.tags = { $in: searchTags };
    }
    
    // 難易度ベースの推奨
    if (baseFaq?.difficulty || difficulty) {
      query.difficulty = baseFaq?.difficulty || difficulty;
    }
    
    // 関連FAQを検索
    let recommendations = await collection
      .find(query)
      .sort({ 
        'qualityMetrics.overallScore': -1, 
        'usageStats.viewCount': -1 
      })
      .limit(limit * 2) // より多く取得してからフィルタリング
      .toArray();
    
    // スコアリング関数
    const calculateRelevanceScore = (faq: any, base: any) => {
      let score = 0;
      
      // カテゴリの一致
      if (faq.category === base.category) score += 30;
      
      // タグの重複度
      const commonTags = faq.tags.filter((tag: string) => base.tags.includes(tag));
      score += commonTags.length * 10;
      
      // 難易度の近さ
      const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
      const diffDiff = Math.abs(
        difficultyMap[faq.difficulty as keyof typeof difficultyMap] - 
        difficultyMap[base.difficulty as keyof typeof difficultyMap]
      );
      score += (3 - diffDiff) * 10;
      
      // 品質スコア
      score += (faq.qualityMetrics?.overallScore || 0) / 10;
      
      // 人気度
      score += Math.min(faq.usageStats?.viewCount || 0, 100) / 10;
      
      // 構造化データの類似性
      if (faq.structuredData?.contentType === base.structuredData?.contentType) {
        score += 20;
      }
      
      // 税法の重複
      if (faq.structuredData?.taxLaw && base.structuredData?.taxLaw) {
        const commonLaws = faq.structuredData.taxLaw.filter((law: string) => 
          base.structuredData.taxLaw.includes(law)
        );
        score += commonLaws.length * 5;
      }
      
      return score;
    };
    
    // ベースFAQがある場合はスコアリング
    if (baseFaq) {
      recommendations = recommendations
        .map(faq => ({
          ...faq,
          relevanceScore: calculateRelevanceScore(faq, baseFaq)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    } else {
      recommendations = recommendations.slice(0, limit);
    }
    
    await knowledgeService.disconnect();
    
    return NextResponse.json({
      success: true,
      recommendations: recommendations.map(faq => ({
        id: faq._id.toString(),
        question: faq.question,
        answer: faq.answer.substring(0, 200) + '...',
        category: faq.category,
        tags: faq.tags,
        difficulty: faq.difficulty,
        qualityScore: faq.qualityMetrics?.overallScore || 85,
        viewCount: faq.usageStats?.viewCount || 0,
        relevanceScore: faq.relevanceScore
      }))
    });
    
  } catch (error) {
    console.error('[FAQ Recommend API] Error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}