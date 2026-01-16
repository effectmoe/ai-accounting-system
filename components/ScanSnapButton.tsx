'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Wifi, WifiOff, ScanLine, CheckCircle2, AlertCircle, Info, Bell, HelpCircle } from 'lucide-react';
import { useScanSnap } from '@/hooks/useScanSnap';
import { DirectScanResult, ScanConfirmationQuestion } from '@/types/scansnap';
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
// 確認回答の型
interface ConfirmationAnswer {
  questionId: string;
  value: string;
  resultCategory?: string;
}

export function ScanSnapButton({
  onScanComplete,
  onError,
  className,
}: ScanSnapButtonProps) {
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isFirstConnection, setIsFirstConnection] = useState(true);

  // 確認フロー用ステート
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [confirmationAnswers, setConfirmationAnswers] = useState<Record<string, ConfirmationAnswer>>({});
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<DirectScanResult | null>(null);

  // 「その他」選択時のAI分析フロー用ステート
  const [showOtherExplanationInput, setShowOtherExplanationInput] = useState(false);
  const [otherExplanation, setOtherExplanation] = useState('');
  const [isAnalyzingExpense, setIsAnalyzingExpense] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    isExpense: boolean;
    reason: string;
    suggestedCategory?: string;
    exclusionReason?: string;
  } | null>(null);

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
      // 確認が必要な場合は確認ダイアログを表示
      if (result.needsConfirmation && result.confirmationQuestions?.length) {
        setPendingConfirmation(result);
        setConfirmationAnswers({});
        setShowConfirmationDialog(true);
      } else {
        // 確認不要の場合は通常の結果ダイアログを表示
        setShowResultDialog(true);
        onScanComplete?.(result);
      }
    },
    onError,
  });

  // 確認回答を送信して領収書を作成
  const handleConfirmationSubmit = async () => {
    if (!pendingConfirmation) return;

    setIsSubmittingConfirmation(true);

    try {
      // 回答から確定した勘定科目を決定
      const answers = Object.values(confirmationAnswers);
      let confirmedCategory: string | undefined;

      // 回答に resultCategory が含まれている場合はそれを使用
      for (const answer of answers) {
        if (answer.resultCategory) {
          confirmedCategory = answer.resultCategory;
        }
      }

      const response = await fetch('/api/scan-receipt/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedData: pendingConfirmation.extractedData,
          pendingReceiptData: pendingConfirmation.pendingReceiptData,
          answers,
          confirmedCategory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '確認処理に失敗しました');
      }

      const result: DirectScanResult = await response.json();

      // 確認ダイアログを閉じて結果ダイアログを表示
      setShowConfirmationDialog(false);
      setPendingConfirmation(null);
      setShowResultDialog(true);
      onScanComplete?.(result);

      toast.success('領収書を登録しました', {
        description: `勘定科目: ${result.extractedData?.accountCategory || '未分類'}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '確認処理に失敗しました';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmittingConfirmation(false);
    }
  };

  // 確認ダイアログをスキップして元の勘定科目で登録
  const handleSkipConfirmation = async () => {
    if (!pendingConfirmation) return;

    setIsSubmittingConfirmation(true);

    try {
      const response = await fetch('/api/scan-receipt/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedData: pendingConfirmation.extractedData,
          pendingReceiptData: pendingConfirmation.pendingReceiptData,
          answers: [],
          confirmedCategory: pendingConfirmation.extractedData?.accountCategory || '未分類',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登録処理に失敗しました');
      }

      const result: DirectScanResult = await response.json();

      setShowConfirmationDialog(false);
      setPendingConfirmation(null);
      setShowResultDialog(true);
      onScanComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登録処理に失敗しました';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmittingConfirmation(false);
    }
  };

  // 回答の更新
  const updateAnswer = (questionId: string, value: string, resultCategory?: string) => {
    setConfirmationAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, value, resultCategory },
    }));

    // 「その他」が選択された場合、説明入力モードに切り替え
    if (value === 'other') {
      setShowOtherExplanationInput(true);
      setOtherExplanation('');
      setAiAnalysisResult(null);
    } else {
      setShowOtherExplanationInput(false);
      setAiAnalysisResult(null);
    }
  };

  // 「その他」の説明をAIで分析
  const analyzeOtherExplanation = async () => {
    if (!otherExplanation.trim() || !pendingConfirmation) return;

    setIsAnalyzingExpense(true);
    setAiAnalysisResult(null);

    try {
      const response = await fetch('/api/scan-receipt/analyze-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptData: {
            issuerName: pendingConfirmation.extractedData?.issuerName,
            issueDate: pendingConfirmation.extractedData?.issueDate,
            totalAmount: pendingConfirmation.extractedData?.totalAmount,
            taxAmount: pendingConfirmation.extractedData?.taxAmount,
            subject: pendingConfirmation.extractedData?.subject,
            items: pendingConfirmation.extractedData?.items,
          },
          userExplanation: otherExplanation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析に失敗しました');
      }

      const result = await response.json();
      setAiAnalysisResult({
        isExpense: result.isExpense,
        reason: result.reason,
        suggestedCategory: result.suggestedCategory,
        exclusionReason: result.exclusionReason,
      });

      // 経費として認められる場合、回答を更新
      if (result.isExpense && result.suggestedCategory) {
        // 最初の質問IDを取得
        const questionId = pendingConfirmation.confirmationQuestions?.[0]?.id;
        if (questionId) {
          setConfirmationAnswers(prev => ({
            ...prev,
            [questionId]: {
              questionId,
              value: 'ai_analyzed',
              resultCategory: result.suggestedCategory,
            },
          }));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '分析に失敗しました';
      toast.error(errorMessage);
    } finally {
      setIsAnalyzingExpense(false);
    }
  };

  // 経費除外して閉じる
  const handleExcludeExpense = () => {
    setShowConfirmationDialog(false);
    setPendingConfirmation(null);
    setShowOtherExplanationInput(false);
    setOtherExplanation('');
    setAiAnalysisResult(null);
    setConfirmationAnswers({});
    toast.info('この領収書は経費として登録されませんでした', {
      description: aiAnalysisResult?.exclusionReason || '経費対象外',
    });
  };

  // 全ての必須質問に回答しているかチェック
  const isAllRequiredAnswered = () => {
    if (!pendingConfirmation?.confirmationQuestions) return true;
    const requiredQuestions = pendingConfirmation.confirmationQuestions.filter(q => q.required);

    // 「その他」が選択されている場合、AI分析結果が必要
    const hasOtherSelected = Object.values(confirmationAnswers).some(a => a.value === 'other');
    if (hasOtherSelected) {
      // AI分析が完了し、経費として認められた場合のみ回答済みとみなす
      return aiAnalysisResult?.isExpense === true && aiAnalysisResult?.suggestedCategory;
    }

    return requiredQuestions.every(q => confirmationAnswers[q.id]?.value);
  };

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

      {/* 確認フローダイアログ */}
      <Dialog open={showConfirmationDialog} onOpenChange={(open) => {
        if (!open && !isSubmittingConfirmation) {
          setShowConfirmationDialog(false);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              内容の確認が必要です
            </DialogTitle>
            <DialogDescription>
              以下の内容について確認が必要です。回答してください。
            </DialogDescription>
          </DialogHeader>

          {pendingConfirmation && (
            <div className="space-y-4 pt-4">
              {/* 検出理由の表示 */}
              {pendingConfirmation.confirmationReasons && pendingConfirmation.confirmationReasons.length > 0 && (
                <Alert variant="default" className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">確認が必要な理由</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {pendingConfirmation.confirmationReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* 抽出データのサマリー */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">発行元:</span>
                    <p className="font-medium">{pendingConfirmation.extractedData?.issuerName || '（不明）'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">金額:</span>
                    <p className="font-medium">¥{pendingConfirmation.extractedData?.totalAmount?.toLocaleString() || 0}</p>
                  </div>
                  {pendingConfirmation.extractedData?.subject && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">但し書き:</span>
                      <p className="font-medium">{pendingConfirmation.extractedData.subject}</p>
                    </div>
                  )}
                  {pendingConfirmation.pendingCategory && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">推定勘定科目:</span>
                      <Badge variant="outline" className="ml-2">{pendingConfirmation.pendingCategory}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* 質問項目 */}
              <div className="space-y-4">
                {pendingConfirmation.confirmationQuestions?.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>

                    {question.context && (
                      <p className="text-xs text-muted-foreground">{question.context}</p>
                    )}

                    {question.type === 'single_choice' && question.options && (
                      <RadioGroup
                        value={confirmationAnswers[question.id]?.value || ''}
                        onValueChange={(value) => {
                          const option = question.options?.find(o => o.value === value);
                          updateAnswer(question.id, value, option?.resultCategory);
                        }}
                        className="space-y-2"
                      >
                        {question.options.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                            <Label htmlFor={`${question.id}-${option.value}`} className="text-sm font-normal cursor-pointer">
                              {option.label}
                              {option.resultCategory && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  → {option.resultCategory}
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {question.type === 'yes_no' && (
                      <RadioGroup
                        value={confirmationAnswers[question.id]?.value || ''}
                        onValueChange={(value) => updateAnswer(question.id, value)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                          <Label htmlFor={`${question.id}-yes`} className="text-sm font-normal cursor-pointer">はい</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id={`${question.id}-no`} />
                          <Label htmlFor={`${question.id}-no`} className="text-sm font-normal cursor-pointer">いいえ</Label>
                        </div>
                      </RadioGroup>
                    )}

                    {question.type === 'text_input' && (
                      <Input
                        value={confirmationAnswers[question.id]?.value || ''}
                        onChange={(e) => updateAnswer(question.id, e.target.value)}
                        placeholder="入力してください..."
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* 「その他」選択時の説明入力欄 */}
              {showOtherExplanationInput && (
                <div className="space-y-3 mt-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
                  <Label className="text-sm font-medium text-blue-800">
                    この支払いの詳細を教えてください
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <p className="text-xs text-blue-600">
                    AIがこの説明と領収書を照合し、経費として認められるか判断します。
                  </p>
                  <textarea
                    value={otherExplanation}
                    onChange={(e) => setOtherExplanation(e.target.value)}
                    placeholder="例: 社員の生活保護費、取引先への贈答品、事務所の消耗品など..."
                    className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none"
                    disabled={isAnalyzingExpense}
                  />
                  <Button
                    type="button"
                    onClick={analyzeOtherExplanation}
                    disabled={!otherExplanation.trim() || isAnalyzingExpense}
                    className="w-full"
                    variant="secondary"
                  >
                    {isAnalyzingExpense ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        AIが分析中...
                      </>
                    ) : (
                      'AIで経費判定する'
                    )}
                  </Button>
                </div>
              )}

              {/* AI分析結果の表示 */}
              {aiAnalysisResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  aiAnalysisResult.isExpense
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {aiAnalysisResult.isExpense ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        aiAnalysisResult.isExpense ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {aiAnalysisResult.isExpense
                          ? '経費として認められます'
                          : '経費として認められません'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        aiAnalysisResult.isExpense ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {aiAnalysisResult.reason}
                      </p>
                      {aiAnalysisResult.isExpense && aiAnalysisResult.suggestedCategory && (
                        <p className="text-sm mt-2 text-green-600">
                          推奨勘定科目: <Badge variant="outline" className="bg-green-100">{aiAnalysisResult.suggestedCategory}</Badge>
                        </p>
                      )}
                      {!aiAnalysisResult.isExpense && aiAnalysisResult.exclusionReason && (
                        <p className="text-sm mt-2 text-red-600">
                          {aiAnalysisResult.exclusionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4">
            {/* 経費除外ボタン（AIが経費でないと判断した場合） */}
            {aiAnalysisResult && !aiAnalysisResult.isExpense ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOtherExplanationInput(false);
                    setOtherExplanation('');
                    setAiAnalysisResult(null);
                    // 「その他」の選択を解除
                    const questionId = pendingConfirmation?.confirmationQuestions?.[0]?.id;
                    if (questionId) {
                      setConfirmationAnswers(prev => {
                        const newAnswers = { ...prev };
                        delete newAnswers[questionId];
                        return newAnswers;
                      });
                    }
                  }}
                >
                  別の選択肢を選ぶ
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleExcludeExpense}
                >
                  経費から除外して閉じる
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleSkipConfirmation}
                  disabled={isSubmittingConfirmation}
                >
                  スキップ（推定値で登録）
                </Button>
                <Button
                  onClick={handleConfirmationSubmit}
                  disabled={isSubmittingConfirmation || !isAllRequiredAnswered()}
                >
                  {isSubmittingConfirmation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    '確認して登録'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ScanSnapButton;
