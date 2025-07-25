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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageOptimizer = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("../lib/logger");
class ImageOptimizer {
    results = [];
    totalOriginalSize = 0;
    totalOptimizedSize = 0;
    async optimizeImage(filePath, outputPath) {
        const stats = await fs.stat(filePath);
        const originalSize = stats.size;
        const result = {
            file: filePath,
            originalSize,
            optimizedSize: originalSize,
            saved: 0,
            savedPercent: 0,
        };
        try {
            const ext = path.extname(filePath).toLowerCase();
            const output = outputPath || filePath;
            let optimized = false;
            if (ext === '.jpg' || ext === '.jpeg') {
                // JPEG最適化
                await (0, sharp_1.default)(filePath)
                    .jpeg({ quality: 85, progressive: true })
                    .toFile(output + '.tmp');
                optimized = true;
            }
            else if (ext === '.png') {
                // PNG最適化とWebP変換
                await (0, sharp_1.default)(filePath)
                    .png({ compressionLevel: 9, progressive: true })
                    .toFile(output + '.tmp');
                // WebP版も作成
                const webpPath = output.replace(/\.png$/i, '.webp');
                await (0, sharp_1.default)(filePath)
                    .webp({ quality: 85 })
                    .toFile(webpPath);
                optimized = true;
            }
            else if (ext === '.gif') {
                // GIFは変換せず、WebP版を作成
                const webpPath = output.replace(/\.gif$/i, '.webp');
                await (0, sharp_1.default)(filePath, { animated: true })
                    .webp({ quality: 85 })
                    .toFile(webpPath);
            }
            if (optimized) {
                const tmpFile = output + '.tmp';
                const newStats = await fs.stat(tmpFile);
                result.optimizedSize = newStats.size;
                // 元のファイルより小さい場合のみ置き換え
                if (result.optimizedSize < originalSize) {
                    await fs.rename(tmpFile, output);
                }
                else {
                    await fs.unlink(tmpFile);
                    result.optimizedSize = originalSize;
                }
            }
            result.saved = originalSize - result.optimizedSize;
            result.savedPercent = (result.saved / originalSize) * 100;
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Failed to optimize ${filePath}:`, error);
        }
        this.totalOriginalSize += originalSize;
        this.totalOptimizedSize += result.optimizedSize;
        this.results.push(result);
        return result;
    }
    async processDirectory(directory, pattern = '**/*.{jpg,jpeg,png,gif}') {
        logger_1.logger.info(`Processing images in ${directory}...`);
        const files = await (0, glob_1.glob)(pattern, {
            cwd: directory,
            absolute: true,
            ignore: [
                '**/node_modules/**',
                '**/.next/**',
                '**/dist/**',
                '**/build/**',
            ]
        });
        logger_1.logger.info(`Found ${files.length} images to optimize`);
        for (const file of files) {
            const result = await this.optimizeImage(file);
            if (result.saved > 0) {
                logger_1.logger.info(`✓ ${path.relative(directory, file)}: ` +
                    `${this.formatSize(result.originalSize)} → ${this.formatSize(result.optimizedSize)} ` +
                    `(${result.savedPercent.toFixed(1)}% saved)`);
            }
        }
    }
    generateReport() {
        const report = [
            '# 画像最適化レポート',
            '',
            `処理した画像数: ${this.results.length}`,
            `元のサイズ合計: ${this.formatSize(this.totalOriginalSize)}`,
            `最適化後のサイズ: ${this.formatSize(this.totalOptimizedSize)}`,
            `削減サイズ: ${this.formatSize(this.totalOriginalSize - this.totalOptimizedSize)}`,
            `削減率: ${((this.totalOriginalSize - this.totalOptimizedSize) / this.totalOriginalSize * 100).toFixed(1)}%`,
            '',
            '## 最適化結果 (Top 20)',
            '',
        ];
        const sortedResults = this.results
            .filter(r => r.saved > 0)
            .sort((a, b) => b.saved - a.saved)
            .slice(0, 20);
        sortedResults.forEach((result, index) => {
            report.push(`${index + 1}. ${path.basename(result.file)}: ` +
                `${this.formatSize(result.saved)} 削減 (${result.savedPercent.toFixed(1)}%)`);
        });
        if (this.results.some(r => r.error)) {
            report.push('', '## エラー', '');
            this.results.filter(r => r.error).forEach(result => {
                report.push(`- ${result.file}: ${result.error}`);
            });
        }
        report.push('', '## 推奨事項', '');
        report.push('1. next/imageコンポーネントを使用して自動最適化を有効にする');
        report.push('2. WebP形式への自動変換を活用する');
        report.push('3. 適切なサイズ指定で画像を配信する');
        report.push('4. 遅延読み込み（lazy loading）を実装する');
        return report.join('\n');
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
}
exports.ImageOptimizer = ImageOptimizer;
// メイン実行
async function main() {
    const optimizer = new ImageOptimizer();
    const projectRoot = path.resolve(__dirname, '..');
    await optimizer.processDirectory(projectRoot);
    const report = optimizer.generateReport();
    const reportPath = path.join(projectRoot, 'image-optimization-report.md');
    await fs.writeFile(reportPath, report, 'utf-8');
    logger_1.logger.info('\n' + report);
    logger_1.logger.info(`\nレポートを保存しました: ${reportPath}`);
}
// スクリプト実行
if (require.main === module) {
    main().catch(console.error);
}
