"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refactorAgent = void 0;
const fs = __importStar(require("fs/promises"));
const logger_1 = require("@/lib/logger");
const refactor_types_1 = require("../types/refactor-types");
const refactoring_utils_1 = require("../lib/refactoring-utils");
const llm_cascade_manager_1 = require("../../lib/llm-cascade-manager");
exports.refactorAgent = {
    id: 'refactor-agent',
    name: 'RefactorAgent',
    description: 'TypeScript/JavaScript コードの自動リファクタリング',
    execute: async (input) => {
        const tools = {
            readFile: {
                description: 'ファイルを読み込む',
                execute: async ({ filePath }) => {
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        return { success: true, content };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `ファイル読み込みエラー: ${error.message}`
                        };
                    }
                },
            },
            writeFile: {
                description: 'ファイルに書き込む',
                execute: async ({ filePath, content }) => {
                    try {
                        await fs.writeFile(filePath, content, 'utf-8');
                        return { success: true };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `ファイル書き込みエラー: ${error.message}`
                        };
                    }
                },
            },
            analyzeCode: {
                description: 'コードを解析してメトリクスを取得',
                execute: async ({ code }) => {
                    try {
                        const ast = refactoring_utils_1.refactoringUtils.parseCode(code);
                        const complexity = refactoring_utils_1.refactoringUtils.calculateComplexity(code);
                        const functions = refactoring_utils_1.refactoringUtils.extractFunctions(ast);
                        const duplicates = refactoring_utils_1.refactoringUtils.findDuplicateCode(ast);
                        const suggestions = refactoring_utils_1.refactoringUtils.suggestVariableNames(ast);
                        const linesOfCode = refactoring_utils_1.refactoringUtils.countLinesOfCode(code);
                        return {
                            success: true,
                            metrics: {
                                complexity,
                                linesOfCode,
                                functionCount: functions.length,
                                duplicateBlockCount: duplicates.length,
                                namingSuggestionCount: suggestions.length,
                            },
                            functions,
                            duplicates,
                            suggestions,
                        };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `コード解析エラー: ${error.message}`,
                        };
                    }
                },
            },
            generateRefactoringSuggestions: {
                description: 'AIを使用してリファクタリング提案を生成',
                execute: async ({ code, refactorType, analysis }) => {
                    try {
                        const llmManager = llm_cascade_manager_1.LLMCascadeManager.getInstance();
                        const config = refactor_types_1.REFACTOR_CONFIG[refactorType];
                        if (!config) {
                            throw new Error(`不明なリファクタリングタイプ: ${refactorType}`);
                        }
                        const prompt = `
以下のTypeScript/JavaScriptコードをリファクタリングしてください。

現在の分析結果:
- 複雑度: ${analysis.metrics.complexity}
- 行数: ${analysis.metrics.linesOfCode}
- 関数数: ${analysis.metrics.functionCount}
- 重複ブロック数: ${analysis.metrics.duplicateBlockCount}
- 命名改善提案数: ${analysis.metrics.namingSuggestionCount}

コード:
\`\`\`typescript
${code}
\`\`\`

リファクタリング後のコードのみを出力してください。コードブロックで囲んでください。
`;
                        const result = await llmManager.executeCascade({
                            instruction: config.prompts.systemPrompt,
                            prompt: prompt,
                            preferredProvider: 'deepseek',
                            maxTokens: config.prompts.maxTokens,
                            temperature: config.prompts.temperature,
                        });
                        const codeMatch = result.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
                        const refactoredCode = codeMatch ? codeMatch[1] : result;
                        return {
                            success: true,
                            refactoredCode: refactoredCode.trim(),
                            explanation: result,
                        };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `AI提案生成エラー: ${error.message}`,
                        };
                    }
                },
            },
            generateChanges: {
                description: '変更内容を解析',
                execute: async ({ originalCode, refactoredCode }) => {
                    try {
                        const changes = [];
                        const originalLines = originalCode.split('\n');
                        const refactoredLines = refactoredCode.split('\n');
                        const maxLines = Math.max(originalLines.length, refactoredLines.length);
                        for (let i = 0; i < maxLines; i++) {
                            if (originalLines[i] !== refactoredLines[i]) {
                                changes.push({
                                    type: i >= originalLines.length ? 'added' : i >= refactoredLines.length ? 'removed' : 'modified',
                                    line: i + 1,
                                    description: `行 ${i + 1}: ${originalLines[i] || '(なし)'} → ${refactoredLines[i] || '(削除)'}`,
                                });
                            }
                        }
                        return {
                            success: true,
                            changes,
                        };
                    }
                    catch (error) {
                        return {
                            success: false,
                            error: `変更解析エラー: ${error.message}`,
                        };
                    }
                },
            },
        };
        const result = {
            success: false,
            originalFile: '',
            refactoredFile: '',
            changes: [],
            metrics: {
                complexityBefore: 0,
                complexityAfter: 0,
                linesOfCodeBefore: 0,
                linesOfCodeAfter: 0,
            },
        };
        try {
            logger_1.logger.debug('[RefactorAgent] ファイルを読み込んでいます...');
            if (input.code) {
                result.originalFile = input.code;
            }
            else {
                const readResult = await tools.readFile.execute({ filePath: input.filePath });
                if (!readResult.success) {
                    throw new Error(readResult.error);
                }
                result.originalFile = readResult.content;
            }
            if (input.createBackup && !input.code) {
                logger_1.logger.debug('[RefactorAgent] バックアップを作成しています...');
                try {
                    const backupPath = await refactoring_utils_1.refactoringUtils.createBackup(input.filePath);
                    result.backupPath = backupPath;
                }
                catch (error) {
                    logger_1.logger.error('バックアップ作成エラー:', error);
                }
            }
            logger_1.logger.debug('[RefactorAgent] コードを解析しています...');
            const analysisResult = await tools.analyzeCode.execute({ code: result.originalFile });
            if (!analysisResult.success) {
                throw new Error(analysisResult.error);
            }
            result.metrics.complexityBefore = analysisResult.metrics.complexity;
            result.metrics.linesOfCodeBefore = analysisResult.metrics.linesOfCode;
            logger_1.logger.debug('[RefactorAgent] AIがリファクタリング提案を生成しています...');
            const suggestionResult = await tools.generateRefactoringSuggestions.execute({
                code: result.originalFile,
                refactorType: input.refactorType,
                analysis: analysisResult,
            });
            if (!suggestionResult.success) {
                throw new Error(suggestionResult.error);
            }
            result.refactoredFile = await refactoring_utils_1.refactoringUtils.formatCode(suggestionResult.refactoredCode);
            const afterAnalysis = await tools.analyzeCode.execute({ code: result.refactoredFile });
            if (afterAnalysis.success) {
                result.metrics.complexityAfter = afterAnalysis.metrics.complexity;
                result.metrics.linesOfCodeAfter = afterAnalysis.metrics.linesOfCode;
            }
            logger_1.logger.debug('[RefactorAgent] 変更内容を解析しています...');
            const changesResult = await tools.generateChanges.execute({
                originalCode: result.originalFile,
                refactoredCode: result.refactoredFile,
            });
            if (changesResult.success) {
                result.changes = changesResult.changes;
            }
            if (!input.code && (!input.preserveComments || input.refactorType !== 'maintainability')) {
                logger_1.logger.debug('[RefactorAgent] ファイルを更新しています...');
                const writeResult = await tools.writeFile.execute({
                    filePath: input.filePath,
                    content: result.refactoredFile,
                });
                if (!writeResult.success) {
                    throw new Error(writeResult.error);
                }
            }
            result.success = true;
            logger_1.logger.debug('[RefactorAgent] リファクタリングが完了しました');
            return result;
        }
        catch (error) {
            result.error = error.message;
            logger_1.logger.error('[RefactorAgent] エラー:', error.message);
            return result;
        }
    },
};
exports.default = exports.refactorAgent;
//# sourceMappingURL=refactor-agent.js.map