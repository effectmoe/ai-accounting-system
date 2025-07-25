import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';
import { 
  RefactorInputSchema, 
  RefactorResult, 
  RefactorChange, 
  REFACTOR_CONFIG,
  RefactorInput
} from '../types/refactor-types';
import { refactoringUtils } from '../lib/refactoring-utils';
import { LLMCascadeManager } from '../../lib/llm-cascade-manager';

// RefactorAgent型定義
interface RefactorAgent {
  id: string;
  name: string;
  description: string;
  execute: (input: RefactorInput) => Promise<RefactorResult>;
}

// RefactorAgentの実装（createAgentを使わない独自実装）
export const refactorAgent: RefactorAgent = {
  id: 'refactor-agent',
  name: 'RefactorAgent',
  description: 'TypeScript/JavaScript コードの自動リファクタリング',

  execute: async (input: RefactorInput): Promise<RefactorResult> => {
    // ツール定義
    const tools = {
      // ファイル読み込みツール
      readFile: {
        description: 'ファイルを読み込む',
        execute: async ({ filePath }: { filePath: string }) => {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { success: true, content };
          } catch (error) {
            return { 
              success: false, 
              error: `ファイル読み込みエラー: ${error.message}` 
            };
          }
        },
      },

      // ファイル書き込みツール
      writeFile: {
        description: 'ファイルに書き込む',
        execute: async ({ filePath, content }: { filePath: string; content: string }) => {
          try {
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: `ファイル書き込みエラー: ${error.message}` 
            };
          }
        },
      },

      // コード解析ツール
      analyzeCode: {
        description: 'コードを解析してメトリクスを取得',
        execute: async ({ code }: { code: string }) => {
          try {
            const ast = refactoringUtils.parseCode(code);
            const complexity = refactoringUtils.calculateComplexity(code);
            const functions = refactoringUtils.extractFunctions(ast);
            const duplicates = refactoringUtils.findDuplicateCode(ast);
            const suggestions = refactoringUtils.suggestVariableNames(ast);
            const linesOfCode = refactoringUtils.countLinesOfCode(code);

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
          } catch (error) {
            return {
              success: false,
              error: `コード解析エラー: ${error.message}`,
            };
          }
        },
      },

      // AI リファクタリング提案ツール
      generateRefactoringSuggestions: {
        description: 'AIを使用してリファクタリング提案を生成',
        execute: async ({ code, refactorType, analysis }: { 
          code: string; 
          refactorType: string;
          analysis: any;
        }) => {
          try {
            const llmManager = LLMCascadeManager.getInstance();
            const config = REFACTOR_CONFIG[refactorType];
            
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

            // コードブロックを抽出
            const codeMatch = result.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
            const refactoredCode = codeMatch ? codeMatch[1] : result;

            return {
              success: true,
              refactoredCode: refactoredCode.trim(),
              explanation: result,
            };
          } catch (error) {
            return {
              success: false,
              error: `AI提案生成エラー: ${error.message}`,
            };
          }
        },
      },

      // 変更差分生成ツール
      generateChanges: {
        description: '変更内容を解析',
        execute: async ({ originalCode, refactoredCode }: { 
          originalCode: string; 
          refactoredCode: string;
        }) => {
          try {
            const changes: RefactorChange[] = [];
            const originalLines = originalCode.split('\n');
            const refactoredLines = refactoredCode.split('\n');

            // 簡易的な差分検出（実際のプロジェクトではより高度な差分アルゴリズムを使用）
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
          } catch (error) {
            return {
              success: false,
              error: `変更解析エラー: ${error.message}`,
            };
          }
        },
      },
    };

    // メイン実行ロジック
    const result: RefactorResult = {
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
      // 進捗通知
      logger.debug('[RefactorAgent] ファイルを読み込んでいます...');

      // ファイル読み込み（または直接渡されたコードを使用）
      if (input.code) {
        // コードが直接渡された場合
        result.originalFile = input.code;
      } else {
        // ファイルから読み込む場合
        const readResult = await tools.readFile.execute({ filePath: input.filePath });
        if (!readResult.success) {
          throw new Error(readResult.error);
        }
        result.originalFile = readResult.content;
      }

      // バックアップ作成
      if (input.createBackup && !input.code) {
        logger.debug('[RefactorAgent] バックアップを作成しています...');
        try {
          const backupPath = await refactoringUtils.createBackup(input.filePath);
          result.backupPath = backupPath;
        } catch (error) {
          logger.error('バックアップ作成エラー:', error);
          // バックアップ失敗は警告として扱い、処理は継続
        }
      }

      // コード解析
      logger.debug('[RefactorAgent] コードを解析しています...');
      const analysisResult = await tools.analyzeCode.execute({ code: result.originalFile });
      if (!analysisResult.success) {
        throw new Error(analysisResult.error);
      }

      result.metrics.complexityBefore = analysisResult.metrics.complexity;
      result.metrics.linesOfCodeBefore = analysisResult.metrics.linesOfCode;

      // AIリファクタリング提案生成
      logger.debug('[RefactorAgent] AIがリファクタリング提案を生成しています...');
      const suggestionResult = await tools.generateRefactoringSuggestions.execute({
        code: result.originalFile,
        refactorType: input.refactorType,
        analysis: analysisResult,
      });

      if (!suggestionResult.success) {
        throw new Error(suggestionResult.error);
      }

      // フォーマット
      result.refactoredFile = await refactoringUtils.formatCode(suggestionResult.refactoredCode);

      // リファクタリング後の解析
      const afterAnalysis = await tools.analyzeCode.execute({ code: result.refactoredFile });
      if (afterAnalysis.success) {
        result.metrics.complexityAfter = afterAnalysis.metrics.complexity;
        result.metrics.linesOfCodeAfter = afterAnalysis.metrics.linesOfCode;
      }

      // 変更内容の生成
      logger.debug('[RefactorAgent] 変更内容を解析しています...');
      const changesResult = await tools.generateChanges.execute({
        originalCode: result.originalFile,
        refactoredCode: result.refactoredFile,
      });

      if (changesResult.success) {
        result.changes = changesResult.changes;
      }

      // ファイル書き込み（オプション - コードが直接渡された場合はスキップ）
      if (!input.code && (!input.preserveComments || input.refactorType !== 'maintainability')) {
        logger.debug('[RefactorAgent] ファイルを更新しています...');
        const writeResult = await tools.writeFile.execute({
          filePath: input.filePath,
          content: result.refactoredFile,
        });

        if (!writeResult.success) {
          throw new Error(writeResult.error);
        }
      }

      result.success = true;
      logger.debug('[RefactorAgent] リファクタリングが完了しました');

      return result;

    } catch (error) {
      result.error = error.message;
      logger.error('[RefactorAgent] エラー:', error.message);
      return result;
    }
  },
};

export default refactorAgent;