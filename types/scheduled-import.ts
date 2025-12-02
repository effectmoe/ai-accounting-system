/**
 * 定期インポート設定の型定義
 */

import { ObjectId } from 'mongodb';

/**
 * 定期インポート設定
 */
export interface ScheduledImportConfig {
  _id?: ObjectId;
  name: string;
  isEnabled: boolean;

  // 銀行情報
  bankType: string;
  bankName: string;
  accountNumber?: string;
  accountAlias?: string;

  // スケジュール設定
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:mm形式
    dayOfWeek?: number; // 0-6 (日曜=0)
    dayOfMonth?: number; // 1-31
    timezone: string;
  };

  // インポート設定
  importOptions: {
    autoMatch: boolean;
    autoConfirm: boolean;
    onlyHighConfidence: boolean;
    skipDuplicates: boolean;
  };

  // 通知設定
  notifications: {
    onSuccess: boolean;
    onError: boolean;
    emailAddresses: string[];
  };

  // 実行履歴
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'failed' | 'partial';
  lastRunError?: string;
  nextRunAt?: Date;

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * 定期インポート実行履歴
 */
export interface ScheduledImportRun {
  _id?: ObjectId;
  configId: ObjectId;
  configName: string;

  // 実行情報
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed' | 'partial';
  error?: string;

  // 結果
  result?: {
    totalCount: number;
    depositCount: number;
    withdrawalCount: number;
    duplicateCount: number;
    newCount: number;
    matchedCount: number;
  };

  // メタデータ
  createdAt: Date;
}
