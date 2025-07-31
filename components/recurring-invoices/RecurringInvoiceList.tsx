'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Receipt as ReceiptIcon,
  CalendarMonth as CalendarIcon,
  History as HistoryIcon,
  FileDownload as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { RecurringInvoice, RecurringInvoiceStatus, RecurringFrequency } from '@/types/recurring-invoice';

interface RecurringInvoiceListProps {
  onSelectInvoice?: (invoice: RecurringInvoice) => void;
}

const RecurringInvoiceList: React.FC<RecurringInvoiceListProps> = ({ onSelectInvoice }) => {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecurringInvoiceStatus | ''>('');
  const [frequencyFilter, setFrequencyFilter] = useState<RecurringFrequency | ''>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<RecurringInvoice | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'pause' | 'cancel' | 'delete' | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchRecurringInvoices();
  }, [page, rowsPerPage, searchTerm, statusFilter, frequencyFilter]);

  const fetchRecurringInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
        search: searchTerm,
        ...(statusFilter && { status: statusFilter }),
        ...(frequencyFilter && { frequency: frequencyFilter })
      });

      const response = await fetch(`/api/recurring-invoices?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.recurringInvoices);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error('Error fetching recurring invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: RecurringInvoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      const response = await fetch(`/api/recurring-invoices/${selectedInvoice._id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchRecurringInvoices();
        handleMenuClose();
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const handleStatusChange = async (newStatus: RecurringInvoiceStatus) => {
    if (!selectedInvoice) return;

    try {
      const response = await fetch(`/api/recurring-invoices/${selectedInvoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchRecurringInvoices();
        handleMenuClose();
      }
    } catch (error) {
      console.error('Error updating status:', error);
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
    return <Chip label={config.label} color={config.color} size="small" />;
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

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = invoices.map(n => n._id?.toString() || '');
      setSelectedInvoices(newSelected);
      setShowBulkActions(true);
    } else {
      setSelectedInvoices([]);
      setShowBulkActions(false);
    }
  };

  const handleSelectOne = (id: string) => {
    const selectedIndex = selectedInvoices.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedInvoices, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedInvoices.slice(1));
    } else if (selectedIndex === selectedInvoices.length - 1) {
      newSelected = newSelected.concat(selectedInvoices.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedInvoices.slice(0, selectedIndex),
        selectedInvoices.slice(selectedIndex + 1),
      );
    }

    setSelectedInvoices(newSelected);
    setShowBulkActions(newSelected.length > 0);
  };

  const handleBulkAction = (action: 'pause' | 'cancel' | 'delete') => {
    setBulkAction(action);
    setBulkActionDialog(true);
  };

  const executeBulkAction = async () => {
    try {
      if (!bulkAction) return;
      
      const promises = selectedInvoices.map(id => {
        if (bulkAction === 'delete') {
          return fetch(`/api/recurring-invoices/${id}`, { method: 'DELETE' });
        } else {
          const status = bulkAction === 'pause' ? 'paused' : 'cancelled';
          return fetch(`/api/recurring-invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
        }
      });

      await Promise.all(promises);
      
      setSnackbar({
        open: true,
        message: `${selectedInvoices.length}件の定期請求書を${
          bulkAction === 'pause' ? '一時停止' : 
          bulkAction === 'cancel' ? 'キャンセル' : 
          '削除'
        }しました`,
        severity: 'success'
      });
      
      setSelectedInvoices([]);
      setShowBulkActions(false);
      setBulkActionDialog(false);
      fetchRecurringInvoices();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '一括操作中にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/recurring-invoices/export?${new URLSearchParams({
        search: searchTerm,
        status: statusFilter,
        frequency: frequencyFilter
      })}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recurring-invoices-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSnackbar({
          open: true,
          message: 'エクスポートが完了しました',
          severity: 'success'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'エクスポート中にエラーが発生しました',
        severity: 'error'
      });
    }
  };

  const isSelected = (id: string) => selectedInvoices.indexOf(id) !== -1;

  return (
    <Box sx={{ px: 3, py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">定期請求書一覧</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/recurring-invoices/new')}
        >
          新規作成
        </Button>
      </Box>

      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="請求書番号・タイトルで検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1, minWidth: 250 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RecurringInvoiceStatus | '')}
              label="ステータス"
            >
              <MenuItem value="">全て</MenuItem>
              <MenuItem value="active">有効</MenuItem>
              <MenuItem value="paused">一時停止</MenuItem>
              <MenuItem value="completed">完了</MenuItem>
              <MenuItem value="cancelled">キャンセル</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>頻度</InputLabel>
            <Select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value as RecurringFrequency | '')}
              label="頻度"
            >
              <MenuItem value="">全て</MenuItem>
              <MenuItem value="monthly">毎月</MenuItem>
              <MenuItem value="bi-monthly">隔月</MenuItem>
              <MenuItem value="quarterly">四半期</MenuItem>
              <MenuItem value="semi-annually">半年</MenuItem>
              <MenuItem value="annually">年次</MenuItem>
              <MenuItem value="custom">カスタム</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {showBulkActions && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {selectedInvoices.length}件選択中
            </Typography>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => handleBulkAction('pause')}
              startIcon={<PauseIcon />}
            >
              一時停止
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleBulkAction('cancel')}
              startIcon={<StopIcon />}
            >
              キャンセル
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleBulkAction('delete')}
              startIcon={<DeleteIcon />}
            >
              削除
            </Button>
          </Box>
        )}
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedInvoices.length > 0 && selectedInvoices.length < invoices.length}
                    checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>請求書番号</TableCell>
                <TableCell>タイトル</TableCell>
                <TableCell>顧客名</TableCell>
                <TableCell>頻度</TableCell>
                <TableCell align="right">月額</TableCell>
                <TableCell align="right">総額</TableCell>
                <TableCell align="center">進捗</TableCell>
                <TableCell>次回請求日</TableCell>
                <TableCell align="center">ステータス</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((invoice) => {
                const invoiceId = invoice._id?.toString() || '';
                const isItemSelected = isSelected(invoiceId);
                
                return (
                  <TableRow 
                    key={invoiceId} 
                    hover
                    onClick={() => handleSelectOne(invoiceId)}
                    selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectOne(invoiceId);
                        }}
                      />
                    </TableCell>
                    <TableCell>{invoice.recurringInvoiceNumber}</TableCell>
                    <TableCell>{invoice.title}</TableCell>
                    <TableCell>{invoice.customer?.companyName || '-'}</TableCell>
                    <TableCell>{getFrequencyLabel(invoice.frequency)}</TableCell>
                    <TableCell align="right">{formatCurrency(invoice.monthlyAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(invoice.totalContractAmount)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={`${invoice.completedInstallments}/${invoice.totalInstallments}回`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 60, 
                          height: 8, 
                          bgcolor: 'grey.300', 
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            width: `${(invoice.completedInstallments / invoice.totalInstallments) * 100}%`,
                            height: '100%',
                            bgcolor: 'primary.main'
                          }} />
                        </Box>
                        <Typography variant="caption">
                          {Math.round((invoice.completedInstallments / invoice.totalInstallments) * 100)}%
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{formatDate(invoice.nextInvoiceDate)}</TableCell>
                  <TableCell align="center">{getStatusChip(invoice.status)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="詳細">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/recurring-invoices/${invoice._id}`);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="編集">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/recurring-invoices/${invoice._id}/edit`);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, invoice);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="text"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ m: 2 }}
          >
            エクスポート
          </Button>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
          />
        </Box>
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedInvoice?.status === 'active' && (
          <MenuItem onClick={handleGenerateInvoice}>
            <ListItemIcon>
              <ReceiptIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>請求書を生成</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => router.push(`/recurring-invoices/${selectedInvoice?._id}/schedule`)}>
          <ListItemIcon>
            <CalendarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>スケジュール</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => router.push(`/recurring-invoices/${selectedInvoice?._id}/history`)}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>支払い履歴</ListItemText>
        </MenuItem>
        {selectedInvoice?.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange('paused')}>
            <ListItemIcon>
              <PauseIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>一時停止</ListItemText>
          </MenuItem>
        )}
        {selectedInvoice?.status === 'paused' && (
          <MenuItem onClick={() => handleStatusChange('active')}>
            <ListItemIcon>
              <PlayIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>再開</ListItemText>
          </MenuItem>
        )}
        {(selectedInvoice?.status === 'active' || selectedInvoice?.status === 'paused') && (
          <MenuItem onClick={() => handleStatusChange('cancelled')}>
            <ListItemIcon>
              <StopIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>キャンセル</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={bulkActionDialog}
        onClose={() => setBulkActionDialog(false)}
      >
        <DialogTitle>
          {bulkAction === 'pause' && '定期請求書の一時停止'}
          {bulkAction === 'cancel' && '定期請求書のキャンセル'}
          {bulkAction === 'delete' && '定期請求書の削除'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            選択した{selectedInvoices.length}件の定期請求書を
            {bulkAction === 'pause' && '一時停止'}
            {bulkAction === 'cancel' && 'キャンセル'}
            {bulkAction === 'delete' && '削除'}
            しますか？
          </Typography>
          {bulkAction === 'delete' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              この操作は取り消せません。関連する請求書がある場合はキャンセル扱いになります。
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={executeBulkAction} 
            color={bulkAction === 'pause' ? 'warning' : 'error'}
            variant="contained"
          >
            {bulkAction === 'pause' && '一時停止'}
            {bulkAction === 'cancel' && 'キャンセル'}
            {bulkAction === 'delete' && '削除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RecurringInvoiceList;