/**
 * Cloudflare R2 クライアント
 * 領収書画像をR2にアップロード・管理する
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// 環境変数の型定義
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

// R2設定を取得
function getR2Config(): R2Config {
  const config: R2Config = {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'receipt-images',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  };

  // 必須の環境変数チェック
  const missing: string[] = [];
  if (!config.accountId) missing.push('R2_ACCOUNT_ID');
  if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    throw new Error(`R2設定エラー: 以下の環境変数が設定されていません: ${missing.join(', ')}`);
  }

  return config;
}

// S3クライアントのシングルトン
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getR2Config();
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * 画像をR2にアップロード
 * @param buffer - アップロードする画像データ
 * @param key - R2内のオブジェクトキー（パス）
 * @param options - アップロードオプション
 * @returns アップロード結果
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const config = getR2Config();
  const client = getS3Client();

  const contentType = options.contentType || 'image/webp';

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: options.metadata,
  });

  await client.send(command);

  // 公開URLを生成
  const url = config.publicUrl
    ? `${config.publicUrl}/${key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;

  return {
    key,
    url,
    size: buffer.length,
    contentType,
  };
}

/**
 * 領収書画像用のキーを生成
 * @param receiptId - 領収書ID
 * @param pageNumber - ページ番号（デフォルト: 1）
 * @returns オブジェクトキー
 */
export function generateReceiptImageKey(
  receiptId: string,
  pageNumber: number = 1
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // パス: receipts/YYYY/MM/{receiptId}/page_{pageNumber}.webp
  return `receipts/${year}/${month}/${receiptId}/page_${pageNumber}.webp`;
}

/**
 * R2からオブジェクトを取得
 * @param key - オブジェクトキー
 * @returns オブジェクトデータ
 */
export async function getFromR2(key: string): Promise<Buffer | null> {
  const config = getR2Config();
  const client = getS3Client();

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    const response = await client.send(command);

    if (!response.Body) {
      return null;
    }

    // StreamをBufferに変換
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

/**
 * R2からオブジェクトを削除
 * @param key - オブジェクトキー
 * @returns 削除成功した場合true
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const config = getR2Config();
  const client = getS3Client();

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error(`R2オブジェクト削除エラー [${key}]:`, error);
    return false;
  }
}

/**
 * R2にオブジェクトが存在するかチェック
 * @param key - オブジェクトキー
 * @returns 存在する場合true
 */
export async function existsInR2(key: string): Promise<boolean> {
  const config = getR2Config();
  const client = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * 領収書画像のURLを取得
 * @param key - オブジェクトキー
 * @returns 公開URL
 */
export function getReceiptImageUrl(key: string): string {
  const config = getR2Config();
  return config.publicUrl
    ? `${config.publicUrl}/${key}`
    : `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;
}

/**
 * 複数の画像を一括アップロード
 * @param images - アップロードする画像の配列
 * @returns アップロード結果の配列
 */
export async function uploadMultipleToR2(
  images: Array<{
    buffer: Buffer;
    key: string;
    options?: UploadOptions;
  }>
): Promise<UploadResult[]> {
  const results = await Promise.all(
    images.map(({ buffer, key, options }) => uploadToR2(buffer, key, options))
  );
  return results;
}
