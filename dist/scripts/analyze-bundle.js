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
exports.BundleAnalyzer = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../lib/logger");
class BundleAnalyzer {
    buildDir = '.next';
    analysis = {
        totalSize: 0,
        chunks: [],
        largestDependencies: [],
        recommendations: [],
    };
    async analyze() {
        logger_1.logger.info('Starting bundle analysis...');
        try {
            // 1. ビルドを実行してバンドルを生成
            await this.runBuild();
            // 2. ビルドサイズを分析
            await this.analyzeBuildSize();
            // 3. 大きな依存関係を特定
            await this.analyzeDependencies();
            // 4. 最適化の推奨事項を生成
            this.generateRecommendations();
            return this.analysis;
        }
        catch (error) {
            logger_1.logger.error('Bundle analysis failed', error);
            throw error;
        }
    }
    async runBuild() {
        logger_1.logger.info('Running Next.js build...');
        try {
            // ANALYZE=true で詳細な分析を有効化
            (0, child_process_1.execSync)('ANALYZE=true npm run build', {
                stdio: 'inherit',
                env: { ...process.env, ANALYZE: 'true' }
            });
        }
        catch (error) {
            logger_1.logger.warn('Build with ANALYZE failed, trying normal build...');
            (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
        }
    }
    async analyzeBuildSize() {
        const buildManifest = path.join(this.buildDir, 'build-manifest.json');
        const appBuildManifest = path.join(this.buildDir, 'app-build-manifest.json');
        try {
            // ビルドマニフェストを読み込む
            const manifest = await this.readJsonFile(buildManifest);
            const appManifest = await this.readJsonFile(appBuildManifest);
            // チャンクサイズを分析
            await this.analyzeChunks();
        }
        catch (error) {
            logger_1.logger.warn('Could not read build manifests', error);
        }
    }
    async analyzeChunks() {
        const staticDir = path.join(this.buildDir, 'static', 'chunks');
        try {
            const files = await fs.readdir(staticDir, { recursive: true });
            for (const file of files) {
                if (file.toString().endsWith('.js')) {
                    const filePath = path.join(staticDir, file.toString());
                    const stats = await fs.stat(filePath);
                    const chunk = {
                        name: file.toString(),
                        size: stats.size,
                        sizeFormatted: this.formatSize(stats.size),
                        modules: 0, // 実際のモジュール数は webpack-bundle-analyzer で取得
                    };
                    this.analysis.chunks.push(chunk);
                    this.analysis.totalSize += stats.size;
                }
            }
            // サイズでソート
            this.analysis.chunks.sort((a, b) => b.size - a.size);
        }
        catch (error) {
            logger_1.logger.warn('Could not analyze chunks', error);
        }
    }
    async analyzeDependencies() {
        // package.jsonから大きな依存関係を特定
        const packageJson = await this.readJsonFile('package.json');
        const nodeModulesSize = new Map();
        // 主要な大きなパッケージをチェック
        const largePackages = [
            'googleapis',
            '@azure/ai-form-recognizer',
            '@azure/openai',
            'next',
            'react',
            'react-dom',
            '@mastra/core',
            'framer-motion',
            'recharts',
            '@react-pdf/renderer',
            'lucide-react',
            'date-fns',
            '@radix-ui',
        ];
        for (const pkg of largePackages) {
            try {
                const size = await this.getPackageSize(pkg);
                if (size > 0) {
                    nodeModulesSize.set(pkg, size);
                }
            }
            catch (error) {
                // パッケージが存在しない場合は無視
            }
        }
        // サイズでソートして上位10個を取得
        const sortedDeps = Array.from(nodeModulesSize.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        this.analysis.largestDependencies = sortedDeps.map(([name, size]) => ({
            name,
            size,
            sizeFormatted: this.formatSize(size),
            percentage: (size / this.analysis.totalSize) * 100,
        }));
    }
    generateRecommendations() {
        const recommendations = [];
        // 1. 大きなパッケージの最適化
        if (this.analysis.largestDependencies.some(dep => dep.name === 'googleapis')) {
            recommendations.push('🔴 googleapis (122MB) を個別のAPIクライアントに置き換える:\n' +
                '   - @google-cloud/storage\n' +
                '   - @google-cloud/vision\n' +
                '   - 使用するAPIのみをインポート');
        }
        if (this.analysis.largestDependencies.some(dep => dep.name === 'date-fns')) {
            recommendations.push('🟡 date-fns の import を最適化:\n' +
                '   - import { format } from "date-fns" を使用\n' +
                '   - import * as dateFns from "date-fns" を避ける');
        }
        if (this.analysis.largestDependencies.some(dep => dep.name === 'lucide-react')) {
            recommendations.push('🟡 lucide-react のアイコンを個別インポート:\n' +
                '   - import { Search } from "lucide-react"\n' +
                '   - 使用するアイコンのみをインポート');
        }
        // 2. コード分割の推奨
        if (this.analysis.chunks.some(chunk => chunk.size > 500 * 1024)) {
            recommendations.push('🔴 500KB以上のチャンクを検出。コード分割を推奨:\n' +
                '   - dynamic importの使用\n' +
                '   - React.lazyでコンポーネントを遅延ロード');
        }
        // 3. 未使用の依存関係
        recommendations.push('🟡 以前の分析で14個の未使用依存関係を検出:\n' +
            '   - npm uninstall で削除してバンドルサイズを削減');
        // 4. 画像最適化
        recommendations.push('🟢 画像の最適化:\n' +
            '   - next/imageコンポーネントを使用\n' +
            '   - WebP形式への自動変換\n' +
            '   - 適切なサイズでの配信');
        // 5. フォント最適化
        recommendations.push('🟢 フォントの最適化:\n' +
            '   - next/fontを使用してフォントを最適化\n' +
            '   - 必要なサブセットのみをロード');
        this.analysis.recommendations = recommendations;
    }
    async getPackageSize(packageName) {
        const packagePath = path.join('node_modules', packageName);
        return this.getDirectorySize(packagePath);
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
        catch (error) {
            // エラーは無視
        }
        return size;
    }
    async readJsonFile(filePath) {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    async generateReport(analysis) {
        const report = [
            '# バンドルサイズ分析レポート',
            '',
            `総バンドルサイズ: ${this.formatSize(analysis.totalSize)}`,
            `チャンク数: ${analysis.chunks.length}`,
            '',
            '## 大きなチャンク (Top 10)',
            '',
        ];
        analysis.chunks.slice(0, 10).forEach((chunk, index) => {
            report.push(`${index + 1}. ${chunk.name}: ${chunk.sizeFormatted}`);
        });
        report.push('', '## 大きな依存関係', '');
        analysis.largestDependencies.forEach((dep, index) => {
            report.push(`${index + 1}. ${dep.name}: ${dep.sizeFormatted} (${dep.percentage.toFixed(1)}%)`);
        });
        report.push('', '## 最適化の推奨事項', '');
        analysis.recommendations.forEach(rec => {
            report.push(rec);
            report.push('');
        });
        report.push('## 次のステップ', '');
        report.push('1. 推奨事項に従って大きなパッケージを最適化');
        report.push('2. コード分割を実装してチャンクサイズを削減');
        report.push('3. 未使用の依存関係を削除');
        report.push('4. webpack-bundle-analyzerで詳細な分析を実行');
        return report.join('\n');
    }
}
exports.BundleAnalyzer = BundleAnalyzer;
// メイン実行
async function main() {
    const analyzer = new BundleAnalyzer();
    try {
        logger_1.logger.info('バンドルサイズ分析を開始します...');
        const analysis = await analyzer.analyze();
        const report = await analyzer.generateReport(analysis);
        const reportPath = path.join(process.cwd(), 'bundle-analysis-report.md');
        await fs.writeFile(reportPath, report, 'utf-8');
        console.log('\n' + report);
        console.log(`\nレポートを保存しました: ${reportPath}`);
    }
    catch (error) {
        logger_1.logger.error('分析に失敗しました', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
