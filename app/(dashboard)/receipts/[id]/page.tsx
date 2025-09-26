'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Download,
  Send,
  Edit,
  Trash2,
  Receipt as ReceiptIcon,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';

interface Receipt {
  _id: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  title?: string;
  issueDate: string | Date;
  paidDate?: string | Date;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerSnapshot?: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    contactName?: string;
  };
  companySnapshot: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
  };
  items: Array<{
    itemName?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    taxType?: 'taxable' | 'non-taxable' | 'tax-exempt';
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  subject?: string;
  notes?: string;
  issuerStamp?: string;
  emailSentAt?: string;
  emailSentTo?: string[];
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  invoice?: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [params.id]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receipts/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/receipts');
          return;
        }
        throw new Error('Failed to fetch receipt');
      }

      const data = await response.json();
      setReceipt(data);
    } catch (error) {
      logger.error('Error fetching receipt:', error);
      alert('領収書の取得に失敗しました');
      router.push('/receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!receipt) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedReceipt = await response.json();
        setReceipt(updatedReceipt);
        logger.info(`Receipt status changed to ${newStatus}`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      logger.error('Error updating receipt status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;

    if (!confirm(`領収書 ${receipt.receiptNumber} を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        logger.info('Receipt deleted successfully');
        router.push('/receipts');
      } else {
        throw new Error('Failed to delete receipt');
      }
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      alert('領収書の削除に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">領収書が見つかりません</h2>
          <Button onClick={() => router.push('/receipts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            領収書一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => (
    <Badge className={`${statusColors[status]} border-0`}>
      {statusLabels[status]}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/receipts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            領収書一覧に戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ReceiptIcon className="h-8 w-8" />
              領収書 {receipt.receiptNumber}
            </h1>
            <p className="text-muted-foreground">
              発行日: {safeFormatDate(receipt.issueDate, 'yyyy年MM月dd日', ja)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(receipt.status)}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/receipts/${params.id}/edit`)}
          disabled={updating}
        >
          <Edit className="h-4 w-4 mr-2" />
          編集
        </Button>

        {receipt.status === 'draft' && (
          <Button
            onClick={() => handleStatusChange('issued')}
            disabled={updating}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            発行
          </Button>
        )}

        {receipt.status === 'issued' && (
          <Button
            onClick={() => handleStatusChange('sent')}
            disabled={updating}
          >
            <Send className="h-4 w-4 mr-2" />
            送信済みにする
          </Button>
        )}

        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          PDF出力
        </Button>

        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={updating}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </Button>
      </div>

      {/* 関連請求書 */}
      {receipt.invoice && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              この領収書は請求書
              <Button
                variant="link"
                className="h-auto p-1 text-blue-600"
                onClick={() => router.push(`/invoices/${receipt.invoiceId}`)}
              >
                {receipt.invoiceNumber}
              </Button>
               から作成されました
            </span>
            <Badge variant="outline">
              ¥{receipt.invoice.totalAmount.toLocaleString()}
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">領収書番号</label>
                  <p className="font-mono">{receipt.receiptNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                  <div>{getStatusBadge(receipt.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">発行日</label>
                  <p>{safeFormatDate(receipt.issueDate, 'yyyy年MM月dd日', ja)}</p>
                </div>
                {receipt.paidDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">支払日</label>
                    <p>{safeFormatDate(receipt.paidDate, 'yyyy年MM月dd日', ja)}</p>
                  </div>
                )}
              </div>

              {receipt.subject && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">但し書き</label>
                  <p>{receipt.subject}</p>
                </div>
              )}

              {receipt.title && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">件名</label>
                  <p>{receipt.title}</p>
                </div>
              )}

              {receipt.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">備考</label>
                  <p className="whitespace-pre-wrap">{receipt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader>
              <CardTitle>明細</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>項目名</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.itemName || item.description}</div>
                          {item.itemName && item.description && item.itemName !== item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit || '個'}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{item.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              {/* 合計金額 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span>¥{receipt.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消費税 ({Math.round(receipt.taxRate * 100)}%)</span>
                  <span>¥{receipt.taxAmount.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>合計金額</span>
                  <span>¥{receipt.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <CardTitle>宛先情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">宛名</label>
                <p className="font-medium">{receipt.customerName}</p>
              </div>
              {receipt.customerSnapshot && (
                <>
                  {receipt.customerSnapshot.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">住所</label>
                      <p className="text-sm">{receipt.customerSnapshot.address}</p>
                    </div>
                  )}
                  {receipt.customerSnapshot.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                      <p className="text-sm">{receipt.customerSnapshot.phone}</p>
                    </div>
                  )}
                  {receipt.customerSnapshot.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">メールアドレス</label>
                      <p className="text-sm">{receipt.customerSnapshot.email}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 発行者情報 */}
          <Card>
            <CardHeader>
              <CardTitle>発行者情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">会社名</label>
                <p className="font-medium">{receipt.companySnapshot.companyName}</p>
              </div>
              {receipt.companySnapshot.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">住所</label>
                  <p className="text-sm">{receipt.companySnapshot.address}</p>
                </div>
              )}
              {receipt.companySnapshot.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                  <p className="text-sm">{receipt.companySnapshot.phone}</p>
                </div>
              )}
              {receipt.companySnapshot.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">メールアドレス</label>
                  <p className="text-sm">{receipt.companySnapshot.email}</p>
                </div>
              )}
              {receipt.companySnapshot.registrationNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">登録番号</label>
                  <p className="text-sm font-mono">{receipt.companySnapshot.registrationNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* メール送信履歴 */}
          {receipt.emailSentAt && (
            <Card>
              <CardHeader>
                <CardTitle>送信履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">送信済み</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {safeFormatDate(receipt.emailSentAt, 'yyyy/MM/dd HH:mm', ja)}
                  </p>
                  {receipt.emailSentTo && receipt.emailSentTo.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">送信先: </span>
                      {receipt.emailSentTo.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}