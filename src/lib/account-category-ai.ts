import { OCRResult } from './ocr-processor';
import { getMcpClient } from './mcp-client';
import { problemSolvingAgent } from '@/agents/problem-solving-agent';

export interface AccountCategoryPrediction {
  category: string;
  confidence: number;
  reasoning: string;
  alternativeCategories?: Array<{
    category: string;
    confidence: number;
  }>;
  taxNotes?: string;
  sources?: string[];
}

/**
 * AIベースの勘定科目分類システム
 * MCPツール（Perplexity、Firecrawl等）を活用してOCRテキストから勘定科目を高精度で推論
 */
export class AccountCategoryAI {
  private mcpClient: ReturnType<typeof getMcpClient>;
  
  constructor() {
    this.mcpClient = getMcpClient();
  }

  /**
   * OCR結果から勘定科目を推論
   * MCPツールを活用して高精度な分析を実行
   */
  async predictAccountCategory(ocrResult: OCRResult, companyId?: string): Promise<AccountCategoryPrediction> {
    try {
      // 1. OCRテキスト全体から重要な情報を抽出
      const extractedInfo = await this.extractKeyInformation(ocrResult);
      
      // 2. Perplexityで最新の税務・会計情報を収集
      const searchQuery = this.buildSearchQuery(ocrResult, extractedInfo);
      const accountingInfo = await this.mcpClient.searchAccountingInfo(searchQuery);
      
      // 3. 特定の領収書パターンを高度に分析
      if (this.isParkingReceipt(ocrResult, extractedInfo)) {
        return await this.analyzeParkingReceipt(ocrResult, extractedInfo, accountingInfo);
      }
      
      // 4. Problem Solving Agentを使用して複雑な分析
      const complexAnalysis = await this.performComplexAnalysis(ocrResult, extractedInfo, accountingInfo);
      
      // 5. 学習データと組み合わせて最終判定
      if (companyId && ocrResult.vendor) {
        return await this.improveWithLearningData(complexAnalysis, companyId, ocrResult.vendor);
      }
      
      return complexAnalysis;
      
    } catch (error) {
      console.error('AI prediction error:', error);
      // エラーの場合は高度なフォールバック
      return this.intelligentFallback(ocrResult);
    }
  }
  
  /**
   * OCRテキストから重要情報を抽出
   */
  private async extractKeyInformation(ocrResult: OCRResult): Promise<any> {
    const text = ocrResult.text.toLowerCase();
    
    // 時間関連の情報を抽出
    const timePatterns = {
      parkingTime: /(?:入庫|入場|in)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      exitTime: /(?:出庫|出場|out)\s*[:：]?\s*(\d{1,2}[:：]\d{2})/,
      duration: /(?:駐車|利用|滞在)時間\s*[:：]?\s*(\d+時間\d+分|\d+分)/,
      hourlyRate: /(\d+)円\s*[/／]\s*(\d+)分/,
    };
    
    // 料金体系の情報を抽出
    const pricePatterns = {
      baseRate: /基本料金\s*[:：]?\s*[¥￥]?(\d+)/,
      additionalRate: /追加料金\s*[:：]?\s*[¥￥]?(\d+)/,
      maxDaily: /最大料金\s*[:：]?\s*[¥￥]?(\d+)/,
      nightRate: /夜間料金\s*[:：]?\s*[¥￥]?(\d+)/,
    };
    
    const extracted = {
      times: {},
      prices: {},
      keywords: [],
      patterns: [],
    };
    
    // 時間情報を抽出
    Object.entries(timePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted.times[key] = match[1];
        extracted.patterns.push(key);
      }
    });
    
    // 料金情報を抽出
    Object.entries(pricePatterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        extracted.prices[key] = parseInt(match[1]);
        extracted.patterns.push(key);
      }
    });
    
    // 業種特定キーワードを抽出
    const businessKeywords = [
      'times', 'タイムズ', 'パーキング', '駐車場', 'コインパーキング',
      'タクシー', 'taxi', 'uber', '配車',
      'スターバックス', 'ドトール', 'タリーズ', 'カフェ', 'coffee',
      'レストラン', '居酒屋', '寿司', '焼肉',
      'コンビニ', 'ローソン', 'セブン', 'ファミリーマート',
    ];
    
    extracted.keywords = businessKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    return extracted;
  }
  
  /**
   * 検索クエリを構築
   */
  private buildSearchQuery(ocrResult: OCRResult, extractedInfo: any): string {
    const components = [
      ocrResult.vendor || '',
      ...extractedInfo.keywords,
      extractedInfo.patterns.includes('parkingTime') ? '駐車場 利用料' : '',
      ocrResult.items?.map(item => item.name).join(' ') || '',
      `金額${ocrResult.amount}円`,
    ].filter(Boolean);
    
    return components.join(' ');
  }
  
  /**
   * 駐車場レシートかどうかを判定
   */
  private isParkingReceipt(ocrResult: OCRResult, extractedInfo: any): boolean {
    const text = ocrResult.text.toLowerCase();
    const vendor = (ocrResult.vendor || '').toLowerCase();
    
    // 複数の指標でスコアリング
    let score = 0;
    
    // ベンダー名による判定（最重要）
    if (vendor.includes('times') || vendor.includes('タイムズ') || 
        vendor.includes('パーキング') || vendor.includes('駐車場')) {
      score += 0.4;
    }
    
    // 時間情報による判定
    if (extractedInfo.times.parkingTime && extractedInfo.times.exitTime) {
      score += 0.3;
    }
    
    // 駐車場特有のキーワード
    const parkingKeywords = ['入庫', '出庫', '駐車時間', '駐車料金', '利用時間'];
    const keywordCount = parkingKeywords.filter(kw => text.includes(kw)).length;
    score += keywordCount * 0.1;
    
    // 料金体系による判定
    if (extractedInfo.prices.hourlyRate || extractedInfo.prices.maxDaily) {
      score += 0.2;
    }
    
    return score >= 0.5;
  }
  
  /**
   * 駐車場レシートの高度な分析
   */
  private async analyzeParkingReceipt(
    ocrResult: OCRResult, 
    extractedInfo: any,
    accountingInfo: string
  ): Promise<AccountCategoryPrediction> {
    // Perplexityで駐車場利用の会計処理を詳細に調査
    const parkingQuery = `
      駐車場利用料の勘定科目 旅費交通費 
      ${ocrResult.vendor} 
      ${extractedInfo.times.duration || ''} 
      最新の税務処理
    `;
    
    const specificInfo = await this.mcpClient.searchAccountingInfo(parkingQuery);
    
    return {
      category: '旅費交通費',
      confidence: 0.95,
      reasoning: `
        駐車場利用と判定しました。
        【判定根拠】
        1. ベンダー名: ${ocrResult.vendor}
        2. 入出庫時刻の記載: ${extractedInfo.times.parkingTime || 'なし'} - ${extractedInfo.times.exitTime || 'なし'}
        3. 駐車時間: ${extractedInfo.times.duration || '不明'}
        4. 料金体系: 時間単位での課金
        
        【会計処理の根拠】
        ${specificInfo || accountingInfo}
      `.trim(),
      alternativeCategories: [
        { category: '会議費', confidence: 0.03 },
        { category: '接待交際費', confidence: 0.02 }
      ],
      taxNotes: '駐車場利用料は消費税の課税対象。仕入税額控除可能。',
      sources: ['Perplexity AI', '国税庁ガイドライン']
    };
  }
  
  /**
   * Problem Solving Agentを使用した複雑な分析
   */
  private async performComplexAnalysis(
    ocrResult: OCRResult,
    extractedInfo: any,
    accountingInfo: string
  ): Promise<AccountCategoryPrediction> {
    try {
      // Problem Solving Agentに分析を依頼
      const solution = await problemSolvingAgent.tools.solveProblem.execute({
        problem: `
          以下のレシート情報から適切な勘定科目を判定してください：
          
          OCRテキスト: ${ocrResult.text}
          ベンダー: ${ocrResult.vendor || '不明'}
          金額: ${ocrResult.amount || '不明'}円
          品目: ${ocrResult.items?.map(i => i.name).join(', ') || 'なし'}
          
          抽出された情報:
          ${JSON.stringify(extractedInfo, null, 2)}
          
          収集した会計情報:
          ${accountingInfo}
        `,
        requiresWebSearch: true,
        requiresDataAnalysis: true,
        context: { 
          type: 'accounting',
          country: 'Japan',
          taxSystem: 'consumption_tax'
        }
      });
      
      // 解決策から勘定科目を抽出
      return this.parseSolutionToPrediction(solution, ocrResult);
      
    } catch (error) {
      console.error('Complex analysis failed:', error);
      // フォールバック
      return this.intelligentFallback(ocrResult);
    }
  }
  
  /**
   * Problem Solving Agentの結果を予測形式に変換
   */
  private parseSolutionToPrediction(solution: any, ocrResult: OCRResult): AccountCategoryPrediction {
    // AIの分析結果から勘定科目を抽出
    const analysisText = JSON.stringify(solution);
    
    // デフォルトの予測
    let prediction: AccountCategoryPrediction = {
      category: '消耗品費',
      confidence: 0.5,
      reasoning: 'AIによる分析結果',
      alternativeCategories: []
    };
    
    // 分析結果から勘定科目を推定
    const categoryMappings = {
      '旅費交通費': ['交通', '駐車', 'タクシー', '電車', 'バス', 'ガソリン'],
      '会議費': ['カフェ', '喫茶', '打ち合わせ', 'ミーティング'],
      '接待交際費': ['レストラン', '飲食', '接待', '懇親'],
      '消耗品費': ['文房具', '事務用品', '日用品', '消耗品'],
      '通信費': ['電話', 'インターネット', '通信', '携帯'],
    };
    
    Object.entries(categoryMappings).forEach(([category, keywords]) => {
      const matchCount = keywords.filter(kw => 
        analysisText.toLowerCase().includes(kw)
      ).length;
      
      if (matchCount > 0) {
        prediction.category = category;
        prediction.confidence = Math.min(0.7 + matchCount * 0.1, 0.95);
      }
    });
    
    prediction.reasoning = `
      Problem Solving Agentによる総合分析：
      ${solution.recommendations?.join('\n') || ''}
      
      データソース：
      ${solution.data?.searchResults?.sources?.join(', ') || 'Perplexity AI'}
    `.trim();
    
    return prediction;
  }
  
  /**
   * インテリジェントなフォールバック処理
   */
  private intelligentFallback(ocrResult: OCRResult): AccountCategoryPrediction {
    const text = ocrResult.text.toLowerCase();
    const vendor = (ocrResult.vendor || '').toLowerCase();
    
    // パターンベースの高度な分析
    const patterns = {
      '旅費交通費': {
        keywords: ['駐車', 'パーキング', 'times', 'タクシー', '電車', 'バス', 'ガソリン', '高速'],
        score: 0
      },
      '会議費': {
        keywords: ['カフェ', 'コーヒー', 'スターバックス', 'ドトール', '喫茶'],
        score: 0
      },
      '接待交際費': {
        keywords: ['レストラン', '居酒屋', '寿司', '焼肉', '和食', '中華'],
        score: 0
      },
      '消耗品費': {
        keywords: ['コンビニ', 'ローソン', 'セブン', '文房具', '事務用品'],
        score: 0
      }
    };
    
    // スコアリング
    Object.entries(patterns).forEach(([category, data]) => {
      data.keywords.forEach(keyword => {
        if (vendor.includes(keyword) || text.includes(keyword)) {
          patterns[category].score += 1;
        }
      });
    });
    
    // 最高スコアのカテゴリを選択
    const bestCategory = Object.entries(patterns)
      .sort((a, b) => b[1].score - a[1].score)[0];
    
    const confidence = bestCategory[1].score > 0 
      ? Math.min(0.6 + bestCategory[1].score * 0.1, 0.9)
      : 0.5;
    
    return {
      category: bestCategory[0],
      confidence,
      reasoning: `キーワード分析により${bestCategory[0]}と判定（マッチ数: ${bestCategory[1].score}）`,
      alternativeCategories: Object.entries(patterns)
        .filter(([cat]) => cat !== bestCategory[0] && patterns[cat].score > 0)
        .map(([cat]) => ({
          category: cat,
          confidence: Math.min(0.3 + patterns[cat].score * 0.1, 0.6)
        }))
        .slice(0, 2)
    };
  }

  /**
   * 学習データに基づく推論の改善
   * AccountLearningSystemと連携して、過去の分類結果を参考にする
   */
  async improveWithLearningData(
    prediction: AccountCategoryPrediction,
    companyId: string,
    vendorName: string
  ): Promise<AccountCategoryPrediction> {
    try {
      // 学習システムから過去の分類データを取得
      const { AccountLearningSystem } = await import('./account-learning-system');
      const learningSystem = new AccountLearningSystem();
      
      const learnedPrediction = await learningSystem.predictAccountCategory(
        companyId,
        vendorName
      );
      
      if (learnedPrediction && learnedPrediction.confidence >= 0.8) {
        // 学習データの信頼度が高い場合は、それを優先
        return {
          category: learnedPrediction.category,
          confidence: learnedPrediction.confidence,
          reasoning: `過去の分類実績に基づいて判定しました。${prediction.reasoning}`,
          alternativeCategories: [
            { 
              category: prediction.category, 
              confidence: prediction.confidence * 0.8 
            },
            ...(prediction.alternativeCategories || []).slice(0, 1)
          ],
          taxNotes: prediction.taxNotes,
          sources: [...(prediction.sources || []), '学習データ']
        };
      } else if (learnedPrediction && learnedPrediction.category === prediction.category) {
        // AIの推論と学習データが一致する場合は信頼度を上げる
        return {
          ...prediction,
          confidence: Math.min(prediction.confidence * 1.1, 0.98),
          reasoning: `${prediction.reasoning}\n\n【学習データとの一致】過去の分類実績とも一致しています。`,
          sources: [...(prediction.sources || []), '学習データ（一致）']
        };
      }
    } catch (error) {
      console.log('Learning data not available, using AI prediction only');
    }
    
    return prediction;
  }
}