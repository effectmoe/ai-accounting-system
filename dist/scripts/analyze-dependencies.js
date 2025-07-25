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
exports.DependencyAnalyzer = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class DependencyAnalyzer {
    packageJson;
    dependencies = new Map();
    importPattern = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    requirePattern = /require\s*\(['"]([^'"]+)['"]\)/g;
    dynamicImportPattern = /import\s*\(['"]([^'"]+)['"]\)/g;
    async analyze(projectRoot) {
        // package.jsonを読み込む
        const packageJsonPath = path.join(projectRoot, 'package.json');
        this.packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        // 依存関係を初期化
        this.initializeDependencies();
        // ソースコードファイルを検索
        const sourceFiles = await (0, glob_1.glob)('**/*.{ts,tsx,js,jsx}', {
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
    initializeDependencies() {
        // 通常の依存関係
        if (this.packageJson.dependencies) {
            for (const [name, version] of Object.entries(this.packageJson.dependencies)) {
                this.dependencies.set(name, {
                    name,
                    usedIn: new Set(),
                    isDev: false,
                    version: version
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
                    version: version
                });
            }
        }
    }
    async analyzeFile(filePath, relativePath) {
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
                    const dep = this.dependencies.get(packageName);
                    dep.usedIn.add(relativePath);
                }
            }
        }
        catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error);
        }
    }
    extractPackageName(importPath) {
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
    async getPackageSize(packageName) {
        try {
            const packagePath = path.join('node_modules', packageName);
            const stats = await fs.stat(packagePath);
            if (stats.isDirectory()) {
                return await this.getDirectorySize(packagePath);
            }
            return stats.size;
        }
        catch {
            return 0;
        }
    }
    async getDirectorySize(dirPath) {
        let size = 0;
        try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    size += await this.getDirectorySize(filePath);
                }
                else {
                    size += stats.size;
                }
            }
        }
        catch {
            // エラーは無視
        }
        return size;
    }
    findDuplicatePackages() {
        const duplicates = new Map();
        const packageGroups = new Map();
        // 類似パッケージをグループ化
        for (const [name] of this.dependencies) {
            // パッケージ名からベース名を抽出
            const baseName = name.replace(/@types\//, '').replace(/-js$/, '').replace(/\.js$/, '');
            if (!packageGroups.has(baseName)) {
                packageGroups.set(baseName, []);
            }
            packageGroups.get(baseName).push(name);
        }
        // 重複を検出
        for (const [baseName, packages] of packageGroups) {
            if (packages.length > 1) {
                duplicates.set(baseName, packages);
            }
        }
        return duplicates;
    }
    async generateResult() {
        const unusedDependencies = [];
        const usedDependencies = new Map();
        const largePackages = [];
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
            }
            else {
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
    generateReport(result) {
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
                const depInfo = this.dependencies.get(dep);
                report.push(`- ${dep} (${depInfo.version}) ${depInfo.isDev ? '[dev]' : ''}`);
            }
        }
        else {
            report.push('未使用の依存関係はありません。');
        }
        report.push('', '## 重複の可能性がある依存関係', '');
        if (result.duplicatePackages.size > 0) {
            for (const [baseName, packages] of result.duplicatePackages) {
                report.push(`- ${baseName}: ${packages.join(', ')}`);
            }
        }
        else {
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
exports.DependencyAnalyzer = DependencyAnalyzer;
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
