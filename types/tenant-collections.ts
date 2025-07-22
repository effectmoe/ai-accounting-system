// テナント対応のコレクション型定義
import { BaseDocument, TimestampedDocument } from './database';
import { TenantConfig } from './tenant';

// テナント対応の基本ドキュメント型
export interface TenantDocument extends BaseDocument {
  tenantId: string;
  tenantType: 'enterprise' | 'individual_contractor';
}

// テナント対応のタイムスタンプ付きドキュメント型
export interface TenantTimestampedDocument extends TenantDocument, TimestampedDocument {}

// プロジェクト管理（建設業向け）
export interface Project extends TenantTimestampedDocument {
  projectCode: string;
  name: string;
  description?: string;
  client: {
    name: string;
    contact?: string;
    address?: string;
  };
  contract: {
    amount: number;
    startDate: Date;
    endDate?: Date;
    retentionRate?: number; // 保留金率
  };
  costs: {
    materials: number;
    labor: number;
    subcontract: number;
    other: number;
  };
  status: 'estimate' | 'active' | 'review' | 'completed' | 'cancelled';
  progressPercentage: number;
  profitMargin?: number;
  notes?: string;
  attachments?: string[];
}

// 取引履歴の拡張（プロジェクトコード追加）
export interface TransactionWithProject {
  id: string;
  date: string;
  description: string;
  vendor?: string;
  amount: number;
  taxAmount?: number;
  type: 'income' | 'expense';
  category: string;
  projectCode?: string; // プロジェクト紐付け
  aiConfidence?: number; // AI判定の信頼度
  status?: 'pending' | 'processing' | 'approved' | 'completed';
}

// 月次統計（1人親方向け）
export interface MonthlyStats {
  cashBalance: number;
  cashBalanceChange: number; // 前月比（%）
  monthlyRevenue: number;
  monthlyTarget: number;
  receivables: number;
  receivablesWithin30Days: number;
  projectsActive: number;
  projectsCompleted: number;
  profitMargin: number;
}

// 現場入力データ
export interface QuickEntry extends TenantTimestampedDocument {
  amount: number;
  category: 'materials' | 'subcontract' | 'transport' | 'other';
  projectId?: string;
  description: string;
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  ocrResult?: any; // OCR結果
  processed: boolean;
}

// テナント設定
export interface TenantSettings extends TenantConfig {
  _id?: string;
  // 建設業特有の設定
  constructionSettings?: {
    defaultRetentionRate: number; // デフォルト保留金率
    safetyCooperationFeeRate: number; // 安全協力費率
    defaultPaymentTerms: number; // デフォルト支払条件（日数）
  };
  // 青色申告設定
  blueTaxSettings?: {
    enabled: boolean;
    accountingMethod: 'cash' | 'accrual'; // 現金主義/発生主義
    taxReturn65Credit: boolean; // 65万円控除対応
  };
}