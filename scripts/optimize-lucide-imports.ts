import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as parser from '@typescript-eslint/parser';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { logger } from '../lib/logger';

interface OptimizationResult {
  file: string;
  modified: boolean;
  iconsUsed: string[];
  error?: string;
}

class LucideImportOptimizer {
  private results: OptimizationResult[] = [];
  private totalIconsUsed = new Set<string>();

  async optimizeFile(filePath: string): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      file: filePath,
      modified: false,
      iconsUsed: [],
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // lucide-reactのインポートを検出
      const lucideImportPattern = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g;
      const match = lucideImportPattern.exec(content);
      
      if (!match) {
        return result; // lucide-reactのインポートがない
      }

      // インポートされているアイコンを抽出
      const importedIcons = match[1]
        .split(',')
        .map(icon => icon.trim())
        .filter(icon => icon.length > 0);

      result.iconsUsed = importedIcons;
      importedIcons.forEach(icon => this.totalIconsUsed.add(icon));

      // ワイルドカードインポートを検出
      const wildcardPattern = /import\s*\*\s*as\s+\w+\s+from\s*['"]lucide-react['"]/;
      if (wildcardPattern.test(content)) {
        // ワイルドカードインポートを個別インポートに変換
        const modifiedContent = await this.convertWildcardImports(content, filePath);
        if (modifiedContent !== content) {
          await fs.writeFile(filePath, modifiedContent, 'utf-8');
          result.modified = true;
        }
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  private async convertWildcardImports(content: string, filePath: string): Promise<string> {
    try {
      // TypeScriptパーサーでAST解析
      const ast = parser.parse(content, {
        sourceType: 'module',
        ecmaVersion: 2020,
        ecmaFeatures: {
          jsx: true
        }
      });

      // 使用されているアイコンを検出
      const usedIcons = new Set<string>();
      const wildcardImportName = this.getWildcardImportName(content);
      
      if (!wildcardImportName) {
        return content;
      }

      // アイコン使用パターンを検出（例: Icons.Search, LucideIcons.ChevronDown）
      const iconUsagePattern = new RegExp(`${wildcardImportName}\\.(\\w+)`, 'g');
      let match;
      
      while ((match = iconUsagePattern.exec(content)) !== null) {
        usedIcons.add(match[1]);
      }

      if (usedIcons.size === 0) {
        return content;
      }

      // ワイルドカードインポートを個別インポートに置き換え
      const iconsList = Array.from(usedIcons).sort().join(', ');
      const newImport = `import { ${iconsList} } from 'lucide-react'`;
      
      let modifiedContent = content.replace(
        /import\s*\*\s*as\s+\w+\s+from\s*['"]lucide-react['"]/,
        newImport
      );

      // アイコンの使用箇所を更新（例: Icons.Search → Search）
      usedIcons.forEach(icon => {
        const pattern = new RegExp(`${wildcardImportName}\\.${icon}`, 'g');
        modifiedContent = modifiedContent.replace(pattern, icon);
      });

      return modifiedContent;

    } catch (error) {
      logger.warn(`Failed to parse file ${filePath}:`, error);
      return content;
    }
  }

  private getWildcardImportName(content: string): string | null {
    const match = content.match(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]lucide-react['"]/);
    return match ? match[1] : null;
  }

  async processDirectory(directory: string, pattern: string = '**/*.{ts,tsx,js,jsx}'): Promise<void> {
    logger.info(`Processing files in ${directory}...`);
    
    const files = await glob(pattern, {
      cwd: directory,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
      ]
    });

    logger.info(`Found ${files.length} files to analyze`);

    for (const file of files) {
      const result = await this.optimizeFile(file);
      this.results.push(result);

      if (result.iconsUsed.length > 0) {
        logger.info(`✓ ${path.relative(directory, file)}: Uses ${result.iconsUsed.length} icons`);
      }
      
      if (result.modified) {
        logger.info(`  ✨ Optimized imports`);
      }
      
      if (result.error) {
        logger.error(`✗ ${path.relative(directory, file)}: ${result.error}`);
      }
    }
  }

  generateReport(): string {
    const report = [
      '# Lucide React インポート最適化レポート',
      '',
      `総ファイル数: ${this.results.length}`,
      `lucide-reactを使用しているファイル: ${this.results.filter(r => r.iconsUsed.length > 0).length}`,
      `最適化されたファイル: ${this.results.filter(r => r.modified).length}`,
      `使用されているアイコン総数: ${this.totalIconsUsed.size}`,
      '',
      '## 使用頻度の高いアイコン (Top 20)',
      '',
    ];

    // アイコン使用頻度を計算
    const iconFrequency = new Map<string, number>();
    this.results.forEach(result => {
      result.iconsUsed.forEach(icon => {
        iconFrequency.set(icon, (iconFrequency.get(icon) || 0) + 1);
      });
    });

    const sortedIcons = Array.from(iconFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    sortedIcons.forEach(([icon, count], index) => {
      report.push(`${index + 1}. ${icon}: ${count}回使用`);
    });

    report.push('', '## 最適化されたファイル', '');
    
    const optimizedFiles = this.results.filter(r => r.modified);
    if (optimizedFiles.length > 0) {
      optimizedFiles.forEach(result => {
        report.push(`- ${result.file}`);
      });
    } else {
      report.push('最適化が必要なファイルはありませんでした。');
    }

    if (this.results.some(r => r.error)) {
      report.push('', '## エラー', '');
      this.results.filter(r => r.error).forEach(result => {
        report.push(`- ${result.file}: ${result.error}`);
      });
    }

    report.push('', '## 推奨事項', '');
    report.push('1. すべてのlucide-reactインポートが個別インポートになっていることを確認');
    report.push('2. 使用頻度の低いアイコンは、必要に応じて動的インポートを検討');
    report.push('3. アイコンコンポーネントのメモ化を検討して再レンダリングを削減');

    return report.join('\n');
  }
}

// メイン実行
async function main() {
  const optimizer = new LucideImportOptimizer();
  const projectRoot = path.resolve(__dirname, '..');
  
  await optimizer.processDirectory(projectRoot);

  const report = optimizer.generateReport();
  const reportPath = path.join(projectRoot, 'lucide-optimization-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  
  logger.info('\n' + report);
  logger.info(`\nレポートを保存しました: ${reportPath}`);
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

export { LucideImportOptimizer };