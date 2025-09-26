'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt as ReceiptIcon, Building2, User, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';

// 領収書ステータスのマッピング
const RECEIPT_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル'
} as const;

const RECEIPT_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

interface ReceiptItem {
  itemName?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  taxType?: 'taxable' | 'non-taxable' | 'tax-exempt';
}

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
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  status: keyof typeof RECEIPT_STATUS_LABELS;
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

interface ReceiptDetailProps {
  receipt: Receipt;
  className?: string;
}

export default function ReceiptDetail({ receipt, className = '' }: ReceiptDetailProps) {
  const getStatusBadge = (status: keyof typeof RECEIPT_STATUS_LABELS) => (
    <Badge className={`${RECEIPT_STATUS_COLORS[status]} border-0`}>
      {RECEIPT_STATUS_LABELS[status]}
    </Badge>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5" />
            領収書情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">領収書番号</label>
              <p className="font-mono text-sm mt-1">{receipt.receiptNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ステータス</label>
              <div className="mt-1">{getStatusBadge(receipt.status)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">発行日</label>
              <p className="text-sm mt-1">
                {safeFormatDate(receipt.issueDate, 'yyyy年MM月dd日', ja)}
              </p>
            </div>
            {receipt.paidDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">支払日</label>
                <p className="text-sm mt-1">
                  {safeFormatDate(receipt.paidDate, 'yyyy年MM月dd日', ja)}
                </p>
              </div>
            )}
          </div>

          {receipt.subject && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">但し書き</label>
              <p className="text-sm mt-1">{receipt.subject}</p>
            </div>
          )}

          {receipt.title && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">件名</label>
              <p className="text-sm mt-1">{receipt.title}</p>
            </div>
          )}

          {receipt.notes && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">備考</label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{receipt.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 関連請求書情報 */}
      {receipt.invoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              関連請求書
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{receipt.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">
                  金額: ¥{receipt.invoice.totalAmount.toLocaleString()}
                </p>
              </div>
              <Badge variant="outline">{receipt.invoice.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 当事者情報 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 宛先情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              宛先情報
            </CardTitle>
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
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              発行者情報
            </CardTitle>
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
      </div>

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

      {/* メール送信履歴 */}
      {receipt.emailSentAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              送信履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span className="text-sm font-medium">送信済み</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {safeFormatDate(receipt.emailSentAt, 'yyyy年MM月dd日 HH:mm', ja)}
              </p>
              {receipt.emailSentTo && receipt.emailSentTo.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">送信先: </span>
                  <span>{receipt.emailSentTo.join(', ')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}