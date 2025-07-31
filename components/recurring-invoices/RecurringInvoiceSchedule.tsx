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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
  Alert
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { ja } from 'date-fns/locale';
import { RecurringInvoice, RecurringInvoiceSchedule as ScheduleType } from '@/types/recurring-invoice';

interface RecurringInvoiceScheduleProps {
  invoiceId: string;
}

const RecurringInvoiceSchedule: React.FC<RecurringInvoiceScheduleProps> = ({ invoiceId }) => {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleType[]>([]);
  const [recurringInvoice, setRecurringInvoice] = useState<Partial<RecurringInvoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType | null>(null);
  const [editData, setEditData] = useState({
    customDate: null as Date | null,
    customAmount: 0,
    notes: ''
  });

  useEffect(() => {
    fetchSchedule();
  }, [invoiceId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-invoices/${invoiceId}/schedule`);
      
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules);
        setRecurringInvoice(data.recurringInvoice);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (schedule: ScheduleType) => {
    if (!schedule.isEditable) return;
    
    setSelectedSchedule(schedule);
    setEditData({
      customDate: schedule.customDate ? new Date(schedule.customDate) : null,
      customAmount: schedule.customAmount || schedule.amount,
      notes: schedule.notes || ''
    });
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!selectedSchedule) return;

    try {
      const response = await fetch(`/api/recurring-invoices/${invoiceId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentNumber: selectedSchedule.installmentNumber,
          customDate: editData.customDate,
          customAmount: editData.customAmount,
          notes: editData.notes
        })
      });

      if (response.ok) {
        fetchSchedule();
        setEditDialog(false);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleGenerateInvoice = async (schedule: ScheduleType) => {
    try {
      const response = await fetch(`/api/recurring-invoices/${invoiceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceDate: schedule.customDate || schedule.scheduledDate,
          customAmount: schedule.customAmount
        })
      });

      if (response.ok) {
        fetchSchedule();
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const getStatusChip = (status: 'pending' | 'generated' | 'completed') => {
    const statusConfig = {
      pending: { icon: <ScheduleIcon fontSize="small" />, label: '予定', color: 'default' as const },
      generated: { icon: <ReceiptIcon fontSize="small" />, label: '生成済み', color: 'primary' as const },
      completed: { icon: <CheckCircleIcon fontSize="small" />, label: '完了', color: 'success' as const }
    };

    const config = statusConfig[status];
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

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP');
  };

  const isOverdue = (schedule: ScheduleType) => {
    if (schedule.status !== 'pending') return false;
    const scheduledDate = new Date(schedule.scheduledDate);
    return scheduledDate < new Date();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push(`/recurring-invoices/${invoiceId}`)}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5">定期請求スケジュール</Typography>
            {recurringInvoice && (
              <Typography color="text.secondary">
                {recurringInvoice.recurringInvoiceNumber} - {recurringInvoice.title}
              </Typography>
            )}
          </Box>
        </Box>

        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">回数</TableCell>
                    <TableCell>予定日</TableCell>
                    <TableCell>実際の日付</TableCell>
                    <TableCell align="right">金額</TableCell>
                    <TableCell align="center">ステータス</TableCell>
                    <TableCell>備考</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow 
                      key={schedule.installmentNumber}
                      sx={{ 
                        bgcolor: isOverdue(schedule) ? 'error.light' : 'inherit',
                        opacity: isOverdue(schedule) ? 0.9 : 1
                      }}
                    >
                      <TableCell align="center">
                        <Typography variant="h6">
                          {schedule.installmentNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {formatDate(schedule.scheduledDate)}
                          {isOverdue(schedule) && (
                            <Tooltip title="期限超過">
                              <WarningIcon color="error" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {schedule.customDate ? (
                          <Chip 
                            label={formatDate(schedule.customDate)} 
                            size="small" 
                            variant="outlined"
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {schedule.customAmount ? (
                          <Box>
                            <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                              {formatCurrency(schedule.amount)}
                            </Typography>
                            <Typography color="primary">
                              {formatCurrency(schedule.customAmount)}
                            </Typography>
                          </Box>
                        ) : (
                          formatCurrency(schedule.amount)
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(schedule.status)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {schedule.notes || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {schedule.isEditable && (
                            <Tooltip title="編集">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(schedule)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {schedule.status === 'pending' && recurringInvoice?.status === 'active' && (
                            <Tooltip title="請求書を生成">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleGenerateInvoice(schedule)}
                              >
                                <ReceiptIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {schedule.invoiceId && (
                            <Tooltip title="請求書を表示">
                              <IconButton
                                size="small"
                                onClick={() => router.push(`/invoices/${schedule.invoiceId}`)}
                              >
                                <ReceiptIcon fontSize="small" color="primary" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {schedules.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  スケジュールがありません
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            スケジュール編集（第{selectedSchedule?.installmentNumber}回）
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <DatePicker
                label="カスタム日付"
                value={editData.customDate}
                onChange={(newValue) => setEditData({ ...editData, customDate: newValue })}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    helperText: '通常の予定日と異なる場合に設定'
                  } 
                }}
              />
              
              <TextField
                fullWidth
                type="number"
                label="カスタム金額"
                value={editData.customAmount}
                onChange={(e) => setEditData({ ...editData, customAmount: parseInt(e.target.value) || 0 })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>
                }}
                helperText="通常の金額と異なる場合に設定"
              />
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="備考"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />

              {selectedSchedule && (
                <Alert severity="info">
                  元の予定: {formatDate(selectedSchedule.scheduledDate)} / {formatCurrency(selectedSchedule.amount)}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleEditSave} variant="contained">
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default RecurringInvoiceSchedule;