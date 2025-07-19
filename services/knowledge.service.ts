import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { 
  KnowledgeArticle, 
  KnowledgeSource, 
  KnowledgeCategory, 
  KnowledgeEmbedding, 
  KnowledgeProcessingLog 
} from '@/types/collections';
import { FirecrawlClient } from '@/lib/firecrawl-client';

export class KnowledgeService {
  private client: MongoClient;
  private db: Db;
  private articlesCollection: Collection<KnowledgeArticle>;
  private sourcesCollection: Collection<KnowledgeSource>;
  private categoriesCollection: Collection<KnowledgeCategory>;
  private embeddingsCollection: Collection<KnowledgeEmbedding>;
  private logsCollection: Collection<KnowledgeProcessingLog>;
  private firecrawlClient: FirecrawlClient;

  constructor() {
    // MongoDB接続文字列（既存の会計システムと同じ）
    const connectionString = 'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    this.client = new MongoClient(connectionString);
    this.db = this.client.db('accounting');
    this.articlesCollection = this.db.collection<KnowledgeArticle>('knowledgeArticles');
    this.sourcesCollection = this.db.collection<KnowledgeSource>('knowledgeSources');
    this.categoriesCollection = this.db.collection<KnowledgeCategory>('knowledgeCategories');
    this.embeddingsCollection = this.db.collection<KnowledgeEmbedding>('knowledgeEmbeddings');
    this.logsCollection = this.db.collection<KnowledgeProcessingLog>('knowledgeProcessingLogs');
    this.firecrawlClient = new FirecrawlClient();
  }

  // === 記事管理 ===
  async createArticle(article: Omit<KnowledgeArticle, '_id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeArticle> {
    const now = new Date();
    const newArticle: KnowledgeArticle = {
      ...article,
      createdAt: now,
      updatedAt: now,
      scrapedDate: now,
      lastUpdated: now,
      isActive: true,
      isVerified: false,
      qualityScore: 0,
      processingStatus: 'pending'
    };

    const result = await this.db.collection('knowledgeArticles').insertOne(newArticle);
    return { ...newArticle, _id: result.insertedId };
  }

  async getArticleById(id: string): Promise<KnowledgeArticle | null> {
    return await this.articlesCollection.findOne({ _id: new ObjectId(id) });
  }

  async searchArticles(query: {
    text?: string;
    categories?: string[];
    tags?: string[];
    sourceTypes?: string[];
    difficulty?: string;
    contentType?: string;
    dateRange?: { start: Date; end: Date };
    isActive?: boolean;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    try {
      const filter: any = {};

      if (query.text && typeof query.text === 'string' && query.text.trim().length > 0) {
        filter.$text = { $search: query.text.trim() };
      }

    if (query.categories && query.categories.length > 0) {
      filter.categories = { $in: query.categories };
    }

    if (query.tags && query.tags.length > 0) {
      filter.tags = { $in: query.tags };
    }

    if (query.sourceTypes && query.sourceTypes.length > 0) {
      filter.sourceType = { $in: query.sourceTypes };
    }

    if (query.difficulty) {
      filter['taxonomyTags.difficulty'] = query.difficulty;
    }

    if (query.contentType) {
      filter['taxonomyTags.contentType'] = query.contentType;
    }

    if (query.dateRange) {
      filter.publishedDate = {
        $gte: query.dateRange.start,
        $lte: query.dateRange.end
      };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.isVerified !== undefined) {
      filter.isVerified = query.isVerified;
    }

      const total = await this.articlesCollection.countDocuments(filter);
      const articles = await this.articlesCollection
        .find(filter)
        .sort({ publishedDate: -1 })
        .skip(query.offset || 0)
        .limit(query.limit || 20)
        .toArray();

      return { articles, total };
    } catch (error) {
      console.error('Search articles error:', error);
      // エラーが発生した場合は空の結果を返す
      return { articles: [], total: 0 };
    }
  }

  async updateArticle(id: string, updates: Partial<KnowledgeArticle>): Promise<KnowledgeArticle | null> {
    const result = await this.articlesCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    return result.value;
  }

  async deleteArticle(id: string): Promise<boolean> {
    const result = await this.articlesCollection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // === ソース管理 ===
  async createSource(source: Omit<KnowledgeSource, '_id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeSource> {
    const now = new Date();
    const newSource: KnowledgeSource = {
      ...source,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      quality: {
        averageQualityScore: 0,
        totalArticles: 0,
        successfulCrawls: 0,
        failedCrawls: 0
      }
    };

    const result = await this.sourcesCollection.insertOne(newSource);
    return { ...newSource, _id: result.insertedId };
  }

  async getSourceById(id: string): Promise<KnowledgeSource | null> {
    return await this.sourcesCollection.findOne({ _id: new ObjectId(id) });
  }

  async getAllSources(): Promise<KnowledgeSource[]> {
    return await this.sourcesCollection.find({}).toArray();
  }

  async getActiveSourcesByType(type: string): Promise<KnowledgeSource[]> {
    return await this.sourcesCollection.find({ 
      type, 
      isActive: true 
    }).toArray();
  }

  async updateSource(id: string, updates: Partial<KnowledgeSource>): Promise<KnowledgeSource | null> {
    const result = await this.sourcesCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    return result.value;
  }

  // === カテゴリ管理 ===
  async createCategory(category: Omit<KnowledgeCategory, '_id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeCategory> {
    const now = new Date();
    const newCategory: KnowledgeCategory = {
      ...category,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      articleCount: 0
    };

    const result = await this.categoriesCollection.insertOne(newCategory);
    return { ...newCategory, _id: result.insertedId };
  }

  async getAllCategories(): Promise<KnowledgeCategory[]> {
    return await this.categoriesCollection.find({}).sort({ level: 1, sortOrder: 1 }).toArray();
  }

  async getCategoryById(id: string): Promise<KnowledgeCategory | null> {
    return await this.categoriesCollection.findOne({ _id: new ObjectId(id) });
  }

  // === 埋め込み管理 ===
  async createEmbedding(embedding: Omit<KnowledgeEmbedding, '_id' | 'createdAt'>): Promise<KnowledgeEmbedding> {
    const newEmbedding: KnowledgeEmbedding = {
      ...embedding,
      createdAt: new Date()
    };

    const result = await this.embeddingsCollection.insertOne(newEmbedding);
    return { ...newEmbedding, _id: result.insertedId };
  }

  async getEmbeddingsByArticleId(articleId: string): Promise<KnowledgeEmbedding[]> {
    return await this.embeddingsCollection.find({ 
      articleId: new ObjectId(articleId) 
    }).toArray();
  }

  async searchSimilarArticles(vector: number[], limit: number = 10): Promise<KnowledgeArticle[]> {
    try {
      // ベクトル類似度検索の前に、ベクトルが適切な配列であることを確認
      if (!Array.isArray(vector) || vector.length === 0) {
        console.warn('Invalid vector provided for similarity search');
        return [];
      }

      const pipeline = [
        {
          $vectorSearch: {
            index: 'knowledge_embeddings_index',
            path: 'vector', // embeddings.vector ではなく vector フィールドを直接使用
            queryVector: vector,
            numCandidates: 100,
            limit: limit
          }
        },
        {
          $lookup: {
            from: 'knowledgeArticles',
            localField: 'articleId',
            foreignField: '_id',
            as: 'article'
          }
        },
        {
          $unwind: '$article'
        },
        {
          $replaceRoot: { newRoot: '$article' }
        }
      ];

      return await this.embeddingsCollection.aggregate(pipeline).toArray();
    } catch (error) {
      console.error('Vector search error:', error);
      // ベクトル検索が失敗した場合は空配列を返す
      return [];
    }
  }

  // === 処理ログ管理 ===
  async createProcessingLog(log: Omit<KnowledgeProcessingLog, '_id' | 'createdAt'>): Promise<KnowledgeProcessingLog> {
    const newLog: KnowledgeProcessingLog = {
      ...log,
      createdAt: new Date()
    };

    const result = await this.logsCollection.insertOne(newLog);
    return { ...newLog, _id: result.insertedId };
  }

  async getProcessingLogs(filter?: {
    operation?: string;
    status?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<KnowledgeProcessingLog[]> {
    const query: any = {};

    if (filter?.operation) {
      query.operation = filter.operation;
    }

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.dateRange) {
      query.startTime = {
        $gte: filter.dateRange.start,
        $lte: filter.dateRange.end
      };
    }

    return await this.logsCollection
      .find(query)
      .sort({ startTime: -1 })
      .limit(filter?.limit || 100)
      .toArray();
  }

  // === データ取り込み処理 ===
  async crawlSource(sourceId: string): Promise<{ success: boolean; articlesCreated: number; errors: string[] }> {
    const source = await this.getSourceById(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const logId = await this.createProcessingLog({
      sourceId: new ObjectId(sourceId),
      operation: 'crawl',
      status: 'started',
      startTime: new Date()
    });

    try {
      let articlesCreated = 0;
      const errors: string[] = [];

      switch (source.type) {
        case 'blog':
        case 'rss':
          const crawlResult = await this.crawlWebsite(source);
          articlesCreated = crawlResult.articlesCreated;
          errors.push(...crawlResult.errors);
          break;

        case 'youtube':
          // YouTube API実装（今後）
          break;

        case 'twitter':
        case 'linkedin':
        case 'facebook':
          // SNS API実装（今後）
          break;

        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      // ソースの統計情報を更新
      await this.updateSource(sourceId, {
        'quality.totalArticles': source.quality.totalArticles + articlesCreated,
        'quality.successfulCrawls': source.quality.successfulCrawls + 1,
        'crawlSettings.lastCrawled': new Date()
      });

      // ログを更新
      await this.updateProcessingLog(logId._id!.toString(), {
        status: 'completed',
        endTime: new Date(),
        metadata: {
          itemsProcessed: articlesCreated,
          itemsFailed: errors.length
        }
      });

      return {
        success: true,
        articlesCreated,
        errors
      };

    } catch (error) {
      // エラーログを更新
      await this.updateProcessingLog(logId._id!.toString(), {
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // ソースの失敗回数を更新
      await this.updateSource(sourceId, {
        'quality.failedCrawls': source.quality.failedCrawls + 1,
        'quality.lastErrorMessage': error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async crawlWebsite(source: KnowledgeSource): Promise<{ articlesCreated: number; errors: string[] }> {
    const errors: string[] = [];
    let articlesCreated = 0;

    try {
      // Firecrawlを使用してウェブサイトをクロール
      const crawlResult = await this.firecrawlClient.crawl({
        url: source.url,
        limit: source.crawlSettings.maxArticles,
        allowExternalLinks: false,
        ignoreSitemap: false
      });

      if (!crawlResult.success) {
        throw new Error(crawlResult.error || 'Failed to crawl website');
      }

      // 取得したページを記事として処理
      for (const page of crawlResult.data || []) {
        try {
          const article = await this.processPageToArticle(page, source);
          if (article) {
            await this.createArticle(article);
            articlesCreated++;
          }
        } catch (pageError) {
          errors.push(`Failed to process page ${page.metadata?.sourceURL}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      errors.push(`Failed to crawl source ${source.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { articlesCreated, errors };
  }

  private async processPageToArticle(page: any, source: KnowledgeSource): Promise<Omit<KnowledgeArticle, '_id' | 'createdAt' | 'updatedAt'> | null> {
    const content = page.content || page.markdown || '';
    const title = page.metadata?.title || '';
    const sourceUrl = page.metadata?.sourceURL || '';

    if (!content || !title || content.length < 100) {
      return null; // 品質が低いコンテンツはスキップ
    }

    // 重複チェック
    const existingArticle = await this.articlesCollection.findOne({ sourceUrl });
    if (existingArticle) {
      return null; // 既存の記事はスキップ
    }

    // 自動タグ付けと分類
    const taxonomyTags = await this.classifyContent(content, title);
    const qualityScore = await this.calculateQualityScore(content, title, page.metadata);

    return {
      title,
      content,
      excerpt: this.generateExcerpt(content),
      sourceUrl,
      sourceType: source.type,
      authorName: page.metadata?.author,
      publishedDate: page.metadata?.publishedDate ? new Date(page.metadata.publishedDate) : new Date(),
      scrapedDate: new Date(),
      tags: this.extractTags(content, title),
      categories: source.categories,
      taxonomyTags,
      qualityScore,
      isVerified: false,
      isActive: true,
      metadata: {
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 200),
        imageCount: page.metadata?.images?.length || 0,
        linkCount: page.links?.length || 0,
        extractedData: {
          pricing: this.extractPricing(content),
          contacts: this.extractContacts(content),
          regulations: this.extractRegulations(content),
          dates: this.extractDates(content)
        }
      },
      processingStatus: 'completed',
      lastUpdated: new Date()
    };
  }

  private async classifyContent(content: string, title: string): Promise<KnowledgeArticle['taxonomyTags']> {
    // AI分析による自動分類（簡易実装）
    const text = `${title} ${content}`.toLowerCase();
    
    const taxLaw: string[] = [];
    const accountingType: string[] = [];
    const businessType: string[] = [];
    
    // 税法関連の判定
    if (text.includes('消費税') || text.includes('法人税') || text.includes('所得税')) {
      taxLaw.push('国税');
    }
    if (text.includes('住民税') || text.includes('事業税') || text.includes('固定資産税')) {
      taxLaw.push('地方税');
    }
    if (text.includes('インボイス') || text.includes('適格請求書')) {
      taxLaw.push('インボイス制度');
    }

    // 会計種別の判定
    if (text.includes('経理') || text.includes('会計') || text.includes('帳簿')) {
      accountingType.push('会計処理');
    }
    if (text.includes('決算') || text.includes('財務諸表')) {
      accountingType.push('決算処理');
    }
    if (text.includes('給与') || text.includes('賞与') || text.includes('人件費')) {
      accountingType.push('給与計算');
    }

    // 業種の判定
    if (text.includes('飲食') || text.includes('レストラン') || text.includes('カフェ')) {
      businessType.push('飲食業');
    }
    if (text.includes('小売') || text.includes('店舗') || text.includes('販売')) {
      businessType.push('小売業');
    }
    if (text.includes('IT') || text.includes('システム') || text.includes('ソフトウェア')) {
      businessType.push('IT業');
    }

    // 難易度の判定
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    if (text.includes('専門') || text.includes('高度') || text.includes('複雑')) {
      difficulty = 'advanced';
    } else if (text.includes('実務') || text.includes('応用') || text.includes('具体的')) {
      difficulty = 'intermediate';
    }

    // コンテンツタイプの判定
    let contentType: 'news' | 'guide' | 'case_study' | 'regulation' | 'faq' | 'opinion' = 'guide';
    if (text.includes('ニュース') || text.includes('発表') || text.includes('最新')) {
      contentType = 'news';
    } else if (text.includes('事例') || text.includes('ケース') || text.includes('実例')) {
      contentType = 'case_study';
    } else if (text.includes('規則') || text.includes('法律') || text.includes('規制')) {
      contentType = 'regulation';
    } else if (text.includes('Q&A') || text.includes('質問') || text.includes('FAQ')) {
      contentType = 'faq';
    } else if (text.includes('意見') || text.includes('見解') || text.includes('コラム')) {
      contentType = 'opinion';
    }

    return {
      taxLaw,
      accountingType,
      businessType,
      difficulty,
      contentType
    };
  }

  private async calculateQualityScore(content: string, title: string, metadata: any): Promise<number> {
    let score = 0;

    // 基本的な品質指標
    if (title.length > 10 && title.length < 100) score += 20;
    if (content.length > 500) score += 20;
    if (content.length > 2000) score += 10;

    // 構造化されたコンテンツの評価
    if (content.includes('# ') || content.includes('## ')) score += 15;
    if (content.includes('* ') || content.includes('- ')) score += 10;

    // メタデータの完全性
    if (metadata?.author) score += 5;
    if (metadata?.publishedDate) score += 5;
    if (metadata?.description) score += 5;

    // 税務・会計関連キーワードの存在
    const relevantKeywords = ['税務', '会計', '経理', '決算', '申告', '帳簿', '勘定科目'];
    const keywordCount = relevantKeywords.filter(keyword => content.includes(keyword)).length;
    score += Math.min(keywordCount * 2, 10);

    return Math.min(score, 100);
  }

  private generateExcerpt(content: string): string {
    const plainText = content.replace(/[#*`]/g, '').trim();
    const sentences = plainText.split(/[。．]/);
    return sentences.slice(0, 3).join('。') + '。';
  }

  private extractTags(content: string, title: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const tags: string[] = [];

    // 基本的なタグ抽出
    const tagPatterns = [
      { pattern: /消費税|インボイス|適格請求書/g, tag: '消費税' },
      { pattern: /法人税|所得税|確定申告/g, tag: '税務申告' },
      { pattern: /経理|会計|帳簿|仕訳/g, tag: '会計処理' },
      { pattern: /決算|財務諸表|貸借対照表/g, tag: '決算' },
      { pattern: /給与|賞与|人件費|社会保険/g, tag: '給与計算' },
      { pattern: /電子帳簿|デジタル化|IT化/g, tag: 'デジタル化' }
    ];

    tagPatterns.forEach(({ pattern, tag }) => {
      if (pattern.test(text)) {
        tags.push(tag);
      }
    });

    return [...new Set(tags)];
  }

  private extractPricing(content: string): string[] {
    const priceMatches = content.match(/[\$¥€]\s*[\d,]+(?:\.\d{2})?|\d+\s*円/g);
    return priceMatches?.slice(0, 5) || [];
  }

  private extractContacts(content: string): string[] {
    const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    return emailMatches?.slice(0, 3) || [];
  }

  private extractRegulations(content: string): string[] {
    const regulations: string[] = [];
    const regPatterns = [
      /法人税法|所得税法|消費税法|国税通則法/g,
      /会社法|商法|民法|労働基準法/g,
      /電子帳簿保存法|インボイス制度/g
    ];

    regPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        regulations.push(...matches);
      }
    });

    return [...new Set(regulations)];
  }

  private extractDates(content: string): string[] {
    const dateMatches = content.match(/\d{4}年\d{1,2}月\d{1,2}日|\d{4}\/\d{1,2}\/\d{1,2}|\d{4}-\d{1,2}-\d{1,2}/g);
    return dateMatches?.slice(0, 10) || [];
  }

  private async updateProcessingLog(logId: string, updates: Partial<KnowledgeProcessingLog>): Promise<void> {
    await this.logsCollection.updateOne(
      { _id: new ObjectId(logId) },
      { $set: updates }
    );
  }

  // === 接続管理 ===
  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  // === インデックス作成 ===
  async createIndexes(): Promise<void> {
    // 記事コレクションのインデックス
    await this.articlesCollection.createIndex({ title: 'text', content: 'text' });
    await this.articlesCollection.createIndex({ sourceUrl: 1 }, { unique: true });
    await this.articlesCollection.createIndex({ sourceType: 1 });
    await this.articlesCollection.createIndex({ categories: 1 });
    await this.articlesCollection.createIndex({ tags: 1 });
    await this.articlesCollection.createIndex({ publishedDate: -1 });
    await this.articlesCollection.createIndex({ qualityScore: -1 });
    await this.articlesCollection.createIndex({ isActive: 1, isVerified: 1 });

    // ソースコレクションのインデックス
    await this.sourcesCollection.createIndex({ type: 1 });
    await this.sourcesCollection.createIndex({ isActive: 1 });
    await this.sourcesCollection.createIndex({ url: 1 }, { unique: true });

    // カテゴリコレクションのインデックス
    await this.categoriesCollection.createIndex({ slug: 1 }, { unique: true });
    await this.categoriesCollection.createIndex({ level: 1, sortOrder: 1 });

    // 埋め込みコレクションのインデックス
    await this.embeddingsCollection.createIndex({ articleId: 1 });
    await this.embeddingsCollection.createIndex({ model: 1 });

    // ログコレクションのインデックス
    await this.logsCollection.createIndex({ operation: 1 });
    await this.logsCollection.createIndex({ status: 1 });
    await this.logsCollection.createIndex({ startTime: -1 });
  }
}