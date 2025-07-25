"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFACTOR_CONFIG = exports.RefactorInputSchema = exports.RefactorTypeEnum = void 0;
const zod_1 = require("zod");
exports.RefactorTypeEnum = zod_1.z.enum(['basic', 'advanced', 'performance', 'maintainability']);
exports.RefactorInputSchema = zod_1.z.object({
    filePath: zod_1.z.string(),
    refactorType: exports.RefactorTypeEnum,
    preserveComments: zod_1.z.boolean(),
    createBackup: zod_1.z.boolean(),
    maxComplexity: zod_1.z.number().optional(),
    minFunctionLength: zod_1.z.number().optional(),
    maxFunctionLength: zod_1.z.number().optional(),
    code: zod_1.z.string().optional(),
});
exports.REFACTOR_CONFIG = {
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
//# sourceMappingURL=refactor-types.js.map