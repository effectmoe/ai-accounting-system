/**
 * ScanSnap Web SDK 型定義
 *
 * ScanSnapスキャナーをブラウザから直接操作するためのSDK
 * 参考: ScanSnap Web SDK V1.0.40 JP
 */

// スキャンモード
export enum ScanMode {
  Normal = 1,
  Fine = 2,
  SuperFine = 3,
  Excellent = 4,
  Auto = 99,  // 自動（推奨）
}

// ファイル形式
export enum FileFormat {
  PDF = 1,
  JPEG = 2,
}

// 圧縮形式
export enum Compression {
  None = 1,
  Low = 2,
  Medium = 3,
  High = 4,
  JPEG = 5,
}

// カラーモード
export enum ColorMode {
  Auto = 1,       // カラー、グレー、白黒を自動判別
  Color = 2,
  Gray = 3,
  BlackWhite = 4,
}

// 用紙サイズ
export enum PaperSize {
  Auto = 0,       // サイズ自動検出
  A4 = 1,
  A5 = 2,
  A6 = 3,
  B5 = 4,
  B6 = 5,
  Postcard = 6,
  BusinessCard = 7,
  Letter = 8,
  Legal = 9,
}

// スキャン面
export enum ScanningSide {
  Duplex = 1,     // 両面
  Simplex = 2,    // 片面
}

// 回転設定
export enum Rotation {
  Auto = 1,       // 自動判別
  None = 2,
  Rotate90 = 3,
  Rotate180 = 4,
  Rotate270 = 5,
}

// スキャン結果のファイル情報
export interface ScanFileInfo {
  fileId: string;
  fileName: string;
  fileSha256: string;
  fileSize: number;
}

// SDK初期化結果
export interface InitializeResult {
  code: number;
  sessionid?: string;
  keyword?: string;
}

// スキャン結果
export interface ScanResult {
  code: number;
  data?: ScanFileInfo[];
}

// アップロード結果
export interface UploadResult {
  status: number;
  responseJSON?: unknown;
}

// ScanSnap WebSDK インターフェース
export interface ScanSnapWebSDK {
  // プロパティ
  scanMode: ScanMode;
  format: FileFormat;
  compression: Compression;
  colorMode: ColorMode;
  paperSize: PaperSize;
  scanningSide: ScanningSide;
  rotation: Rotation;
  blankPageSkip: boolean;
  deskew: boolean;
  reduceBleedThrough: boolean;
  continueScan: boolean;
  multiFeedControl: boolean;
  paperProtection: boolean;
  searchable: boolean;
  searchableLang: number;
  scanType: number;
  continueScanReturnPath: string;

  // メソッド
  Initialize(): JQueryPromise<number>;
  Scan(): JQueryPromise<number>;
  GetBase64Data(fileId: string): JQueryPromise<string>;
  GetBlobData(fileId: string): JQueryPromise<ArrayBuffer>;
  UploadScanImg(
    imageUploadURL: string,
    filelistUploadURL: string,
    files: string[],
    headerParam?: Record<string, string>,
    fileParamArr?: unknown[],
    fileNamePrefix?: string
  ): JQueryPromise<[UploadResult[], UploadResult]>;
  RegisterEvent(eventName: 'OnScanToFile' | 'OnScanFinish', callback: (data: string | string[]) => void): void;
}

// jQuery Promise型（ScanSnap SDKはjQueryを使用）
interface JQueryPromise<T> {
  done(callback: (result: T) => void): JQueryPromise<T>;
  fail(callback: (error: unknown) => void): JQueryPromise<T>;
  always(callback: () => void): JQueryPromise<T>;
}

// グローバル宣言
declare global {
  interface Window {
    scansnap?: {
      websdk: ScanSnapWebSDK;
      storage: {
        setItem(key: string, value: string): void;
        getItem(key: string): string | null;
        clear(): void;
      };
    };
  }
}

// 直接スキャン処理の結果
export interface DirectScanResult {
  success: boolean;
  receiptId?: string;
  receiptNumber?: string;
  extractedData?: {
    issuerName?: string;
    issueDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    accountCategory?: string;
  };
  processingTime: number;
  error?: string;
}

// 直接スキャンリクエスト
export interface DirectScanRequest {
  imageBase64: string;
  fileName?: string;
}

// ScanSnap接続ステータス
export type ScanSnapConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'scanning'
  | 'error';

// ScanSnapエラーコード
export const ScanSnapErrorCodes: Record<number, string> = {
  0: '成功',
  [-1]: 'スキャン中です',
  [-2]: '接続エラー',
  [-3]: '未初期化/非対応OS',
  [-4]: '初期化タイムアウト',
  [-5]: '予期しないエラー/未確認',
  // Scan() メソッドのエラーコード
  201: 'キャンセルされました',
  202: 'ファイル/フォルダ関連エラー',
  203: '用紙詰まり',
  204: 'カバーオープン',
  205: '原稿がセットされていません',
  206: 'ScanSnapが接続されていない/モバイル機器で使用中',
  207: 'スキャナー異常',
  208: 'スキャン画像が大きすぎます',
  209: '内部エラー',
  210: '複数枚の原稿が重なって給紙されました',
};
