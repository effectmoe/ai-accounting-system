'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface PaymentRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount?: number;
    customer?: {
      companyName?: string;
      name?: string;
    };
  };
  onSuccess?: () => void;
}

export function PaymentRecordDialog({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: PaymentRecordDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingPayments, setExistingPayments] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'bank_transfer',
    bankName: '',
    accountName: '',
    referenceNumber: '',
    notes: '',
  });

  // 既存の入金記録を取得
  useEffect(() => {
    if (isOpen && invoice._id) {
      fetchExistingPayments();
    }
  }, [isOpen, invoice._id]);

  const fetchExistingPayments = async () => {
    try {
      const response = await fetch(`/api/payment-records?invoiceId=${invoice._id}`);
      if (response.ok) {
        const data = await response.json();
        setExistingPayments(data.paymentRecords || []);
      }
    } catch (error) {
      logger.error('Error fetching existing payments:', error);
    }
  };

  // 残額を計算
  const calculateRemainingAmount = () => {
    const totalPaid = existingPayments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);
    return invoice.totalAmount - totalPaid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('入金額は正の数値を入力してください');
      }

      const remaining = calculateRemainingAmount();
      if (amount > remaining) {
        throw new Error(`入金額が残額（¥${remaining.toLocaleString()}）を超えています`);
      }

      // 入金記録を作成
      const response = await fetch('/api/payment-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice._id,
          amount,
          paymentDate: new Date(formData.paymentDate),
          paymentMethod: formData.paymentMethod,
          bankName: formData.bankName || undefined,
          accountName: formData.accountName || undefined,
          referenceNumber: formData.referenceNumber || undefined,
          notes: formData.notes || undefined,
          status: 'confirmed', // 即座に確認済みとする
          confirmedBy: 'user',
          confirmedAt: new Date(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '入金記録の作成に失敗しました');
      }

      setSuccess(true);
      
      // 成功メッセージを表示してから閉じる
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // フォームをリセット
        setFormData({
          amount: '',
          paymentDate: format(new Date(), 'yyyy-MM-dd'),
          paymentMethod: 'bank_transfer',
          bankName: '',
          accountName: '',
          referenceNumber: '',
          notes: '',
        });
        setSuccess(false);
      }, 1500);
    } catch (error) {
      logger.error('Error creating payment record:', error);
      setError(error instanceof Error ? error.message : '入金記録の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const remainingAmount = calculateRemainingAmount();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>入金記録の登録</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 請求書情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">請求書番号:</span>
                <span className="ml-2 font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">顧客:</span>
                <span className="ml-2 font-medium">
                  {invoice.customer?.companyName || invoice.customer?.name || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">請求額:</span>
                <span className="ml-2 font-medium">¥{invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">残額:</span>
                <span className="ml-2 font-medium text-red-600">
                  ¥{remainingAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 既存の入金記録 */}
          {existingPayments.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">入金履歴</h4>
              <div className="space-y-1">
                {existingPayments.map((payment, index) => (
                  <div key={payment._id || index} className="text-sm flex justify-between">
                    <span>
                      {format(new Date(payment.paymentDate), 'yyyy/MM/dd', { locale: ja })}
                    </span>
                    <span className={payment.status === 'cancelled' ? 'line-through text-gray-400' : ''}>
                      ¥{payment.amount.toLocaleString()}
                      {payment.status === 'pending' && ' (未確認)'}
                      {payment.status === 'cancelled' && ' (取消)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                入金記録を登録しました
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">入金額 *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder={`最大: ¥${remainingAmount.toLocaleString()}`}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">入金日 *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">入金方法 *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">銀行振込</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="credit_card">クレジットカード</SelectItem>
                  <SelectItem value="check">小切手</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.paymentMethod === 'bank_transfer' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">振込元銀行名</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="例: みずほ銀行"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">振込元口座名義</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      placeholder="例: カブシキガイシャ〇〇"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">振込参照番号</Label>
                  <Input
                    id="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="例: 123456789"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">備考</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="メモや備考があれば入力してください"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isLoading || success}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                入金を記録
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}