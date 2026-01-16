'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';
import { ConfirmationQuestion } from '@/lib/confirmation-config';

export interface DocumentConfirmation {
  id: string;
  vendorName: string;
  totalAmount: number;
  documentDate?: string;
  pendingCategory?: string;
  confirmationQuestions: ConfirmationQuestion[];
  confirmationReasons: string[];
}

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentConfirmation | null;
  onConfirm: (documentId: string, answers: Array<{ questionId: string; answer: string; resultCategory?: string }>) => Promise<void>;
  onSkip: (documentId: string) => Promise<void>;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  document,
  onConfirm,
  onSkip,
}: ConfirmationDialogProps) {
  const [answers, setAnswers] = useState<Record<string, { answer: string; resultCategory?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  if (!document) return null;

  const handleAnswerChange = (questionId: string, answer: string, resultCategory?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { answer, resultCategory },
    }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        answer: value.answer,
        resultCategory: value.resultCategory,
      }));
      await onConfirm(document.id, answerArray);
      setAnswers({});
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await onSkip(document.id);
      setAnswers({});
      onOpenChange(false);
    } catch (error) {
      console.error('Skip error:', error);
    } finally {
      setIsSkipping(false);
    }
  };

  const allQuestionsAnswered = document.confirmationQuestions.every(
    (q) => !q.required || answers[q.id]?.answer
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            勘定科目の確認が必要です
          </DialogTitle>
          <DialogDescription>
            以下の取引について、正確な勘定科目を選択してください。
          </DialogDescription>
        </DialogHeader>

        {/* 取引情報の表示 */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">取引先</span>
            <span className="font-medium">{document.vendorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">金額</span>
            <span className="font-medium">¥{document.totalAmount.toLocaleString()}</span>
          </div>
          {document.documentDate && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">日付</span>
              <span className="font-medium">{document.documentDate}</span>
            </div>
          )}
          {document.pendingCategory && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">AI推定</span>
              <span className="font-medium text-amber-600">{document.pendingCategory}</span>
            </div>
          )}
        </div>

        {/* 確認理由の表示 */}
        {document.confirmationReasons.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">確認が必要な理由：</p>
                <ul className="mt-1 list-disc list-inside text-amber-700 dark:text-amber-300">
                  {document.confirmationReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 質問フォーム */}
        <div className="space-y-6">
          {document.confirmationQuestions.map((question) => (
            <div key={question.id} className="space-y-3">
              <Label className="text-base font-medium">
                {question.question}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {question.context && (
                <p className="text-sm text-muted-foreground">{question.context}</p>
              )}

              {question.type === 'single_choice' && question.options && (
                <RadioGroup
                  value={answers[question.id]?.answer || ''}
                  onValueChange={(value) => {
                    const option = question.options?.find((o) => o.value === value);
                    handleAnswerChange(question.id, value, option?.resultCategory);
                  }}
                  className="space-y-2"
                >
                  {question.options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
                      <Label
                        htmlFor={`${question.id}-${option.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {option.label}
                        {option.resultCategory && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            → {option.resultCategory}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === 'yes_no' && question.options && (
                <div className="flex gap-3">
                  {question.options.map((option) => (
                    <Button
                      key={option.value}
                      variant={answers[question.id]?.answer === option.value ? 'default' : 'outline'}
                      onClick={() => handleAnswerChange(question.id, option.value, option.resultCategory)}
                      className="flex-1"
                    >
                      {answers[question.id]?.answer === option.value && (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}

              {question.type === 'text_input' && (
                <Textarea
                  placeholder="詳細を入力..."
                  value={answers[question.id]?.answer || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="min-h-[80px]"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={isSkipping || isSubmitting}>
            {isSkipping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                スキップ中...
              </>
            ) : (
              'AIの推測を採用してスキップ'
            )}
          </Button>
          <Button onClick={handleConfirm} disabled={!allQuestionsAnswered || isSubmitting || isSkipping}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                確定中...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                勘定科目を確定
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
