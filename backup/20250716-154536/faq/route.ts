import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { StructuredDataService } from '@/services/structured-data.service';
import { FaqArticle, FaqUsageLog } from '@/types/collections';
import { ObjectId } from 'mongodb';

interface SearchFaqRequest {
  query?: string;
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'quality';
  sortOrder?: 'asc' | 'desc';
}

interface CreateFaqRequest {
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority?: number;
  contentType: 'tax' | 'accounting' | 'invoice' | 'compliance' | 'procedure' | 'general';
  isPublished?: boolean;
  isFeatured?: boolean;
}

export async function GET(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const { searchParams } = new URL(request.url);
    const includeStructuredData = searchParams.get('includeStructuredData') === 'true';
    
    const searchRequest: SearchFaqRequest = {
      query: searchParams.get('query') || undefined,
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      difficulty: searchParams.get('difficulty') as any || undefined,
      status: searchParams.get('status') as any || 'published',
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy') as any || 'popularity',
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };
    
    await knowledgeService.connect();
    const collection = knowledgeService.db.collection('faq_articles');
    
    // 検索条件を構築
    const filter: any = {};
    
    if (searchRequest.status) {
      filter.status = searchRequest.status;
    }
    
    if (searchRequest.category) {
      filter.category = searchRequest.category;
    }
    
    if (searchRequest.tags && searchRequest.tags.length > 0) {
      filter.tags = { $in: searchRequest.tags };
    }
    
    if (searchRequest.difficulty) {
      filter.difficulty = searchRequest.difficulty;
    }
    
    if (searchRequest.query) {
      filter.$or = [
        { question: { $regex: searchRequest.query, $options: 'i' } },
        { answer: { $regex: searchRequest.query, $options: 'i' } },
        { tags: { $regex: searchRequest.query, $options: 'i' } },
        { searchKeywords: { $regex: searchRequest.query, $options: 'i' } }
      ];
    }
    
    // ソート条件を構築
    let sort: any = {};
    switch (searchRequest.sortBy) {
      case 'date':
        sort.createdAt = searchRequest.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'popularity':
        sort['usageStats.viewCount'] = searchRequest.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'quality':
        sort['qualityMetrics.overallScore'] = searchRequest.sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sort.priority = -1; // デフォルトは優先度順
        sort.createdAt = -1;
    }
    
    // FAQを検索
    const faqs = await collection
      .find(filter)
      .sort(sort)
      .skip(searchRequest.offset || 0)
      .limit(searchRequest.limit || 20)
      .toArray();
    
    // 総件数を取得
    const totalCount = await collection.countDocuments(filter);
    
    // 構造化データを取得（必要な場合）
    let structuredDataMap: Map<string, any> = new Map();
    if (includeStructuredData && faqs.length > 0) {
      try {
        const structuredDataService = new StructuredDataService();
        const faqIds = faqs.map(faq => faq._id);
        
        for (const faqId of faqIds) {
          const structuredData = await structuredDataService.getStructuredData(faqId, 'faq');
          if (structuredData.length > 0) {
            structuredDataMap.set(faqId.toString(), structuredData[0].jsonLd);
          }
        }
        
        await structuredDataService.close();
      } catch (structuredError) {
        console.error('Failed to get structured data for FAQs:', structuredError);
        // 構造化データ取得エラーは検索結果を停止しない
      }
    }
    
    await knowledgeService.disconnect();
    
    return NextResponse.json({
      success: true,
      faqs: faqs.map(faq => ({
        id: faq._id.toString(),
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        subcategory: faq.subcategory,
        tags: faq.tags,
        difficulty: faq.difficulty,
        priority: faq.priority,
        status: faq.status,
        isPublished: faq.isPublished,
        isFeatured: faq.isFeatured,
        qualityScore: faq.qualityMetrics.overallScore,
        viewCount: faq.usageStats.viewCount,
        helpfulVotes: faq.usageStats.helpfulVotes,
        unhelpfulVotes: faq.usageStats.unhelpfulVotes,
        createdAt: faq.createdAt,
        updatedAt: faq.updatedAt,
        publishedAt: faq.publishedAt,
        structuredData: includeStructuredData ? structuredDataMap.get(faq._id.toString()) : undefined
      })),
      pagination: {
        total: totalCount,
        limit: searchRequest.limit,
        offset: searchRequest.offset,
        hasMore: (searchRequest.offset || 0) + (searchRequest.limit || 20) < totalCount
      }
    });
    
  } catch (error) {
    console.error('[FAQ API] Search error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search FAQs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const body: CreateFaqRequest = await request.json();
    const { 
      question, 
      answer, 
      category, 
      subcategory,
      tags, 
      difficulty,
      priority = 5,
      contentType,
      isPublished = false,
      isFeatured = false
    } = body;
    
    // 必須フィールドのバリデーション
    if (!question || !answer || !category || !tags || !difficulty || !contentType) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }
    
    await knowledgeService.connect();
    
    // FAQ記事を作成
    const faqArticle: Omit<FaqArticle, '_id'> = {
      question,
      answer,
      category,
      subcategory,
      tags,
      difficulty,
      priority,
      
      structuredData: {
        contentType,
        taxLaw: [],
        applicableBusinessTypes: [],
        relatedRegulations: [],
        effectiveDate: new Date()
      },
      
      sourceInfo: {
        generatedBy: 'manual',
        generatedAt: new Date()
      },
      
      qualityMetrics: {
        accuracy: 90,
        completeness: 85,
        clarity: 88,
        usefulness: 87,
        overallScore: 88
      },
      
      usageStats: {
        viewCount: 0,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        relatedQuestions: []
      },
      
      status: isPublished ? 'published' : 'draft',
      isPublished,
      isFeatured,
      
      version: 1,
      previousVersions: [],
      
      searchKeywords: [question, ...tags],
      relatedFaqIds: [],
      
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: isPublished ? new Date() : undefined
    };
    
    const collection = knowledgeService.db.collection('faq_articles');
    const result = await collection.insertOne(faqArticle);
    
    // 構造化データを生成して保存
    try {
      const structuredDataService = new StructuredDataService();
      const faqWithId = { ...faqArticle, _id: result.insertedId };
      
      const structuredResult = await structuredDataService.generateStructuredData(
        faqWithId as FaqArticle,
        'FAQPage',
        {
          includeCompanyInfo: false,
          includeCustomerInfo: false,
          includeTaxInfo: false,
          includeLineItems: false,
          language: 'ja',
          context: 'https://schema.org'
        }
      );
      
      if (structuredResult.success && structuredResult.data) {
        await structuredDataService.saveStructuredData(
          result.insertedId,
          'faq',
          'FAQPage',
          structuredResult.data,
          {
            isValid: structuredResult.success,
            errors: structuredResult.errors || [],
            warnings: structuredResult.warnings
          },
          structuredResult.metadata || {}
        );
        console.log('Structured data generated for FAQ:', result.insertedId);
      }
      
      await structuredDataService.close();
    } catch (structuredError) {
      console.error('Failed to generate structured data for FAQ:', structuredError);
      // 構造化データの生成エラーはFAQ作成を停止しない
    }
    
    await knowledgeService.disconnect();
    
    return NextResponse.json({
      success: true,
      faqId: result.insertedId.toString(),
      message: 'FAQ article created successfully'
    });
    
  } catch (error) {
    console.error('[FAQ API] Create error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create FAQ',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'FAQ ID is required' },
        { status: 400 }
      );
    }
    
    await knowledgeService.connect();
    
    const collection = knowledgeService.db.collection('faq_articles');
    
    // バージョン管理のために現在のFAQを取得
    const currentFaq = await collection.findOne({ _id: new ObjectId(id) });
    if (!currentFaq) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }
    
    // 更新データを準備
    const updateDoc = {
      ...updateData,
      version: currentFaq.version + 1,
      updatedAt: new Date(),
      publishedAt: updateData.isPublished && !currentFaq.isPublished ? new Date() : currentFaq.publishedAt
    };
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    
    await knowledgeService.disconnect();
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'FAQ updated successfully'
    });
    
  } catch (error) {
    console.error('[FAQ API] Update error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update FAQ',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'FAQ ID is required' },
        { status: 400 }
      );
    }
    
    await knowledgeService.connect();
    
    const collection = knowledgeService.db.collection('faq_articles');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    await knowledgeService.disconnect();
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'FAQ not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'FAQ deleted successfully'
    });
    
  } catch (error) {
    console.error('[FAQ API] Delete error:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete FAQ',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}