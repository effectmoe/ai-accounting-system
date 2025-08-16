import { ObjectId } from 'mongodb';

/**
 * おすすめオプション（提案商品・サービス）の型定義
 */
export interface SuggestedOption {
  _id?: ObjectId;
  title: string;          // オプションのタイトル
  description: string;    // 説明文
  price: string;          // 価格表示（フォーマット済み文字列）
  features: string[];     // 特徴・機能リスト
  ctaText?: string;       // CTAボタンのテキスト（オプショナル）
  ctaUrl?: string;        // CTAリンクURL（オプショナル）
  
  // 表示制御
  isActive: boolean;      // 有効/無効フラグ
  displayOrder: number;   // 表示順序（小さい値ほど先頭）
  
  // 条件設定
  minAmount?: number;     // 最小見積金額（この金額以上で表示）
  maxAmount?: number;     // 最大見積金額（この金額以下で表示）
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;     // 作成者（管理者ID）
  updatedBy?: string;     // 更新者（管理者ID）
}

/**
 * おすすめオプション作成用の型
 */
export interface CreateSuggestedOptionRequest {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText?: string;
  ctaUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * おすすめオプション更新用の型
 */
export interface UpdateSuggestedOptionRequest {
  title?: string;
  description?: string;
  price?: string;
  features?: string[];
  ctaText?: string;
  ctaUrl?: string;
  isActive?: boolean;
  displayOrder?: number;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * おすすめオプション一覧取得レスポンス
 */
export interface SuggestedOptionsListResponse {
  suggestedOptions: SuggestedOption[];
  total: number;
}

/**
 * おすすめオプション並び替え用の型
 */
export interface ReorderSuggestedOptionsRequest {
  items: {
    id: string;
    displayOrder: number;
  }[];
}

/**
 * 見積書に対するおすすめオプション生成用のフィルター条件
 */
export interface SuggestedOptionFilter {
  amount: number;        // 見積金額
  isActive?: boolean;    // アクティブなオプションのみ
  limit?: number;        // 取得件数制限
}