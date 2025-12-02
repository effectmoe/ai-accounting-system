/**
 * 定期インポートサービス
 * スケジュール設定の管理と実行を行う
 */

import { ObjectId } from 'mongodb';
import { getDB } from '@/lib/mongodb-client';
import { ScheduledImportConfig, ScheduledImportRun } from '@/types/scheduled-import';
import { logger } from '@/lib/logger';

const COLLECTION_CONFIG = 'scheduledImportConfigs';
const COLLECTION_RUNS = 'scheduledImportRuns';

export class ScheduledImportService {
  /**
   * 設定一覧を取得
   */
  async getConfigs(options?: {
    isEnabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ScheduledImportConfig[]; total: number }> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);

    const filter: Record<string, unknown> = {};
    if (options?.isEnabled !== undefined) {
      filter.isEnabled = options.isEnabled;
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
   * 設定を取得
   */
  async getConfig(id: string): Promise<ScheduledImportConfig | null> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);
    return collection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * 設定を作成
   */
  async createConfig(config: Omit<ScheduledImportConfig, '_id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);

    const now = new Date();
    const doc: ScheduledImportConfig = {
      ...config,
      createdAt: now,
      updatedAt: now,
    };

    // 次回実行日時を計算
    doc.nextRunAt = this.calculateNextRunTime(doc.schedule);

    const result = await collection.insertOne(doc);
    logger.info('Created scheduled import config', { id: result.insertedId, name: config.name });
    return result.insertedId.toString();
  }

  /**
   * 設定を更新
   */
  async updateConfig(
    id: string,
    update: Partial<Omit<ScheduledImportConfig, '_id' | 'createdAt'>>
  ): Promise<void> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);

    const updateDoc: Record<string, unknown> = {
      ...update,
      updatedAt: new Date(),
    };

    // スケジュールが変更された場合は次回実行日時を再計算
    if (update.schedule) {
      updateDoc.nextRunAt = this.calculateNextRunTime(update.schedule as ScheduledImportConfig['schedule']);
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    logger.info('Updated scheduled import config', { id });
  }

  /**
   * 設定を削除
   */
  async deleteConfig(id: string): Promise<void> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);
    await collection.deleteOne({ _id: new ObjectId(id) });
    logger.info('Deleted scheduled import config', { id });
  }

  /**
   * 設定の有効/無効を切り替え
   */
  async toggleConfig(id: string, isEnabled: boolean): Promise<void> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportConfig>(COLLECTION_CONFIG);

    const updateDoc: Record<string, unknown> = {
      isEnabled,
      updatedAt: new Date(),
    };

    // 有効化する場合は次回実行日時を計算
    if (isEnabled) {
      const config = await this.getConfig(id);
      if (config) {
        updateDoc.nextRunAt = this.calculateNextRunTime(config.schedule);
      }
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    logger.info('Toggled scheduled import config', { id, isEnabled });
  }

  /**
   * 実行履歴を取得
   */
  async getRunHistory(options?: {
    configId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ScheduledImportRun[]; total: number }> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportRun>(COLLECTION_RUNS);

    const filter: Record<string, unknown> = {};
    if (options?.configId) {
      filter.configId = new ObjectId(options.configId);
    }

    const [items, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 20)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    return { items, total };
  }

  /**
   * 実行履歴を記録
   */
  async createRun(run: Omit<ScheduledImportRun, '_id' | 'createdAt'>): Promise<string> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportRun>(COLLECTION_RUNS);

    const doc: ScheduledImportRun = {
      ...run,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(doc);
    return result.insertedId.toString();
  }

  /**
   * 実行履歴を更新
   */
  async updateRun(
    id: string,
    update: Partial<Omit<ScheduledImportRun, '_id' | 'configId' | 'startedAt' | 'createdAt'>>
  ): Promise<void> {
    const db = await getDB();
    const collection = db.collection<ScheduledImportRun>(COLLECTION_RUNS);

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
  }

  /**
   * 次回実行日時を計算
   */
  calculateNextRunTime(schedule: ScheduledImportConfig['schedule']): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    // 次回実行日時を計算
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    // 過去の場合は翌日/翌週/翌月にする
    if (next <= now) {
      switch (schedule.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
      }
    }

    // 週次の場合は指定の曜日に調整
    if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      while (next.getDay() !== schedule.dayOfWeek) {
        next.setDate(next.getDate() + 1);
      }
    }

    // 月次の場合は指定の日付に調整
    if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
      next.setDate(schedule.dayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    return next;
  }

  /**
   * インデックスを作成
   */
  async createIndexes(): Promise<void> {
    const db = await getDB();

    const configCollection = db.collection(COLLECTION_CONFIG);
    await configCollection.createIndex({ isEnabled: 1 });
    await configCollection.createIndex({ nextRunAt: 1 });
    await configCollection.createIndex({ createdAt: -1 });

    const runsCollection = db.collection(COLLECTION_RUNS);
    await runsCollection.createIndex({ configId: 1 });
    await runsCollection.createIndex({ startedAt: -1 });
    await runsCollection.createIndex({ status: 1 });

    logger.info('Scheduled import indexes created');
  }
}

// シングルトンインスタンス
export const scheduledImportService = new ScheduledImportService();
