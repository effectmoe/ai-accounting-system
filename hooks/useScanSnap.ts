'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScanSnapConnectionStatus,
  ScanMode,
  FileFormat,
  Compression,
  ColorMode,
  ScanSnapErrorCodes,
  DirectScanResult,
} from '@/types/scansnap';

interface UseScanSnapOptions {
  autoConnect?: boolean;
  onScanComplete?: (result: DirectScanResult) => void;
  onError?: (error: string) => void;
}

interface UseScanSnapReturn {
  // 状態
  status: ScanSnapConnectionStatus;
  isReady: boolean;
  isScanning: boolean;
  lastError: string | null;
  lastResult: DirectScanResult | null;

  // アクション
  connect: () => Promise<boolean>;
  disconnect: () => void;
  scan: () => Promise<DirectScanResult | null>;
  scanAndProcess: () => Promise<DirectScanResult | null>;
}

/**
 * ScanSnap Web SDK を使用するためのカスタムフック
 *
 * 使用前にScanSnap Homeがインストール・起動されている必要があります。
 * 自動モード（scanMode: 99）を使用し、最高画質でスキャンします。
 */
export function useScanSnap(options: UseScanSnapOptions = {}): UseScanSnapReturn {
  const { autoConnect = false, onScanComplete, onError } = options;

  const [status, setStatus] = useState<ScanSnapConnectionStatus>('disconnected');
  const [isScanning, setIsScanning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<DirectScanResult | null>(null);

  const sdkLoadedRef = useRef(false);
  const initializedRef = useRef(false);

  // SDKスクリプトの読み込み
  useEffect(() => {
    if (sdkLoadedRef.current) return;

    const loadSDK = async () => {
      // jQueryがなければ読み込む
      if (!window.jQuery && !document.querySelector('script[src*="jquery"]')) {
        const jqueryScript = document.createElement('script');
        jqueryScript.src = '/lib/jquery-3.6.0.min.js';
        jqueryScript.async = false;
        document.head.appendChild(jqueryScript);

        await new Promise<void>((resolve) => {
          jqueryScript.onload = () => resolve();
        });
      }

      // ScanSnap SDKを読み込む
      if (!document.querySelector('script[src*="scansnap.websdk"]')) {
        const sdkScript = document.createElement('script');
        sdkScript.src = '/lib/scansnap.websdk.js';
        sdkScript.async = false;
        document.head.appendChild(sdkScript);

        await new Promise<void>((resolve) => {
          sdkScript.onload = () => resolve();
        });
      }

      sdkLoadedRef.current = true;

      // 自動接続
      if (autoConnect) {
        setTimeout(() => {
          connect();
        }, 500);
      }
    };

    loadSDK();
  }, [autoConnect]);

  // ScanSnap Homeへの接続
  const connect = useCallback(async (): Promise<boolean> => {
    if (!window.scansnap?.websdk) {
      const error = 'ScanSnap SDKが読み込まれていません';
      setLastError(error);
      onError?.(error);
      return false;
    }

    if (initializedRef.current) {
      return true;
    }

    setStatus('connecting');
    setLastError(null);

    try {
      const resultCode = await new Promise<number>((resolve) => {
        window.scansnap!.websdk.Initialize().done((code: number) => {
          resolve(code);
        });
      });

      if (resultCode === 0) {
        initializedRef.current = true;
        setStatus('connected');

        // スキャン設定（自動モード）
        const sdk = window.scansnap.websdk;
        sdk.scanMode = ScanMode.Auto;           // 自動（99）- ユーザー推奨
        sdk.format = FileFormat.JPEG;           // JPEG形式（PDF変換不要）
        sdk.compression = Compression.JPEG;     // JPEG圧縮
        sdk.colorMode = ColorMode.Auto;         // カラー自動判別

        return true;
      } else {
        const errorMessage = ScanSnapErrorCodes[resultCode] || `初期化エラー: ${resultCode}`;
        setLastError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);

        // 詳細なエラーメッセージ
        if (resultCode === -2) {
          console.error(
            'ScanSnap Homeが起動していない可能性があります。\n' +
            'ScanSnap Homeを起動してから再試行してください。'
          );
        }

        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '接続エラー';
      setLastError(errorMessage);
      setStatus('error');
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // 切断
  const disconnect = useCallback(() => {
    initializedRef.current = false;
    setStatus('disconnected');
  }, []);

  // スキャン実行（Base64画像を返す）
  const scan = useCallback(async (): Promise<DirectScanResult | null> => {
    if (!window.scansnap?.websdk || !initializedRef.current) {
      const error = 'ScanSnapに接続されていません';
      setLastError(error);
      onError?.(error);
      return null;
    }

    if (isScanning) {
      return null;
    }

    setIsScanning(true);
    setStatus('scanning');
    setLastError(null);

    const startTime = Date.now();

    try {
      // スキャン完了時のファイルIDを収集
      let scannedFileIds: string[] = [];

      // OnScanFinish イベントでスキャン完了時に全ファイルIDを受け取る
      const scanFinishPromise = new Promise<string[]>((resolve) => {
        window.scansnap!.websdk.RegisterEvent('OnScanFinish', (files: string | string[]) => {
          console.log('[ScanSnap] OnScanFinish received:', files);
          if (Array.isArray(files)) {
            resolve(files);
          } else if (typeof files === 'string') {
            resolve([files]);
          } else {
            resolve([]);
          }
        });
      });

      // OnScanToFile イベントでリアルタイムにファイルIDを収集（バックアップ）
      window.scansnap.websdk.RegisterEvent('OnScanToFile', (fileId: string | string[]) => {
        console.log('[ScanSnap] OnScanToFile received:', fileId);
        if (typeof fileId === 'string') {
          scannedFileIds.push(fileId);
        } else if (Array.isArray(fileId)) {
          scannedFileIds.push(...fileId);
        }
      });

      // スキャン実行
      const scanResult = await new Promise<number>((resolve) => {
        window.scansnap!.websdk.Scan().done((code: number) => {
          console.log('[ScanSnap] Scan result code:', code);
          resolve(code);
        });
      });

      if (scanResult !== 0) {
        const errorMessage = ScanSnapErrorCodes[scanResult] || `スキャンエラー: ${scanResult}`;
        setLastError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);

        // 詳細なエラーメッセージをコンソールに出力
        if (scanResult === 206) {
          console.error(
            'ScanSnapが接続されていないか、モバイル機器で使用中です。\n' +
            '以下を確認してください:\n' +
            '1. ScanSnapスキャナーがPCに接続されているか\n' +
            '2. ScanSnap Homeが起動しているか\n' +
            '3. スマートフォンアプリで使用中ではないか\n' +
            '4. スキャナーの電源が入っているか'
          );
        }

        return null;
      }

      // OnScanFinishイベントを待つ（タイムアウト5秒）
      const timeoutPromise = new Promise<string[]>((resolve) => {
        setTimeout(() => {
          console.log('[ScanSnap] OnScanFinish timeout, using OnScanToFile results:', scannedFileIds);
          resolve(scannedFileIds);
        }, 5000);
      });

      // どちらか先に完了した方を使用
      const finalFileIds = await Promise.race([scanFinishPromise, timeoutPromise]);

      // OnScanToFileで取得したIDも統合
      if (scannedFileIds.length > 0 && finalFileIds.length === 0) {
        scannedFileIds = [...new Set([...finalFileIds, ...scannedFileIds])];
      } else {
        scannedFileIds = finalFileIds.length > 0 ? finalFileIds : scannedFileIds;
      }

      console.log('[ScanSnap] Final file IDs:', scannedFileIds);

      if (scannedFileIds.length === 0) {
        const error = 'スキャンされたファイルがありません。原稿がスキャナーにセットされているか確認してください。';
        setLastError(error);
        setStatus('connected');
        onError?.(error);
        return null;
      }

      // 最初のファイルのBase64データを取得
      console.log('[ScanSnap] Getting Base64 data for:', scannedFileIds[0]);
      const base64Data = await new Promise<string>((resolve, reject) => {
        window.scansnap!.websdk.GetBase64Data(scannedFileIds[0])
          .done((data: string) => {
            console.log('[ScanSnap] Base64 data received, length:', data?.length);
            resolve(data);
          })
          .fail((err: unknown) => {
            console.error('[ScanSnap] GetBase64Data failed:', err);
            reject(err);
          });
      });

      const processingTime = Date.now() - startTime;

      const result: DirectScanResult = {
        success: true,
        processingTime,
        extractedData: undefined,
      };

      // Base64データを一時的に保存（後でOCR処理に使用）
      (result as DirectScanResult & { _imageBase64: string })._imageBase64 = base64Data;

      setStatus('connected');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'スキャンエラー';
      setLastError(errorMessage);
      setStatus('connected');
      onError?.(errorMessage);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, onError]);

  // スキャン → OCR処理 → 領収書登録
  const scanAndProcess = useCallback(async (): Promise<DirectScanResult | null> => {
    // まずスキャン
    const scanResult = await scan();
    if (!scanResult || !scanResult.success) {
      return scanResult;
    }

    const imageBase64 = (scanResult as DirectScanResult & { _imageBase64?: string })._imageBase64;
    if (!imageBase64) {
      const error = '画像データの取得に失敗しました';
      setLastError(error);
      onError?.(error);
      return null;
    }

    // OCR処理APIを呼び出し
    try {
      console.log('[ScanSnap] Calling OCR API with image length:', imageBase64.length);

      const response = await fetch('/api/scan-receipt/direct-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          fileName: `scansnap_${Date.now()}.jpg`,
        }),
      });

      console.log('[ScanSnap] OCR API response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'OCR処理に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result: DirectScanResult = await response.json();
      console.log('[ScanSnap] OCR API result:', result);
      setLastResult(result);
      onScanComplete?.(result);
      return result;
    } catch (error) {
      console.error('[ScanSnap] OCR API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'OCR処理エラー';
      setLastError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [scan, onScanComplete, onError]);

  return {
    status,
    isReady: status === 'connected',
    isScanning,
    lastError,
    lastResult,
    connect,
    disconnect,
    scan,
    scanAndProcess,
  };
}

export default useScanSnap;
