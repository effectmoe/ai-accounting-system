import { ObjectId } from 'mongodb';
import { DatabaseService } from '@/lib/mongodb-client';
import type {
  RAGRecord,
  CreateRAGRecordParams,
  UpdateRAGRecordParams,
  RAGRecordSearchParams,
  RAGSimilarSearchParams,
  RAGSimilarSearchResult,
} from '@/types/rag-record';
import type { AccountCategory } from '@/types/receipt';

// コレクション名
const RAG_RECORDS_COLLECTION = 'ragRecords';

/**
 * RAGレコードサービス
 * MongoDB版の学習データ管理
 */
export class RAGRecordService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * 検索用ドキュメント（テキスト）を生成
   */
  private generateDocument(
    storeName: string,
    itemDescription?: string,
    description?: string
  ): string {
    return [storeName, itemDescription, description]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  /**
   * RAGレコードを作成
   */
  async create(params: CreateRAGRecordParams): Promise<RAGRecord> {
    const document = this.generateDocument(
      params.storeName,
      params.itemDescription,
      params.description
    );

    const record: Omit<RAGRecord, '_id' | 'createdAt' | 'updatedAt'> = {
      document,
      storeName: params.storeName,
      category: params.category,
      description: params.description,
      itemDescription: params.itemDescription,
      totalAmount: params.totalAmount,
      issueDate: params.issueDate,
      verified: params.verified ?? false,
      sourceReceiptId: params.sourceReceiptId,
    };

    return this.db.create<RAGRecord>(RAG_RECORDS_COLLECTION, record);
  }

  /**
   * IDでRAGレコードを取得
   */
  async getById(id: string): Promise<RAGRecord | null> {
    return this.db.findOne<RAGRecord>(RAG_RECORDS_COLLECTION, {
      _id: new ObjectId(id),
    });
  }

  /**
   * sourceReceiptIdでRAGレコードを検索
   * 領収書IDに紐づく既存のRAGレコードを取得
   */
  async findBySourceReceiptId(sourceReceiptId: string): Promise<RAGRecord | null> {
    return this.db.findOne<RAGRecord>(RAG_RECORDS_COLLECTION, {
      sourceReceiptId,
    });
  }

  /**
   * RAGレコード一覧を取得
   */
  async search(params: RAGRecordSearchParams = {}): Promise<{
    records: RAGRecord[];
    total: number;
  }> {
    const filter: Record<string, unknown> = {};

    if (params.verified !== undefined) {
      filter.verified = params.verified;
    }

    if (params.storeName) {
      filter.storeName = { $regex: params.storeName, $options: 'i' };
    }

    if (params.category) {
      filter.category = params.category;
    }

    if (params.search) {
      const searchRegex = { $regex: params.search, $options: 'i' };
      filter.$or = [
        { storeName: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { itemDescription: searchRegex },
        { document: searchRegex },
      ];
    }

    const limit = params.limit ?? 100;
    const skip = params.skip ?? 0;

    const records = await this.db.find<RAGRecord>(
      RAG_RECORDS_COLLECTION,
      filter,
      {
        sort: { createdAt: -1 },
        limit,
        skip,
      }
    );

    const total = await this.db.count(RAG_RECORDS_COLLECTION, filter);

    return { records, total };
  }

  /**
   * 全RAGレコードを取得
   */
  async getAll(): Promise<RAGRecord[]> {
    return this.db.find<RAGRecord>(
      RAG_RECORDS_COLLECTION,
      {},
      { sort: { createdAt: -1 } }
    );
  }

  /**
   * RAGレコードを更新
   */
  async update(id: string, params: UpdateRAGRecordParams): Promise<RAGRecord | null> {
    // 現在のレコードを取得
    const current = await this.getById(id);
    if (!current) return null;

    const updateData: Partial<RAGRecord> = {};

    if (params.storeName !== undefined) updateData.storeName = params.storeName;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.itemDescription !== undefined) updateData.itemDescription = params.itemDescription;
    if (params.verified !== undefined) updateData.verified = params.verified;

    // ドキュメント（検索用テキスト）を再生成
    const newStoreName = params.storeName ?? current.storeName;
    const newItemDescription = params.itemDescription ?? current.itemDescription;
    const newDescription = params.description ?? current.description;
    updateData.document = this.generateDocument(
      newStoreName,
      newItemDescription,
      newDescription
    );

    return this.db.update<RAGRecord>(RAG_RECORDS_COLLECTION, id, updateData);
  }

  /**
   * RAGレコードを削除
   */
  async delete(id: string): Promise<boolean> {
    return this.db.delete(RAG_RECORDS_COLLECTION, id);
  }

  /**
   * 類似レコードを検索（テキストベース）
   * 注: ベクトル検索の代わりにテキストマッチングを使用
   */
  async searchSimilar(params: RAGSimilarSearchParams): Promise<RAGSimilarSearchResult> {
    try {
      // 検証済みレコードのみを対象
      const verifiedRecords = await this.db.find<RAGRecord>(
        RAG_RECORDS_COLLECTION,
        { verified: true },
        { sort: { createdAt: -1 } }
      );

      if (verifiedRecords.length === 0) {
        return {
          success: true,
          category: null,
          subject: null,
          similarity: 0,
          source: 'fallback',
        };
      }

      // 店舗名で完全一致を検索
      const exactMatch = verifiedRecords.find(
        (r) => r.storeName.toLowerCase() === params.storeName.toLowerCase()
      );

      if (exactMatch) {
        return {
          success: true,
          category: exactMatch.category,
          subject: exactMatch.description,
          similarity: 1.0,
          source: 'rag',
          matchedStore: exactMatch.storeName,
          matchedItem: exactMatch.itemDescription,
        };
      }

      // 店舗名の部分一致を検索
      const partialMatches = verifiedRecords.filter((r) =>
        r.storeName.toLowerCase().includes(params.storeName.toLowerCase()) ||
        params.storeName.toLowerCase().includes(r.storeName.toLowerCase())
      );

      if (partialMatches.length > 0) {
        // 最も類似度の高いものを選択（簡易的な類似度計算）
        const bestMatch = partialMatches[0];
        const similarity = this.calculateSimilarity(
          params.storeName,
          bestMatch.storeName
        );

        if (similarity > 0.5) {
          return {
            success: true,
            category: bestMatch.category,
            subject: bestMatch.description,
            similarity,
            source: 'rag',
            matchedStore: bestMatch.storeName,
            matchedItem: bestMatch.itemDescription,
          };
        }
      }

      // マッチなし
      return {
        success: true,
        category: null,
        subject: null,
        similarity: 0,
        source: 'fallback',
      };
    } catch (error) {
      console.error('RAG similar search error:', error);
      return {
        success: false,
        category: null,
        subject: null,
        similarity: 0,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 簡易的な文字列類似度計算（Jaccard係数ベース）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;

    // 文字レベルのJaccard係数
    const chars1 = new Set(s1.split(''));
    const chars2 = new Set(s2.split(''));

    const intersection = new Set([...chars1].filter((c) => chars2.has(c)));
    const union = new Set([...chars1, ...chars2]);

    return intersection.size / union.size;
  }

  /**
   * 領収書を分類（RAG + AIフォールバック）
   */
  async classifyReceipt(
    data: RAGSimilarSearchParams,
    aiEstimate: { category: AccountCategory; subject: string; confidence: number }
  ): Promise<{
    category: AccountCategory;
    subject: string;
    confidence: number;
    source: 'rag' | 'ai';
  }> {
    const ragResult = await this.searchSimilar(data);

    // RAGで高精度マッチが見つかった場合
    if (
      ragResult.success &&
      ragResult.source === 'rag' &&
      ragResult.similarity > 0.85 &&
      ragResult.category
    ) {
      console.log(
        `[RAG] 類似マッチ: ${ragResult.matchedStore} (${ragResult.similarity.toFixed(2)})`
      );
      return {
        category: ragResult.category,
        subject: ragResult.subject || aiEstimate.subject,
        confidence: ragResult.similarity,
        source: 'rag',
      };
    }

    // フォールバック: AI推定を使用
    console.log(
      `[RAG] フォールバック: 類似度=${ragResult.similarity.toFixed(2)} < 0.85`
    );
    return {
      category: aiEstimate.category,
      subject: aiEstimate.subject,
      confidence: aiEstimate.confidence,
      source: 'ai',
    };
  }

  /**
   * 統計情報を取得
   */
  async getStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    storeCount: number;
  }> {
    const all = await this.getAll();
    const verified = all.filter((r) => r.verified);
    const stores = new Set(all.map((r) => r.storeName));

    return {
      total: all.length,
      verified: verified.length,
      unverified: all.length - verified.length,
      storeCount: stores.size,
    };
  }
}

// シングルトンインスタンス
let instance: RAGRecordService | null = null;

export function getRAGRecordService(): RAGRecordService {
  if (!instance) {
    instance = new RAGRecordService();
  }
  return instance;
}
