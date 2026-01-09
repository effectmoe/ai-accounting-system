'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, ScanLine, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { useScanSnap } from '@/hooks/useScanSnap';
import { DirectScanResult } from '@/types/scansnap';
import { toast } from 'sonner';

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
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isFirstConnection, setIsFirstConnection] = useState(true);

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
      // 初回接続時は許可ダイアログの案内を表示
      if (isFirstConnection) {
        toast.info(
          'ScanSnap Homeの許可ダイアログが表示される場合があります。\n「はい」をクリックしてください。',
          {
            duration: 5000,
            icon: <Bell className="h-4 w-4" />,
          }
        );
        setIsFirstConnection(false);
      }

      const connected = await connect();
      if (!connected) {
        return;
      }
    }

    // スキャン開始の通知
    toast.info(
      'スキャンを開始します。許可ダイアログが表示された場合は「はい」を押してください。',
      {
        duration: 3000,
      }
    );

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
      <div className="flex items-center gap-1">
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

        {/* 設定ガイドボタン */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSetupGuide(true)}
              >
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>許可ダイアログを無効化する方法</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

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

      {/* 設定ガイドダイアログ */}
      <Dialog open={showSetupGuide} onOpenChange={setShowSetupGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              許可ダイアログを無効化する方法
            </DialogTitle>
            <DialogDescription>
              以下の設定を変更すると、毎回の許可確認が不要になります。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>ScanSnap Home の設定変更</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li><strong>ScanSnap Home</strong> を開く</li>
                  <li>メニューバー → <strong>ScanSnap Home</strong> → <strong>環境設定</strong></li>
                  <li><strong>スキャン</strong> タブを選択</li>
                  <li>「ネットワークスキャン」の設定を確認</li>
                  <li>「常に許可」を選択して保存</li>
                </ol>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-muted-foreground">
              ※ 設定変更後はScanSnap Homeを再起動してください。
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowSetupGuide(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ScanSnapButton;
