import * as recast from 'recast';
import * as prettier from 'prettier';
import * as crypto from 'crypto';
import { DuplicateBlock, NameSuggestion, FunctionInfo } from '../types/refactor-types';
import * as fs from 'fs/promises';
import * as path from 'path';

import { logger } from '@/lib/logger';
export const refactoringUtils = {
  /**
   * コードの複雑度を計算
   */
  calculateComplexity(code: string): number {
    try {
      let complexity = 1; // Base complexity
      
      // 簡易的な複雑度計算（正規表現ベース）
      // if文
      const ifMatches = code.match(/\bif\s*\(/g);
      if (ifMatches) complexity += ifMatches.length;
      
      // for文
      const forMatches = code.match(/\bfor\s*\(/g);
      if (forMatches) complexity += forMatches.length;
      
      // while文
      const whileMatches = code.match(/\bwhile\s*\(/g);
      if (whileMatches) complexity += whileMatches.length;
      
      // switch文
      const switchMatches = code.match(/\bswitch\s*\(/g);
      if (switchMatches) complexity += switchMatches.length;
      
      // 三項演算子
      const ternaryMatches = code.match(/\?.*:/g);
      if (ternaryMatches) complexity += ternaryMatches.length;
      
      // 論理演算子
      const logicalMatches = code.match(/(\|\||&&)/g);
      if (logicalMatches) complexity += logicalMatches.length;
      
      // try-catch
      const catchMatches = code.match(/\bcatch\s*\(/g);
      if (catchMatches) complexity += catchMatches.length;
      
      return complexity;
    } catch (error) {
      logger.error('Error calculating complexity:', error);
      return 1;
    }
  },

  /**
   * ASTから関数を抽出
   */
  extractFunctions(ast: any): FunctionInfo[] {
    // 簡易実装: 空配列を返す
    return [];
  },

  /**
   * 重複コードを検出
   */
  findDuplicateCode(ast: any): DuplicateBlock[] {
    // 簡易実装: 空配列を返す
    return [];
  },

  /**
   * 変数名の改善提案
   */
  suggestVariableNames(ast: any): NameSuggestion[] {
    // 簡易実装: 空配列を返す
    return [];
  },

  /**
   * コードをフォーマット
   */
  async formatCode(code: string): Promise<string> {
    try {
      const formatted = await prettier.format(code, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
      });
      return formatted;
    } catch (error) {
      logger.error('Error formatting code:', error);
      return code;
    }
  },


  /**
   * コードの行数を計算
   */
  countLinesOfCode(code: string): number {
    const lines = code.split('\n');
    let count = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // 空行とコメント行を除外
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        count++;
      }
    }
    
    return count;
  },

  /**
   * ASTを使用してコードを解析
   */
  parseCode(code: string): any {
    // 簡易実装: 空のオブジェクトを返す
    return {};
  },

  /**
   * ASTからコードを生成
   */
  generateCode(ast: any): string {
    return recast.print(ast).code;
  },

  /**
   * コードのフォーマット
   */
  async formatCode(code: string): Promise<string> {
    try {
      return await prettier.format(code, {
        parser: 'typescript',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
      });
    } catch (error) {
      // フォーマットに失敗した場合は元のコードを返す
      return code;
    }
  },

  /**
   * バックアップ作成
   */
  async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  },
};

// ヘルパー関数
function suggestBetterName(node: any, type: string): string {
  // 初期化式から名前を推測
  if (node.init) {
    if (node.init.type === 'ArrayExpression') {
      return 'items';
    }
    if (node.init.type === 'ObjectExpression') {
      return 'config';
    }
    if (node.init.type === 'CallExpression') {
      const callee = node.init.callee;
      if (callee.type === 'Identifier') {
        return callee.name.toLowerCase() + 'Result';
      }
    }
  }
  
  return type + 'Value';
}

function suggestNameFromInit(currentName: string, init: any): NameSuggestion | null {
  if (init.type === 'NewExpression' && init.callee.type === 'Identifier') {
    const className = init.callee.name;
    const suggested = className.charAt(0).toLowerCase() + className.slice(1);
    if (currentName !== suggested && currentName.length <= 3) {
      return {
        original: currentName,
        suggested,
        reason: `変数名は型やクラス名を反映すべきです`,
      };
    }
  }
  
  if (init.type === 'Literal' && typeof init.value === 'string') {
    if (currentName === 'str' || currentName === 's') {
      return {
        original: currentName,
        suggested: 'message',
        reason: '文字列の用途を明確にする名前を使用してください',
      };
    }
  }
  
  return null;
}