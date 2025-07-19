/**
 * MongoDB Client Migration Helper
 * 
 * このファイルは既存のmongodb-client.tsから新しいmongodb-client-refactored.tsへの
 * 段階的な移行を支援します。
 */

import { logger } from './logger';

// 移行ステータスを追跡
export const migrationStats = {
  oldClientCalls: 0,
  newClientCalls: 0,
  migrationStarted: new Date(),
};

// 環境変数で移行モードを制御
export const MIGRATION_MODE = process.env.MONGODB_MIGRATION_MODE || 'gradual';
// 'old' - 古い実装のみ使用
// 'new' - 新しい実装のみ使用
// 'gradual' - 段階的移行（デフォルト）
// 'canary' - 一部のリクエストのみ新しい実装を使用

// Canaryモードでの新実装使用率（0-100）
export const CANARY_PERCENTAGE = parseInt(process.env.MONGODB_CANARY_PERCENTAGE || '10');

// 新しい実装を使用するかどうかを決定
export function shouldUseNewImplementation(): boolean {
  switch (MIGRATION_MODE) {
    case 'old':
      return false;
    case 'new':
      return true;
    case 'canary':
      // ランダムに一定割合で新しい実装を使用
      return Math.random() * 100 < CANARY_PERCENTAGE;
    case 'gradual':
    default:
      // 特定のコレクションから段階的に移行
      const migratedCollections = process.env.MONGODB_MIGRATED_COLLECTIONS?.split(',') || [
        'systemLogs', // システムログから開始（影響が小さい）
        'faqItems',
        'faqVotes',
      ];
      
      // スタックトレースから呼び出し元のコレクションを推測
      const stack = new Error().stack || '';
      const isMigratedCollection = migratedCollections.some(collection => 
        stack.toLowerCase().includes(collection.toLowerCase())
      );
      
      return isMigratedCollection;
  }
}

// 移行ログ
export function logMigrationCall(implementation: 'old' | 'new', operation: string) {
  if (implementation === 'old') {
    migrationStats.oldClientCalls++;
  } else {
    migrationStats.newClientCalls++;
  }

  // 定期的に統計情報をログ出力
  const totalCalls = migrationStats.oldClientCalls + migrationStats.newClientCalls;
  if (totalCalls % 100 === 0) {
    const newPercentage = (migrationStats.newClientCalls / totalCalls * 100).toFixed(2);
    logger.info('MongoDB Migration Stats', {
      totalCalls,
      oldClientCalls: migrationStats.oldClientCalls,
      newClientCalls: migrationStats.newClientCalls,
      newImplementationPercentage: `${newPercentage}%`,
      mode: MIGRATION_MODE,
    });
  }
}

// エラーハンドリングのラッパー
export async function withMigrationFallback<T>(
  newImplementation: () => Promise<T>,
  oldImplementation: () => Promise<T>,
  operation: string
): Promise<T> {
  if (shouldUseNewImplementation()) {
    try {
      logMigrationCall('new', operation);
      return await newImplementation();
    } catch (error) {
      logger.error('New implementation failed, falling back to old', {
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // フォールバック
      logMigrationCall('old', operation);
      return await oldImplementation();
    }
  } else {
    logMigrationCall('old', operation);
    return await oldImplementation();
  }
}