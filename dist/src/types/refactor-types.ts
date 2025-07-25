import { z } from 'zod';

// リファクタリングタイプの定義
export const RefactorTypeEnum = z.enum(['basic', 'advanced', 'performance', 'maintainability']);
export type RefactorType = z.infer<typeof RefactorTypeEnum>;

// リファクタリング入力スキーマ
export const RefactorInputSchema = z.object({
  filePath: z.string(),
  refactorType: RefactorTypeEnum,
  preserveComments: z.boolean(),
  createBackup: z.boolean(),
  maxComplexity: z.number().optional(),
  minFunctionLength: z.number().optional(),
  maxFunctionLength: z.number().optional(),
  code: z.string().optional(), // テスト用：コードを直接渡せるように
});

export type RefactorInput = z.infer<typeof RefactorInputSchema>;

// 変更情報
export interface RefactorChange {
  type: string;
  line: number;
  description: string;
}

// メトリクス情報
export interface RefactorMetrics {
  complexityBefore: number;
  complexityAfter: number;
  linesOfCodeBefore: number;
  linesOfCodeAfter: number;
}

// リファクタリング結果
export interface RefactorResult {
  success: boolean;
  originalFile: string;
  refactoredFile: string;
  changes: RefactorChange[];
  metrics: RefactorMetrics;
  backupPath?: string;
  error?: string;
}

// AST関連の型定義
export interface DuplicateBlock {
  start: number;
  end: number;
  hash: string;
  occurrences: number;
}

export interface NameSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface FunctionInfo {
  name: string;
  start: number;
  end: number;
  complexity: number;
  linesOfCode: number;
}

// DeepSeek API用のプロンプト設定
export interface RefactorPromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
}

// リファクタリング設定
export const REFACTOR_CONFIG = {
  basic: {
    description: '基本的なリファクタリング（関数分割、変数名改善、重複除去）',
    prompts: {
      systemPrompt: `あなたは経験豊富なTypeScript/JavaScriptエンジニアです。以下の観点でコードをリファクタリングしてください：
1. 長すぎる関数を適切に分割
2. 意味のある変数名・関数名への改善
3. 重複コードの除去
4. 読みやすさの向上`,
      temperature: 0.2,
      maxTokens: 4000,
    },
  },
  advanced: {
    description: '高度なリファクタリング（デザインパターン適用）',
    prompts: {
      systemPrompt: `あなたは経験豊富なソフトウェアアーキテクトです。以下の観点でコードをリファクタリングしてください：
1. 適切なデザインパターンの適用
2. SOLID原則の実装
3. 依存性注入の活用
4. 抽象化レベルの改善`,
      temperature: 0.3,
      maxTokens: 4000,
    },
  },
  performance: {
    description: 'パフォーマンス最適化',
    prompts: {
      systemPrompt: `あなたはパフォーマンス最適化の専門家です。以下の観点でコードを最適化してください：
1. 不要な再計算の削除
2. メモ化の適用
3. 効率的なアルゴリズムへの変更
4. 非同期処理の最適化`,
      temperature: 0.2,
      maxTokens: 4000,
    },
  },
  maintainability: {
    description: '保守性向上（可読性改善）',
    prompts: {
      systemPrompt: `あなたは保守性の高いコードを書く専門家です。以下の観点でコードを改善してください：
1. コメントとドキュメントの追加
2. エラーハンドリングの改善
3. テスタビリティの向上
4. モジュール化の促進`,
      temperature: 0.2,
      maxTokens: 4000,
    },
  },
};