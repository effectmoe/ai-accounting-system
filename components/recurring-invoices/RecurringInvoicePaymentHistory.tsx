'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Grid,
  Paper,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { RecurringInvoicePaymentHistory as PaymentHistoryType } from '@/types/recurring-invoice';

interface RecurringInvoicePaymentHistoryProps {
  invoiceId: string;
}

interface PaymentSummary {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  totalPaidAmount: number;
  paymentRate: number;
}

const RecurringInvoicePaymentHistory: React.FC<RecurringInvoicePaymentHistoryProps> = ({ invoiceId }) => {
  const router = useRouter();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryType[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentHistory();
  }, [invoiceId]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-invoices/${invoiceId}/payment-history`);
      
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.paymentHistory);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      paid: { 
        icon: <CheckCircleIcon fontSize="small" />, 
        label: '支払済み', 
        color: 'success' as const 
      },
      unpaid: { 
        icon: <AccessTimeIcon fontSize="small" />, 
        label: '未払い', 
        color: 'default' as const 
      },
      overdue: { 
        icon: <WarningIcon fontSize="small" />, 
        label: '期限超過', 
        color: 'error' as const 
      },
      partial: { 
        icon: <TrendingUpIcon fontSize="small" />, 
        label: '一部支払い', 
        color: 'warning' as const 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return (
      <Chip 
        icon={config.icon}
        label={config.label} 
        color={config.color} 
        size="small" 
      />
    );
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

  const getDaysOverdue = (dueDate: Date | string, paidDate?: Date | string) => {
    const due = new Date(dueDate);
    const comparison = paidDate ? new Date(paidDate) : new Date();
    const diffTime = comparison.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => router.push(`/recurring-invoices/${invoiceId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">支払い履歴</Typography>
      </Box>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {summary.totalInvoices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総請求書数
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {summary.paidInvoices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                支払済み
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {summary.unpaidInvoices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                未払い
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {summary.overdueInvoices}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                期限超過
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  支払い進捗
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={summary.paymentRate}
                      sx={{ height: 10, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="h6">
                    {summary.paymentRate.toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    支払済み: {formatCurrency(summary.totalPaidAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    総額: {formatCurrency(summary.totalAmount)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  残高
                </Typography>
                <Typography variant="h4">
                  {formatCurrency(summary.totalAmount - summary.totalPaidAmount)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">回数</TableCell>
                  <TableCell>請求書番号</TableCell>
                  <TableCell>支払期限</TableCell>
                  <TableCell align="right">請求額</TableCell>
                  <TableCell align="right">支払額</TableCell>
                  <TableCell>支払日</TableCell>
                  <TableCell align="center">ステータス</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentHistory.map((history) => {
                  const daysOverdue = history.status === 'overdue' ? 
                    getDaysOverdue(history.dueDate, history.paidDate) : 0;
                  
                  return (
                    <TableRow key={history._id?.toString()}>
                      <TableCell align="center">
                        <Typography variant="h6">
                          {history.installmentNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {history.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {formatDate(history.dueDate)}
                          {daysOverdue > 0 && (
                            <Tooltip title={`${daysOverdue}日超過`}>
                              <Typography variant="caption" color="error">
                                ({daysOverdue}日)
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(history.amount)}
                      </TableCell>
                      <TableCell align="right">
                        {history.paidAmount > 0 ? (
                          <Typography color={history.paidAmount < history.amount ? 'warning.main' : 'inherit'}>
                            {formatCurrency(history.paidAmount)}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {formatDate(history.paidDate)}
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(history.status)}
                      </TableCell>
                      <TableCell align="center">
                        {history.invoiceId && (
                          <Tooltip title="請求書を表示">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/invoices/${history.invoiceId}`)}
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {paymentHistory.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                支払い履歴がありません
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RecurringInvoicePaymentHistory;