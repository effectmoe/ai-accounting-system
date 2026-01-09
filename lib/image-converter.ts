/**
 * 画像変換ライブラリ
 * PNG/JPEG画像をWEBP形式に変換する
 */

import sharp from 'sharp';

export interface ConversionOptions {
  quality?: number;       // WEBP品質 (1-100, デフォルト: 80)
  maxWidth?: number;      // 最大幅 (デフォルト: 1920)
  maxHeight?: number;     // 最大高さ (デフォルト: 1920)
  preserveAspectRatio?: boolean; // アスペクト比を維持 (デフォルト: true)
}

export interface ConversionResult {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: 'webp';
}

const DEFAULT_OPTIONS: Required<ConversionOptions> = {
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1920,
  preserveAspectRatio: true,
};

/**
 * 画像バッファをWEBP形式に変換
 * @param inputBuffer - 入力画像のバッファ (PNG, JPEG, etc.)
 * @param options - 変換オプション
 * @returns 変換結果
 */
export async function convertToWebp(
  inputBuffer: Buffer,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 画像を読み込み、リサイズしてWEBPに変換
  let transformer = sharp(inputBuffer);

  // メタデータを取得
  const metadata = await transformer.metadata();

  // リサイズが必要かチェック
  const needsResize =
    (metadata.width && metadata.width > opts.maxWidth) ||
    (metadata.height && metadata.height > opts.maxHeight);

  if (needsResize && opts.preserveAspectRatio) {
    transformer = transformer.resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // WEBPに変換
  const webpBuffer = await transformer
    .webp({ quality: opts.quality })
    .toBuffer();

  // 変換後のメタデータを取得
  const outputMetadata = await sharp(webpBuffer).metadata();

  return {
    buffer: webpBuffer,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
    size: webpBuffer.length,
    format: 'webp',
  };
}

/**
 * ファイルパスから画像を読み込んでWEBPに変換
 * @param filePath - 入力画像のファイルパス
 * @param options - 変換オプション
 * @returns 変換結果
 */
export async function convertFileToWebp(
  filePath: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let transformer = sharp(filePath);

  // メタデータを取得
  const metadata = await transformer.metadata();

  // リサイズが必要かチェック
  const needsResize =
    (metadata.width && metadata.width > opts.maxWidth) ||
    (metadata.height && metadata.height > opts.maxHeight);

  if (needsResize && opts.preserveAspectRatio) {
    transformer = transformer.resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // WEBPに変換
  const webpBuffer = await transformer
    .webp({ quality: opts.quality })
    .toBuffer();

  // 変換後のメタデータを取得
  const outputMetadata = await sharp(webpBuffer).metadata();

  return {
    buffer: webpBuffer,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
    size: webpBuffer.length,
    format: 'webp',
  };
}

/**
 * 画像フォーマットを判定
 * @param buffer - 画像バッファ
 * @returns フォーマット名 (jpeg, png, webp, etc.)
 */
export async function detectImageFormat(buffer: Buffer): Promise<string | undefined> {
  const metadata = await sharp(buffer).metadata();
  return metadata.format;
}

/**
 * 画像のサイズ情報を取得
 * @param buffer - 画像バッファ
 * @returns サイズ情報
 */
export async function getImageInfo(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string | undefined;
  size: number;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format,
    size: buffer.length,
  };
}
