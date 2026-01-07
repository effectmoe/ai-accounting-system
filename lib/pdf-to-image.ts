/**
 * PDF to Image 変換ユーティリティ
 * pdftoppm (poppler-utils) を使用してPDFをPNG画像に変換
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

interface PdfToImageOptions {
  dpi?: number; // 解像度（デフォルト: 300）
  page?: number; // 変換するページ（デフォルト: 1）
  format?: 'png' | 'jpeg'; // 出力フォーマット（デフォルト: png）
}

interface PdfToImageResult {
  imagePath: string;
  imageBuffer: Buffer;
  width?: number;
  height?: number;
}

/**
 * PDFの最初のページを画像に変換
 * @param pdfPath - PDFファイルのパス
 * @param options - 変換オプション
 * @returns 変換された画像のバッファ
 */
export async function convertPdfToImage(
  pdfPath: string,
  options: PdfToImageOptions = {}
): Promise<PdfToImageResult> {
  const {
    dpi = 300,
    page = 1,
    format = 'png'
  } = options;

  // 一時ディレクトリにファイル作成
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pdf-to-image-'));
  const outputPrefix = path.join(tempDir, 'output');

  logger.debug('[PdfToImage] Converting PDF to image...', {
    pdfPath,
    dpi,
    page,
    format,
    tempDir
  });

  try {
    // pdftoppm コマンドを実行
    // -f: 開始ページ, -l: 終了ページ, -r: 解像度, -png/-jpeg: 出力フォーマット
    const formatFlag = format === 'png' ? '-png' : '-jpeg';
    const command = `pdftoppm -f ${page} -l ${page} -r ${dpi} ${formatFlag} "${pdfPath}" "${outputPrefix}"`;

    logger.debug('[PdfToImage] Executing command:', command);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000 // 60秒タイムアウト
    });

    if (stderr && stderr.trim()) {
      logger.warn('[PdfToImage] stderr:', stderr);
    }

    // 出力ファイルを探す（pdftoppmは output-1.png のようなファイル名で出力）
    const files = await fs.promises.readdir(tempDir);
    const imageFile = files.find(f => f.startsWith('output') && f.endsWith(`.${format === 'png' ? 'png' : 'jpg'}`));

    if (!imageFile) {
      throw new Error('pdftoppm did not generate any output file');
    }

    const imagePath = path.join(tempDir, imageFile);
    const imageBuffer = await fs.promises.readFile(imagePath);

    logger.debug('[PdfToImage] Conversion successful', {
      outputFile: imageFile,
      size: imageBuffer.length
    });

    return {
      imagePath,
      imageBuffer
    };
  } catch (error) {
    // クリーンアップ
    await cleanupTempDir(tempDir);

    if (error instanceof Error) {
      if (error.message.includes('pdftoppm')) {
        throw new Error(`pdftoppm command failed: ${error.message}. Make sure poppler-utils is installed.`);
      }
      throw error;
    }
    throw new Error('Unknown error during PDF conversion');
  }
}

/**
 * 一時ディレクトリをクリーンアップ
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    if (await fs.promises.stat(tempDir).then(s => s.isDirectory()).catch(() => false)) {
      const files = await fs.promises.readdir(tempDir);
      await Promise.all(
        files.map(file => fs.promises.unlink(path.join(tempDir, file)).catch(() => {}))
      );
      await fs.promises.rmdir(tempDir).catch(() => {});
      logger.debug('[PdfToImage] Cleaned up temp directory:', tempDir);
    }
  } catch (error) {
    logger.warn('[PdfToImage] Failed to cleanup temp directory:', tempDir, error);
  }
}

/**
 * pdftoppm が利用可能か確認
 */
export async function isPdftoppmAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('which pdftoppm');
    return !!stdout.trim();
  } catch {
    return false;
  }
}

/**
 * PDFのページ数を取得
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages`);
    const match = stdout.match(/Pages:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  } catch (error) {
    logger.warn('[PdfToImage] Failed to get PDF page count, assuming 1 page');
    return 1;
  }
}

/**
 * PDFファイルが有効かチェック
 */
export async function isValidPdf(pdfPath: string): Promise<boolean> {
  try {
    // ファイル存在確認
    const stat = await fs.promises.stat(pdfPath);
    if (!stat.isFile()) {
      return false;
    }

    // PDFヘッダー確認
    const buffer = Buffer.alloc(5);
    const fd = await fs.promises.open(pdfPath, 'r');
    await fd.read(buffer, 0, 5, 0);
    await fd.close();

    return buffer.toString('ascii') === '%PDF-';
  } catch {
    return false;
  }
}
