/**
 * 銀行取引サービス
 * インポート済み取引の管理、重複チェック、履歴管理を行う
 */

import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb-client';
import { BankTransaction } from '@/types/bank-csv';
import {
  ImportedBankTransaction,
  BankImportHistory,
  DuplicateCheckResult,
  ExtendedImportResult,
} from '@/types/bank-import';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const COLLECTION_TRANSACTIONS = 'importedBankTransactions';
const COLLECTION_HISTORY = 'bankImportHistory';

export class BankTransactionService {
  /**
   * 取引のハッシュ値を生成（重複チェック用）
   * 日付 + 金額 + 内容 + 参照番号（あれば）を使用
   */
  generateTransactionHash(transaction: BankTransaction): string {
    const dateStr = transaction.date.toISOString().split('T')[0];
    const data = `${dateStr}|${transaction.amount}|${transaction.content}|${transaction.referenceNumber || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * 単一取引の重複チェック
   */
  async checkDuplicate(transaction: BankTransaction): Promise<DuplicateCheckResult> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    const hash = this.generateTransactionHash(transaction);

    // ハッシュで検索
    const existing = await collection.findOne({ transactionHash: hash });

    if (existing) {
      return {
        isDuplicate: true,
        existingTransaction: existing,
        transactionHash: hash,
      };
    }

    // FITIDがある場合はそちらでも検索
    if (transaction.referenceNumber) {
      const existingByFitId = await collection.findOne({ fitId: transaction.referenceNumber });
      if (existingByFitId) {
        return {
          isDuplicate: true,
          existingTransaction: existingByFitId,
          transactionHash: hash,
        };
      }
    }

    return {
      isDuplicate: false,
      transactionHash: hash,
    };
  }

  /**
   * 複数取引の一括重複チェック
   */
  async checkDuplicates(transactions: BankTransaction[]): Promise<Map<string, DuplicateCheckResult>> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    const results = new Map<string, DuplicateCheckResult>();
    const hashes: string[] = [];
    const hashToTransaction = new Map<string, BankTransaction>();

    // ハッシュを生成
    for (const t of transactions) {
      const hash = this.generateTransactionHash(t);
      hashes.push(hash);
      hashToTransaction.set(hash, t);
    }

    // 一括で検索
    const existingTransactions = await collection
      .find({ transactionHash: { $in: hashes } })
      .toArray();

    const existingHashSet = new Set(existingTransactions.map(t => t.transactionHash));
    const hashToExisting = new Map(existingTransactions.map(t => [t.transactionHash, t]));

    // 結果をマップに格納
    for (const [hash, transaction] of hashToTransaction) {
      const isDuplicate = existingHashSet.has(hash);
      results.set(hash, {
        isDuplicate,
        existingTransaction: isDuplicate ? hashToExisting.get(hash) : undefined,
        transactionHash: hash,
      });
    }

    return results;
  }

  /**
   * 取引をインポート（重複チェック付き）
   */
  async importTransactions(
    transactions: BankTransaction[],
    options: {
      importId: string;
      fileName: string;
      fileType: 'csv' | 'ofx';
      bankType?: string;
      skipDuplicates?: boolean;
    }
  ): Promise<ExtendedImportResult> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    const result: ExtendedImportResult = {
      success: true,
      importId: options.importId,
      created: 0,
      skipped: 0,
      duplicates: 0,
      errors: [],
      duplicateTransactions: [],
    };

    // 重複チェック
    const duplicateResults = await this.checkDuplicates(transactions);

    const toInsert: ImportedBankTransaction[] = [];
    const now = new Date();

    for (const transaction of transactions) {
      const hash = this.generateTransactionHash(transaction);
      const duplicateCheck = duplicateResults.get(hash);

      if (duplicateCheck?.isDuplicate) {
        result.duplicates++;
        result.duplicateTransactions.push({
          date: transaction.date,
          content: transaction.content,
          amount: transaction.amount,
          existingImportDate: duplicateCheck.existingTransaction?.importedAt || now,
        });

        if (options.skipDuplicates !== false) {
          result.skipped++;
          continue;
        }
      }

      const importedTransaction: ImportedBankTransaction = {
        transactionHash: hash,
        fitId: transaction.referenceNumber,
        date: transaction.date,
        content: transaction.content,
        amount: transaction.amount,
        balance: transaction.balance,
        type: transaction.type,
        memo: transaction.memo,
        customerName: transaction.customerName,
        referenceNumber: transaction.referenceNumber,
        importId: options.importId,
        importedAt: now,
        fileName: options.fileName,
        fileType: options.fileType,
        bankType: options.bankType,
        isConfirmed: false,
        createdAt: now,
        updatedAt: now,
      };

      toInsert.push(importedTransaction);
    }

    // 一括挿入
    if (toInsert.length > 0) {
      try {
        const insertResult = await collection.insertMany(toInsert);
        result.created = insertResult.insertedCount;
      } catch (error) {
        logger.error('Failed to insert transactions', error);
        result.success = false;
        result.errors.push(error instanceof Error ? error.message : 'Insert failed');
      }
    }

    return result;
  }

  /**
   * インポート履歴を作成
   */
  async createImportHistory(history: Omit<BankImportHistory, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = await getDatabase();
    const collection = db.collection<BankImportHistory>(COLLECTION_HISTORY);

    const now = new Date();
    const doc: BankImportHistory = {
      ...history,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * インポート履歴を更新
   */
  async updateImportHistory(
    importId: string,
    update: Partial<Omit<BankImportHistory, '_id' | 'importId' | 'createdAt'>>
  ): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<BankImportHistory>(COLLECTION_HISTORY);

    await collection.updateOne(
      { importId },
      {
        $set: {
          ...update,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * インポート履歴一覧を取得
   */
  async getImportHistory(options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ items: BankImportHistory[]; total: number }> {
    const db = await getDatabase();
    const collection = db.collection<BankImportHistory>(COLLECTION_HISTORY);

    const filter: Record<string, unknown> = {};
    if (options?.status) {
      filter.status = options.status;
    }

    const [items, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 20)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * インポート済み取引一覧を取得
   */
  async getImportedTransactions(options?: {
    importId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    type?: 'deposit' | 'withdrawal';
    isConfirmed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ImportedBankTransaction[]; total: number }> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    const filter: Record<string, unknown> = {};

    if (options?.importId) {
      filter.importId = options.importId;
    }
    if (options?.dateFrom || options?.dateTo) {
      filter.date = {};
      if (options.dateFrom) {
        (filter.date as Record<string, unknown>).$gte = options.dateFrom;
      }
      if (options.dateTo) {
        (filter.date as Record<string, unknown>).$lte = options.dateTo;
      }
    }
    if (options?.type) {
      filter.type = options.type;
    }
    if (options?.isConfirmed !== undefined) {
      filter.isConfirmed = options.isConfirmed;
    }

    const [items, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 50)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * 取引のマッチング情報を更新
   */
  async updateTransactionMatch(
    transactionId: string,
    matchInfo: {
      matchedInvoiceId?: ObjectId;
      matchConfidence?: 'high' | 'medium' | 'low' | 'none';
      matchReason?: string;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    await collection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          ...matchInfo,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * 取引を確認済みにする
   */
  async confirmTransaction(transactionId: string, confirmedBy?: string): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<ImportedBankTransaction>(COLLECTION_TRANSACTIONS);

    const now = new Date();
    await collection.updateOne(
      { _id: new ObjectId(transactionId) },
      {
        $set: {
          isConfirmed: true,
          confirmedAt: now,
          confirmedBy,
          updatedAt: now,
        },
      }
    );
  }

  /**
   * インデックスを作成
   */
  async createIndexes(): Promise<void> {
    const db = await getDatabase();

    // 取引コレクション
    const transactionsCollection = db.collection(COLLECTION_TRANSACTIONS);
    await transactionsCollection.createIndex({ transactionHash: 1 }, { unique: true });
    await transactionsCollection.createIndex({ fitId: 1 }, { sparse: true });
    await transactionsCollection.createIndex({ importId: 1 });
    await transactionsCollection.createIndex({ date: -1 });
    await transactionsCollection.createIndex({ type: 1 });
    await transactionsCollection.createIndex({ isConfirmed: 1 });
    await transactionsCollection.createIndex({ matchedInvoiceId: 1 }, { sparse: true });

    // 履歴コレクション
    const historyCollection = db.collection(COLLECTION_HISTORY);
    await historyCollection.createIndex({ importId: 1 }, { unique: true });
    await historyCollection.createIndex({ createdAt: -1 });
    await historyCollection.createIndex({ status: 1 });

    logger.info('Bank transaction indexes created');
  }
}

// シングルトンインスタンス
export const bankTransactionService = new BankTransactionService();
