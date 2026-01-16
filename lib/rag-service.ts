/**
 * RAGサービス
 * 領収書分類のためのRAG（Retrieval-Augmented Generation）機能を提供
 *
 * 仕組み:
 * 1. 過去に処理した領収書データをMongoDBに保存
 * 2. 新しい領収書が来たら、類似の過去データを検索
 * 3. 類似度が高ければ（0.85以上）、その勘定科目と但し書きを再利用
 * 4. 類似度が低ければ、AI推定にフォールバック
 */

import { getRAGRecordService } from '@/services/rag-record.service';
import type { AccountCategory } from '@/types/receipt';

/**
 * 領収書データ（検索用）
 */
export interface ReceiptData {
  store_name: string;        // 店舗名
  item_description: string;  // 品目（明細の最初の品名など）
  description: string;       // 但し書き
  issue_date: string;        // 発行日（YYYY-MM-DD形式）
  total_amount: number;      // 合計金額
}

/**
 * RAG検索結果
 */
export interface RagSearchResult {
  success: boolean;
  category: string | null;    // 勘定科目
  subject: string | null;     // 但し書き
  similarity: number;         // 類似度（0-1）
  source: 'rag' | 'fallback'; // 結果のソース
  error: string | null;
  matched_store?: string;     // マッチした店舗名（デバッグ用）
  matched_item?: string;      // マッチした品目（デバッグ用）
}

/**
 * RAGに追加するデータ
 */
export interface ReceiptForRag extends ReceiptData {
  id: string;                 // 一意のID
  category: string;           // 勘定科目
  verified: boolean;          // 人間が確認済みか
}

/**
 * 類似領収書を検索
 *
 * @param data - 検索する領収書データ
 * @returns 検索結果（カテゴリ、但し書き、類似度など）
 *
 * @example
 * ```ts
 * const result = await searchSimilarReceipts({
 *   store_name: 'セブンイレブン',
 *   item_description: 'おにぎり',
 *   description: '会議用軽食',
 *   issue_date: '2025-01-15',
 *   total_amount: 500
 * });
 *
 * if (result.source === 'rag' && result.similarity > 0.85) {
 *   // RAGで高精度マッチ
 *   console.log('勘定科目:', result.category);
 *   console.log('但し書き:', result.subject);
 * }
 * ```
 */
export async function searchSimilarReceipts(
  data: ReceiptData
): Promise<RagSearchResult> {
  try {
    const service = getRAGRecordService();
    const result = await service.searchSimilar({
      storeName: data.store_name,
      itemDescription: data.item_description,
      description: data.description,
    });

    return {
      success: result.success,
      category: result.category,
      subject: result.subject,
      similarity: result.similarity,
      source: result.source,
      error: result.error || null,
      matched_store: result.matchedStore,
      matched_item: result.matchedItem,
    };
  } catch (error) {
    console.error('RAG search error:', error);
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
 * 領収書データをRAGに追加または更新（Upsert）
 * ユーザーが手動で修正したデータをフィードバックとして蓄積
 *
 * 同一のsourceReceiptIdを持つレコードが存在する場合は更新し、
 * 存在しない場合は新規作成する
 *
 * @param data - 追加する領収書データ
 * @returns 追加/更新結果
 *
 * @example
 * ```ts
 * await addReceiptToRag({
 *   id: 'receipt-123',
 *   store_name: 'セブンイレブン',
 *   item_description: 'おにぎり、お茶',
 *   description: '会議用軽食代として',
 *   issue_date: '2025-01-15',
 *   total_amount: 500,
 *   category: '会議費',
 *   verified: true
 * });
 * ```
 */
export async function addReceiptToRag(
  data: ReceiptForRag
): Promise<{ success: boolean; error: string | null; action?: 'created' | 'updated' }> {
  try {
    const service = getRAGRecordService();

    // 同一のsourceReceiptIdを持つ既存レコードを検索
    const existingRecord = await service.findBySourceReceiptId(data.id);

    if (existingRecord && existingRecord._id) {
      // 既存レコードがある場合は更新
      await service.update(existingRecord._id.toString(), {
        storeName: data.store_name,
        category: data.category as AccountCategory,
        description: data.description,
        itemDescription: data.item_description,
        verified: data.verified,
      });
      console.log(`[RAG] Updated existing record for receipt: ${data.id}`);
      return { success: true, error: null, action: 'updated' };
    } else {
      // 既存レコードがない場合は新規作成
      await service.create({
        storeName: data.store_name,
        category: data.category as AccountCategory,
        description: data.description,
        itemDescription: data.item_description,
        totalAmount: data.total_amount,
        issueDate: data.issue_date,
        verified: data.verified,
        sourceReceiptId: data.id,
      });
      console.log(`[RAG] Created new record for receipt: ${data.id}`);
      return { success: true, error: null, action: 'created' };
    }
  } catch (error) {
    console.error('RAG add error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 領収書を分類（RAG + AIフォールバック）
 *
 * 処理フロー:
 * 1. RAGで類似領収書を検索
 * 2. 類似度 > 0.85 → RAG結果を採用
 * 3. 類似度 <= 0.85 → aiEstimate（AI推定）を採用
 *
 * @param data - 分類する領収書データ
 * @param aiEstimate - AI推定結果（フォールバック用）
 * @returns 分類結果
 */
export async function classifyReceipt(
  data: ReceiptData,
  aiEstimate: { category: string; subject: string; confidence: number }
): Promise<{
  category: string;
  subject: string;
  confidence: number;
  source: 'rag' | 'ai';
}> {
  const service = getRAGRecordService();

  return service.classifyReceipt(
    {
      storeName: data.store_name,
      itemDescription: data.item_description,
      description: data.description,
    },
    {
      category: aiEstimate.category as AccountCategory,
      subject: aiEstimate.subject,
      confidence: aiEstimate.confidence,
    }
  );
}
