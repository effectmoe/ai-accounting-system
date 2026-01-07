'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Wifi, WifiOff, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';
import { useScanSnap } from '@/hooks/useScanSnap';
import { DirectScanResult } from '@/types/scansnap';

interface ScanSnapButtonProps {
  onScanComplete?: (result: DirectScanResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * ScanSnapスキャナーと連携するスキャンボタン
 *
 * クリックすると:
 * 1. ScanSnap Homeに接続
 * 2. スキャン実行（自動モード）
 * 3. OCR処理
 * 4. 領収書として登録
 */
export function ScanSnapButton({
  onScanComplete,
  onError,
  className,
}: ScanSnapButtonProps) {
  const [showResultDialog, setShowResultDialog] = useState(false);

  const {
    status,
    isReady,
    isScanning,
    lastError,
    lastResult,
    connect,
    scanAndProcess,
  } = useScanSnap({
    autoConnect: false,
    onScanComplete: (result) => {
      setShowResultDialog(true);
      onScanComplete?.(result);
    },
    onError,
  });

  // ボタンクリック処理
  const handleClick = async () => {
    // 未接続なら接続
    if (!isReady) {
      const connected = await connect();
      if (!connected) {
        return;
      }
    }

    // スキャン実行
    await scanAndProcess();
  };

  // ステータスアイコン
  const StatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'scanning':
        return <ScanLine className="h-4 w-4 animate-pulse text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  // ボタンテキスト
  const getButtonText = () => {
    switch (status) {
      case 'connecting':
        return '接続中...';
      case 'scanning':
        return 'スキャン中...';
      default:
        return 'ScanSnapでスキャン';
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleClick}
              disabled={status === 'connecting' || status === 'scanning'}
              variant="outline"
              className={`flex items-center gap-2 ${className}`}
            >
              {status === 'connecting' || status === 'scanning' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              {getButtonText()}
              <StatusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>ScanSnapスキャナーで領収書をスキャン</p>
            <p className="text-xs text-muted-foreground">
              {status === 'disconnected' && 'クリックして接続'}
              {status === 'connected' && 'スキャン準備完了'}
              {status === 'error' && lastError}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* 結果ダイアログ */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {lastResult?.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  スキャン完了
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  スキャンエラー
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {lastResult?.success
                ? '領収書が正常にスキャンされ、登録されました。'
                : lastResult?.error || lastError}
            </DialogDescription>
          </DialogHeader>

          {lastResult?.success && lastResult.extractedData && (
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">発行元:</span>
                  <p className="font-medium">
                    {lastResult.extractedData.issuerName || '（不明）'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">発行日:</span>
                  <p className="font-medium">
                    {lastResult.extractedData.issueDate || '（不明）'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">金額:</span>
                  <p className="font-medium text-lg">
                    ¥{lastResult.extractedData.totalAmount?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">勘定科目:</span>
                  <p>
                    {lastResult.extractedData.accountCategory ? (
                      <Badge variant="outline">
                        {lastResult.extractedData.accountCategory}
                      </Badge>
                    ) : (
                      '（未分類）'
                    )}
                  </p>
                </div>
              </div>

              {lastResult.receiptNumber && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground text-sm">領収書番号:</span>
                  <p className="font-mono text-sm">{lastResult.receiptNumber}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                処理時間: {(lastResult.processingTime / 1000).toFixed(1)}秒
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>
              閉じる
            </Button>
            {lastResult?.success && (
              <Button onClick={handleClick}>
                続けてスキャン
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ScanSnapButton;
