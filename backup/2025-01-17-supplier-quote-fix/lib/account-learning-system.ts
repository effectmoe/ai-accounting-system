import { db } from './mongodb-client';
import { ObjectId } from 'mongodb';

/**
 * 勘定科目学習システム
 * ユーザーが確定した勘定科目の判定を学習し、今後の判定精度を向上させる
 */

export interface AccountLearningData {
  _id?: ObjectId;
  companyId: string;
  vendorName: string;
  vendorNameLower: string; // 検索用の小文字バージョン
  accountCategory: string; // 勘定科目
  confidence: number; // 信頼度（ユーザー確定なら1.0）
  patterns?: string[]; // ベンダー名から抽出したパターン
  learnedFrom: 'user' | 'system'; // 学習元
  metadata?: {
    originalAmount?: number;
    description?: string;
    documentType?: string;
    learnedAt: Date;
    lastUsedAt?: Date;
    useCount?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class AccountLearningSystem {
  private collectionName = 'accountLearningData';

  /**
   * ベンダー名から勘定科目を学習する
   */
  async learnAccountMapping(
    companyId: string,
    vendorName: string,
    accountCategory: string,
    metadata?: any
  ): Promise<AccountLearningData> {
    const vendorNameLower = vendorName.toLowerCase();
    
    // 既存の学習データを確認
    const existing = await db.findOne(this.collectionName, {
      companyId,
      vendorNameLower,
      accountCategory
    });

    if (existing) {
      // 既存データを更新（使用回数を増やす）
      const updated = await db.update(this.collectionName, existing._id.toString(), {
        confidence: Math.min(existing.confidence + 0.1, 1.0), // 信頼度を上げる
        'metadata.lastUsedAt': new Date(),
        'metadata.useCount': (existing.metadata?.useCount || 0) + 1,
        updatedAt: new Date()
      });
      return updated;
    }

    // 新規学習データを作成
    const patterns = this.extractPatterns(vendorName);
    
    const learningData: AccountLearningData = {
      companyId,
      vendorName,
      vendorNameLower,
      accountCategory,
      confidence: 1.0, // ユーザー確定は最高信頼度
      patterns,
      learnedFrom: 'user',
      metadata: {
        ...metadata,
        learnedAt: new Date(),
        useCount: 1
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await db.create(this.collectionName, learningData);
  }

  /**
   * ベンダー名から勘定科目を推測する
   */
  async predictAccountCategory(
    companyId: string,
    vendorName: string
  ): Promise<{ category: string; confidence: number } | null> {
    const vendorNameLower = vendorName.toLowerCase();

    // 完全一致を検索
    let match = await db.findOne(this.collectionName, {
      companyId,
      vendorNameLower
    }, {
      sort: { confidence: -1, 'metadata.useCount': -1 }
    });

    if (match) {
      return {
        category: match.accountCategory,
        confidence: match.confidence
      };
    }

    // パターンマッチングで検索
    const patterns = this.extractPatterns(vendorName);
    
    // パターンによる部分一致検索
    const patternMatches = await db.find(this.collectionName, {
      companyId,
      patterns: { $in: patterns }
    }, {
      sort: { confidence: -1, 'metadata.useCount': -1 },
      limit: 5
    });

    if (patternMatches.length > 0) {
      // 最も信頼度の高いものを返す
      const bestMatch = patternMatches[0];
      return {
        category: bestMatch.accountCategory,
        confidence: bestMatch.confidence * 0.8 // パターンマッチは信頼度を下げる
      };
    }

    // グローバル学習データから検索（会社IDに依存しない）
    const globalMatch = await db.findOne(this.collectionName, {
      vendorNameLower,
      confidence: { $gte: 0.8 }
    }, {
      sort: { confidence: -1, 'metadata.useCount': -1 }
    });

    if (globalMatch) {
      return {
        category: globalMatch.accountCategory,
        confidence: globalMatch.confidence * 0.6 // 他社データは信頼度をさらに下げる
      };
    }

    return null;
  }

  /**
   * ベンダー名からパターンを抽出
   */
  private extractPatterns(vendorName: string): string[] {
    const patterns: string[] = [];
    const lower = vendorName.toLowerCase();

    // 会社形態を除去
    const cleanName = lower
      .replace(/株式会社|（株）|\(株\)/g, '')
      .replace(/有限会社|（有）|\(有\)/g, '')
      .replace(/合同会社|（合）|\(合\)/g, '')
      .trim();

    patterns.push(cleanName);

    // 単語を抽出
    const words = cleanName.split(/[\s　・]+/).filter(w => w.length > 1);
    patterns.push(...words);

    // 業種キーワードを抽出
    const businessKeywords = [
      // 交通関連
      'タクシー', '駐車場', 'パーキング', 'times', 'タイムズ', 
      'コインパーキング', '月極', 'jr', '鉄道', 'バス', '高速道路', 
      'etc', 'ガソリン', '電車', '航空', '交通',
      // 飲食関連
      'コーヒー', 'カフェ', 'スターバックス', 'ドトール', 'タリーズ',
      'レストラン', '食堂', '居酒屋', '寿司', '焼肉', '中華',
      'イタリアン', 'フレンチ', '和食', '飲食', '喫茶',
      // 小売関連
      'コンビニ', 'ローソン', 'セブン', 'ファミリーマート', 
      'ミニストップ', 'デイリー',
      // その他
      'ホテル', '文具', '事務', 'コクヨ', 'アスクル'
    ];

    businessKeywords.forEach(keyword => {
      if (lower.includes(keyword.toLowerCase())) {
        patterns.push(keyword.toLowerCase());
      }
    });

    return [...new Set(patterns)]; // 重複を除去
  }

  /**
   * 学習データの統計情報を取得
   */
  async getLearningStats(companyId: string): Promise<{
    totalLearnings: number;
    categoryCounts: Record<string, number>;
    mostConfidentMappings: AccountLearningData[];
  }> {
    const allData = await db.find(this.collectionName, { companyId });
    
    const categoryCounts: Record<string, number> = {};
    allData.forEach(data => {
      categoryCounts[data.accountCategory] = 
        (categoryCounts[data.accountCategory] || 0) + 1;
    });

    const mostConfidentMappings = await db.find(this.collectionName, {
      companyId,
      confidence: { $gte: 0.9 }
    }, {
      sort: { confidence: -1, 'metadata.useCount': -1 },
      limit: 10
    });

    return {
      totalLearnings: allData.length,
      categoryCounts,
      mostConfidentMappings
    };
  }

  /**
   * 学習データをクリア（リセット）
   */
  async clearLearningData(companyId: string): Promise<boolean> {
    try {
      await db.deleteMany(this.collectionName, { companyId });
      return true;
    } catch (error) {
      console.error('Failed to clear learning data:', error);
      return false;
    }
  }
}