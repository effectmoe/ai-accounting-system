'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  History as HistoryIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { RecurringInvoice, RecurringInvoiceStatus, RecurringFrequency } from '@/types/recurring-invoice';

interface RecurringInvoiceDetailProps {
  invoiceId: string;
}

const RecurringInvoiceDetail: React.FC<RecurringInvoiceDetailProps> = ({ invoiceId }) => {
  const router = useRouter();
  const [invoice, setInvoice] = useState<RecurringInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-invoices/${invoiceId}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        setError('定期請求書の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching invoice detail:', error);
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: RecurringInvoiceStatus) => {
    try {
      const response = await fetch(`/api/recurring-invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchInvoiceDetail();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const response = await fetch(`/api/recurring-invoices/${invoiceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchInvoiceDetail();
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const getStatusChip = (status: RecurringInvoiceStatus) => {
    const statusConfig = {
      active: { color: 'success' as const, label: '有効' },
      paused: { color: 'warning' as const, label: '一時停止' },
      completed: { color: 'info' as const, label: '完了' },
      cancelled: { color: 'error' as const, label: 'キャンセル' }
    };

    const config = statusConfig[status];
    return <Chip label={config.label} color={config.color} />;
  };

  const getFrequencyLabel = (frequency: RecurringFrequency) => {
    const labels = {
      monthly: '毎月',
      'bi-monthly': '隔月',
      quarterly: '四半期',
      'semi-annually': '半年',
      annually: '年次',
      custom: 'カスタム'
    };
    return labels[frequency] || frequency;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP');
  };

  const getPaymentMethodLabel = (paymentMethod?: string) => {
    const labels = {
      bank_transfer: '銀行振込',
      credit_card: 'クレジットカード',
      cash: '現金',
      invoice: '請求書払い',
      other: 'その他'
    };
    return labels[paymentMethod as keyof typeof labels] || '-';
  };

  const getPaymentServiceLabel = (service?: string) => {
    const labels = {
      square: 'Square',
      paypal: 'PayPal'
    };
    return labels[service as keyof typeof labels] || service || '-';
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Alert severity="error">
        {error || '定期請求書が見つかりません'}
      </Alert>
    );
  }

  const completionRate = (invoice.completedInstallments / invoice.totalInstallments) * 100;
  const paymentRate = invoice.totalContractAmount > 0 
    ? (invoice.totalPaidAmount / invoice.totalContractAmount) * 100 
    : 0;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/recurring-invoices')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">定期請求書詳細</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {invoice.status === 'active' && (
            <>
              <Button
                variant="contained"
                startIcon={<ReceiptIcon />}
                onClick={handleGenerateInvoice}
              >
                請求書を生成
              </Button>
              <Button
                variant="outlined"
                startIcon={<PauseIcon />}
                onClick={() => handleStatusChange('paused')}
              >
                一時停止
              </Button>
            </>
          )}
          {invoice.status === 'paused' && (
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={() => handleStatusChange('active')}
            >
              再開
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/recurring-invoices/${invoiceId}/edit`)}
          >
            編集
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h6">{invoice.title}</Typography>
                  <Typography color="text.secondary">{invoice.recurringInvoiceNumber}</Typography>
                </Box>
                {getStatusChip(invoice.status)}
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">顧客</Typography>
                  <Typography>{invoice.customer?.companyName || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">頻度</Typography>
                  <Typography>{getFrequencyLabel(invoice.frequency)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">開始日</Typography>
                  <Typography>{formatDate(invoice.startDate)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">終了日</Typography>
                  <Typography>{formatDate(invoice.endDate)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">支払方法</Typography>
                  <Typography>{getPaymentMethodLabel(invoice.paymentMethod)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">支払いサイト</Typography>
                  <Typography>{invoice.paymentTerms}日</Typography>
                </Grid>
                {invoice.paymentMethod === 'credit_card' && invoice.paymentService && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">決済サービス</Typography>
                      <Typography>{getPaymentServiceLabel(invoice.paymentService)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">決済手数料</Typography>
                      <Typography>
                        {((invoice.processingFeeRate || 0) * 100).toFixed(2)}%
                        {invoice.processingFeeFixed ? ` + ¥${invoice.processingFeeFixed}` : ''}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>請求内容</Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>品目</TableCell>
                      <TableCell align="right">数量</TableCell>
                      <TableCell align="right">単価</TableCell>
                      <TableCell align="right">金額</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Typography>小計: {formatCurrency(Math.round(invoice.subtotal))}</Typography>
                <Typography>税額: {formatCurrency(Math.round(invoice.taxAmount))}</Typography>
                <Typography variant="h6">合計: {formatCurrency(invoice.totalAmount)}</Typography>
              </Box>
            </CardContent>
          </Card>

          {(invoice.notes || invoice.internalNotes) && (
            <Card>
              <CardContent>
                {invoice.notes && (
                  <>
                    <Typography variant="h6" gutterBottom>顧客向け備考</Typography>
                    <Typography paragraph>{invoice.notes}</Typography>
                  </>
                )}
                {invoice.internalNotes && (
                  <>
                    <Typography variant="h6" gutterBottom>内部メモ</Typography>
                    <Typography color="text.secondary">{invoice.internalNotes}</Typography>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>進捗状況</Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">回数進捗</Typography>
                  <Typography variant="body2">
                    {invoice.completedInstallments} / {invoice.totalInstallments} 回
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={completionRate}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {completionRate.toFixed(0)}% 完了
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">支払い進捗</Typography>
                  <Typography variant="body2">
                    {formatCurrency(invoice.totalPaidAmount)} / {formatCurrency(invoice.totalContractAmount)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={paymentRate}
                  sx={{ height: 8, borderRadius: 1 }}
                  color="secondary"
                />
                <Typography variant="caption" color="text.secondary">
                  {paymentRate.toFixed(0)}% 支払い済み
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    {invoice.paymentMethod === 'credit_card' && invoice.paymentService ? '請求金額' : '月額'}
                  </Typography>
                  <Typography>{formatCurrency(invoice.monthlyAmount)}</Typography>
                </Grid>
                {invoice.paymentMethod === 'credit_card' && invoice.paymentService && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">実受取額</Typography>
                    <Typography color="primary">
                      {formatCurrency(Math.round(
                        invoice.monthlyAmount - 
                        (invoice.monthlyAmount * (invoice.processingFeeRate || 0) + 
                        (invoice.processingFeeFixed || 0))
                      ))}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">残り回数</Typography>
                  <Typography>{invoice.remainingInstallments} 回</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">請求済み金額</Typography>
                  <Typography>{formatCurrency(invoice.totalInvoicedAmount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">次回請求日</Typography>
                  <Typography>{formatDate(invoice.nextInvoiceDate)}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>関連情報</Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CalendarIcon />}
                  onClick={() => router.push(`/recurring-invoices/${invoiceId}/schedule`)}
                >
                  スケジュール表示
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => router.push(`/recurring-invoices/${invoiceId}/history`)}
                >
                  支払い履歴
                </Button>
              </Box>
            </CardContent>
          </Card>

          {invoice.autoGenerate && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>自動化設定</Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">自動生成</Typography>
                    <Chip label="有効" size="small" color="primary" />
                  </Box>
                  {invoice.autoSend && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">自動送信</Typography>
                      <Chip label="有効" size="small" color="primary" />
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">事前通知</Typography>
                    <Typography variant="body2">{invoice.notifyBeforeDays}日前</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecurringInvoiceDetail;