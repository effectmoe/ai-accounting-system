import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface DependencyUsage {
  name: string;
  usedIn: Set<string>;
  isDev: boolean;
  version: string;
}

interface AnalysisResult {
  totalDependencies: number;
  usedDependencies: Map<string, DependencyUsage>;
  unusedDependencies: string[];
  duplicatePackages: Map<string, string[]>;
  largePackages: Array<{ name: string; size: number }>;
}

class DependencyAnalyzer {
  private packageJson: any;
  private dependencies: Map<string, DependencyUsage> = new Map();
  private importPattern = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  private requirePattern = /require\s*\(['"]([^'"]+)['"]\)/g;
  private dynamicImportPattern = /import\s*\(['"]([^'"]+)['"]\)/g;

  async analyze(projectRoot: string): Promise<AnalysisResult> {
    // package.jsonを読み込む
    const packageJsonPath = path.join(projectRoot, 'package.json');
    this.packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // 依存関係を初期化
    this.initializeDependencies();

    // ソースコードファイルを検索
    const sourceFiles = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: projectRoot,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        'scripts/**',
      ]
    });

    // 各ファイルで使用されている依存関係を検出
    for (const file of sourceFiles) {
      await this.analyzeFile(path.join(projectRoot, file), file);
    }

    // 結果を生成
    return this.generateResult();
  }

  private initializeDependencies() {
    // 通常の依存関係
    if (this.packageJson.dependencies) {
      for (const [name, version] of Object.entries(this.packageJson.dependencies)) {
        this.dependencies.set(name, {
          name,
          usedIn: new Set(),
          isDev: false,
          version: version as string
        });
      }
    }

    // 開発依存関係
    if (this.packageJson.devDependencies) {
      for (const [name, version] of Object.entries(this.packageJson.devDependencies)) {
        this.dependencies.set(name, {
          name,
          usedIn: new Set(),
          isDev: true,
          version: version as string
        });
      }
    }
  }

  private async analyzeFile(filePath: string, relativePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // importステートメントを検出
      const imports = [
        ...content.matchAll(this.importPattern),
        ...content.matchAll(this.requirePattern),
        ...content.matchAll(this.dynamicImportPattern)
      ];

      for (const match of imports) {
        const importPath = match[1];
        const packageName = this.extractPackageName(importPath);
        
        if (packageName && this.dependencies.has(packageName)) {
          const dep = this.dependencies.get(packageName)!;
          dep.usedIn.add(relativePath);
        }
      }
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
    }
  }

  private extractPackageName(importPath: string): string | null {
    // 相対パスやエイリアスは無視
    if (importPath.startsWith('.') || importPath.startsWith('@/')) {
      return null;
    }

    // スコープ付きパッケージの処理
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    }

    // 通常のパッケージ
    return importPath.split('/')[0];
  }

  private async getPackageSize(packageName: string): Promise<number> {
    try {
      const packagePath = path.join('node_modules', packageName);
      const stats = await fs.stat(packagePath);
      
      if (stats.isDirectory()) {
        return await this.getDirectorySize(packagePath);
      }
      
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch {
      // エラーは無視
    }
    
    return size;
  }

  private findDuplicatePackages(): Map<string, string[]> {
    const duplicates = new Map<string, string[]>();
    const packageGroups = new Map<string, string[]>();

    // 類似パッケージをグループ化
    for (const [name] of this.dependencies) {
      // パッケージ名からベース名を抽出
      const baseName = name.replace(/@types\//, '').replace(/-js$/, '').replace(/\.js$/, '');
      
      if (!packageGroups.has(baseName)) {
        packageGroups.set(baseName, []);
      }
      packageGroups.get(baseName)!.push(name);
    }

    // 重複を検出
    for (const [baseName, packages] of packageGroups) {
      if (packages.length > 1) {
        duplicates.set(baseName, packages);
      }
    }

    return duplicates;
  }

  private async generateResult(): Promise<AnalysisResult> {
    const unusedDependencies: string[] = [];
    const usedDependencies = new Map<string, DependencyUsage>();
    const largePackages: Array<{ name: string; size: number }> = [];

    // 使用/未使用の分類
    for (const [name, dep] of this.dependencies) {
      if (dep.usedIn.size === 0) {
        // 特別なケース（よく使われるが直接importされないパッケージ）
        const specialPackages = [
          'typescript',
          'eslint',
          '@types/',
          'tailwindcss',
          'postcss',
          'autoprefixer',
          'next',
          '@sentry/nextjs',
          'sharp',
          'tsx'
        ];
        
        const isSpecial = specialPackages.some(sp => name.includes(sp));
        
        if (!isSpecial) {
          unusedDependencies.push(name);
        }
      } else {
        usedDependencies.set(name, dep);
      }
    }

    // 大きなパッケージを検出
    for (const [name] of this.dependencies) {
      const size = await this.getPackageSize(name);
      if (size > 5 * 1024 * 1024) { // 5MB以上
        largePackages.push({ name, size });
      }
    }

    // サイズでソート
    largePackages.sort((a, b) => b.size - a.size);

    return {
      totalDependencies: this.dependencies.size,
      usedDependencies,
      unusedDependencies,
      duplicatePackages: this.findDuplicatePackages(),
      largePackages: largePackages.slice(0, 10) // Top 10
    };
  }

  generateReport(result: AnalysisResult): string {
    const report = [
      '# 依存関係分析レポート',
      '',
      `総依存関係数: ${result.totalDependencies}`,
      `使用中: ${result.usedDependencies.size}`,
      `未使用: ${result.unusedDependencies.length}`,
      '',
      '## 未使用の依存関係',
      ''
    ];

    if (result.unusedDependencies.length > 0) {
      for (const dep of result.unusedDependencies) {
        const depInfo = this.dependencies.get(dep)!;
        report.push(`- ${dep} (${depInfo.version}) ${depInfo.isDev ? '[dev]' : ''}`);
      }
    } else {
      report.push('未使用の依存関係はありません。');
    }

    report.push('', '## 重複の可能性がある依存関係', '');
    
    if (result.duplicatePackages.size > 0) {
      for (const [baseName, packages] of result.duplicatePackages) {
        report.push(`- ${baseName}: ${packages.join(', ')}`);
      }
    } else {
      report.push('重複の可能性がある依存関係はありません。');
    }

    report.push('', '## 大きなパッケージ (Top 10)', '');
    
    for (const pkg of result.largePackages) {
      const sizeMB = (pkg.size / (1024 * 1024)).toFixed(2);
      report.push(`- ${pkg.name}: ${sizeMB} MB`);
    }

    report.push('', '## 削除推奨コマンド', '');
    
    if (result.unusedDependencies.length > 0) {
      const removeCmd = `npm uninstall ${result.unusedDependencies.join(' ')}`;
      report.push('```bash');
      report.push(removeCmd);
      report.push('```');
    }

    return report.join('\n');
  }
}

// メイン実行
async function main() {
  const analyzer = new DependencyAnalyzer();
  const projectRoot = path.resolve(__dirname, '..');
  
  console.log('依存関係を分析中...');
  const result = await analyzer.analyze(projectRoot);
  
  const report = analyzer.generateReport(result);
  const reportPath = path.join(projectRoot, 'dependency-analysis-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  
  console.log('\n' + report);
  console.log(`\nレポートを保存しました: ${reportPath}`);
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

export { DependencyAnalyzer };