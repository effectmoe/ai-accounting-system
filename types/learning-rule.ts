import { ObjectId } from 'mongodb';
import type { AccountCategory } from './receipt';

// マッチ対象のフィールド
export type MatchField =
  | 'issuerName'    // 発行元
  | 'itemName'      // 項目名（items[0].itemName または items[0].description）
  | 'subject'       // 但し書き
  | 'title'         // タイトル
  | 'ocrText';      // OCRで抽出したテキスト全体

// マッチ演算子
export type MatchOperator =
  | 'contains'      // 含む
  | 'equals'        // 完全一致
  | 'startsWith'    // 前方一致
  | 'endsWith'      // 後方一致
  | 'regex';        // 正規表現

// マッチ条件
export interface MatchCondition {
  field: MatchField;
  operator: MatchOperator;
  value: string;
  caseSensitive?: boolean; // 大文字小文字を区別するか（デフォルト: false）
}

// 出力設定
export interface RuleOutput {
  subject?: string;           // 但し書き
  accountCategory?: AccountCategory;  // 勘定科目
  title?: string;             // タイトル
}

// 学習ルール
export interface LearningRule {
  _id?: ObjectId | string;

  // 基本情報
  name: string;               // ルール名（ユーザーが識別するため）
  description?: string;       // 説明

  // マッチ条件
  conditions: MatchCondition[];
  matchMode: 'all' | 'any';   // すべて一致 or いずれか一致

  // 出力設定
  outputs: RuleOutput;

  // 優先度と状態
  priority: number;           // 優先度（数値が大きいほど優先）
  enabled: boolean;           // 有効/無効

  // 統計
  matchCount?: number;        // マッチした回数
  lastMatchedAt?: Date;       // 最後にマッチした日時

  // タイムスタンプ
  createdAt?: Date;
  updatedAt?: Date;
}

// 学習ルール作成パラメータ
export interface CreateLearningRuleParams {
  name: string;
  description?: string;
  conditions: MatchCondition[];
  matchMode: 'all' | 'any';
  outputs: RuleOutput;
  priority?: number;
  enabled?: boolean;
}

// 学習ルール更新パラメータ
export interface UpdateLearningRuleParams {
  name?: string;
  description?: string;
  conditions?: MatchCondition[];
  matchMode?: 'all' | 'any';
  outputs?: RuleOutput;
  priority?: number;
  enabled?: boolean;
}

// 学習ルール検索パラメータ
export interface LearningRuleSearchParams {
  enabled?: boolean;
  search?: string;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ルールマッチング結果
export interface RuleMatchResult {
  matched: boolean;
  rule?: LearningRule;
  outputs?: RuleOutput;
  confidence: number;  // マッチの確信度（1.0 = 完全マッチ）
}

// フィールドの表示名
export const MATCH_FIELD_LABELS: Record<MatchField, string> = {
  issuerName: '発行元',
  itemName: '項目名',
  subject: '但し書き',
  title: 'タイトル',
  ocrText: 'OCRテキスト全体',
};

// 演算子の表示名
export const MATCH_OPERATOR_LABELS: Record<MatchOperator, string> = {
  contains: '含む',
  equals: '完全一致',
  startsWith: '前方一致',
  endsWith: '後方一致',
  regex: '正規表現',
};
