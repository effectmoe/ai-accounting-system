import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import sharp from 'sharp';
import { logger } from '../lib/logger';

interface ImageOptimizationResult {
  file: string;
  originalSize: number;
  optimizedSize: number;
  saved: number;
  savedPercent: number;
  error?: string;
}

class ImageOptimizer {
  private results: ImageOptimizationResult[] = [];
  private totalOriginalSize = 0;
  private totalOptimizedSize = 0;

  async optimizeImage(filePath: string, outputPath?: string): Promise<ImageOptimizationResult> {
    const stats = await fs.stat(filePath);
    const originalSize = stats.size;
    
    const result: ImageOptimizationResult = {
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
        await sharp(filePath)
          .jpeg({ quality: 85, progressive: true })
          .toFile(output + '.tmp');
        optimized = true;
      } else if (ext === '.png') {
        // PNG最適化とWebP変換
        await sharp(filePath)
          .png({ compressionLevel: 9, progressive: true })
          .toFile(output + '.tmp');
        
        // WebP版も作成
        const webpPath = output.replace(/\.png$/i, '.webp');
        await sharp(filePath)
          .webp({ quality: 85 })
          .toFile(webpPath);
        
        optimized = true;
      } else if (ext === '.gif') {
        // GIFは変換せず、WebP版を作成
        const webpPath = output.replace(/\.gif$/i, '.webp');
        await sharp(filePath, { animated: true })
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
        } else {
          await fs.unlink(tmpFile);
          result.optimizedSize = originalSize;
        }
      }

      result.saved = originalSize - result.optimizedSize;
      result.savedPercent = (result.saved / originalSize) * 100;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to optimize ${filePath}:`, error);
    }

    this.totalOriginalSize += originalSize;
    this.totalOptimizedSize += result.optimizedSize;
    this.results.push(result);

    return result;
  }

  async processDirectory(directory: string, pattern: string = '**/*.{jpg,jpeg,png,gif}'): Promise<void> {
    logger.info(`Processing images in ${directory}...`);
    
    const files = await glob(pattern, {
      cwd: directory,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
      ]
    });

    logger.info(`Found ${files.length} images to optimize`);

    for (const file of files) {
      const result = await this.optimizeImage(file);
      
      if (result.saved > 0) {
        logger.info(
          `✓ ${path.relative(directory, file)}: ` +
          `${this.formatSize(result.originalSize)} → ${this.formatSize(result.optimizedSize)} ` +
          `(${result.savedPercent.toFixed(1)}% saved)`
        );
      }
    }
  }

  generateReport(): string {
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
      report.push(
        `${index + 1}. ${path.basename(result.file)}: ` +
        `${this.formatSize(result.saved)} 削減 (${result.savedPercent.toFixed(1)}%)`
      );
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

  private formatSize(bytes: number): string {
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

// メイン実行
async function main() {
  const optimizer = new ImageOptimizer();
  const projectRoot = path.resolve(__dirname, '..');
  
  await optimizer.processDirectory(projectRoot);

  const report = optimizer.generateReport();
  const reportPath = path.join(projectRoot, 'image-optimization-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  
  logger.info('\n' + report);
  logger.info(`\nレポートを保存しました: ${reportPath}`);
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

export { ImageOptimizer };