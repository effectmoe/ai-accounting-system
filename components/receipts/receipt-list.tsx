'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Receipt as ReceiptIcon, Edit, Trash2, Loader2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';
import { logger } from '@/lib/logger';

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

interface Receipt {
  _id: string;
  receiptNumber: string;
  title?: string;
  issueDate: string;
  paidDate?: string;
  customerName: string;
  customer?: {
    companyName?: string;
    name?: string;
  };
  totalAmount: number;
  status: keyof typeof RECEIPT_STATUS_LABELS;
  invoiceNumber?: string;
  invoiceId?: string;
}

interface ReceiptListProps {
  receipts: Receipt[];
  loading?: boolean;
  selectedReceipts: Set<string>;
  onSelectReceipt: (receiptId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onStatusChange: (receiptId: string, newStatus: string) => Promise<void>;
  onDelete: (receiptId: string) => Promise<void>;
  isUpdating?: boolean;
}

export default function ReceiptList({
  receipts,
  loading = false,
  selectedReceipts,
  onSelectReceipt,
  onSelectAll,
  onStatusChange,
  onDelete,
  isUpdating = false
}: ReceiptListProps) {
  const router = useRouter();

  const getStatusBadge = (status: keyof typeof RECEIPT_STATUS_LABELS) => {
    return (
      <Badge className={`${RECEIPT_STATUS_COLORS[status]} border-0`}>
        {RECEIPT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const handleDelete = async (receiptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(receiptId);
  };

  const handleStatusChange = async (receiptId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onStatusChange(receiptId, newStatus);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (receipts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <ReceiptIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">領収書が見つかりません</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReceipts.size === receipts.length && receipts.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>領収書番号</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>請求書番号</TableHead>
              <TableHead>発行日</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt._id} className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedReceipts.has(receipt._id)}
                    onCheckedChange={(checked) =>
                      onSelectReceipt(receipt._id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell
                  className="font-medium"
                  onClick={() => router.push(`/receipts/${receipt._id}`)}
                >
                  <div className="flex items-center gap-2">
                    <ReceiptIcon className="h-4 w-4" />
                    {receipt.receiptNumber}
                  </div>
                </TableCell>
                <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                  {receipt.customerName}
                </TableCell>
                <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                  {receipt.invoiceNumber && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 font-normal"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (receipt.invoiceId) {
                          router.push(`/invoices/${receipt.invoiceId}`);
                        }
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {receipt.invoiceNumber}
                    </Button>
                  )}
                </TableCell>
                <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                  {safeFormatDate(receipt.issueDate, 'yyyy/MM/dd', ja)}
                </TableCell>
                <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                  ¥{receipt.totalAmount.toLocaleString()}
                </TableCell>
                <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                  <Select
                    value={receipt.status}
                    onValueChange={(value) => handleStatusChange(receipt._id, value, {} as React.MouseEvent)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger
                      className="w-28 h-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getStatusBadge(receipt.status)}
                    </SelectTrigger>
                    <SelectContent onClick={(e) => e.stopPropagation()}>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="issued">発行済み</SelectItem>
                      <SelectItem value="sent">送信済み</SelectItem>
                      <SelectItem value="cancelled">キャンセル</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/receipts/${receipt._id}`)}
                      title="詳細を見る"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/receipts/${receipt._id}/edit`)}
                      title="編集"
                      disabled={receipt.status !== 'draft'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(receipt._id, e)}
                      className="text-red-600 hover:text-red-800"
                      title="削除"
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}