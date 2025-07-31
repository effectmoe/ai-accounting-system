'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Typography,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Alert,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { ja } from 'date-fns/locale';
import { RecurringInvoice, RecurringFrequency } from '@/types/recurring-invoice';
import { Customer, PaymentMethod } from '@/types/collections';

interface RecurringInvoiceFormProps {
  invoice?: RecurringInvoice;
  isEdit?: boolean;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const RecurringInvoiceForm: React.FC<RecurringInvoiceFormProps> = ({ invoice, isEdit = false }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    frequency: 'monthly' as RecurringFrequency,
    customFrequencyDays: 30,
    totalContractAmount: 0,
    monthlyAmount: 0,
    totalInstallments: 12,
    startDate: new Date(),
    paymentMethod: 'bank_transfer' as PaymentMethod,
    paymentTerms: 30,
    bankAccountId: '',
    paymentService: undefined as 'square' | 'paypal' | undefined,
    processingFeeRate: 0.0325, // Square: 3.25%, PayPal: 3.6%
    processingFeeFixed: 0, // PayPal: 40円
    notes: '',
    internalNotes: '',
    autoGenerate: false,
    autoSend: false,
    notifyBeforeDays: 3,
    taxRate: 0.1
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 }
  ]);

  useEffect(() => {
    fetchCustomers();
    if (invoice && isEdit) {
      loadInvoiceData(invoice);
    }
  }, [invoice, isEdit]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=100');
      const data = await response.json();
      if (response.ok) {
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const loadInvoiceData = (invoice: RecurringInvoice) => {
    setFormData({
      title: invoice.title,
      customerId: invoice.customerId.toString(),
      frequency: invoice.frequency,
      customFrequencyDays: invoice.customFrequencyDays || 30,
      totalContractAmount: invoice.totalContractAmount,
      monthlyAmount: invoice.monthlyAmount,
      totalInstallments: invoice.totalInstallments,
      startDate: new Date(invoice.startDate),
      paymentMethod: invoice.paymentMethod || 'bank_transfer',
      paymentTerms: invoice.paymentTerms || 30,
      bankAccountId: invoice.bankAccountId?.toString() || '',
      paymentService: invoice.paymentService,
      processingFeeRate: invoice.processingFeeRate || 0.0325,
      processingFeeFixed: invoice.processingFeeFixed || 0,
      notes: invoice.notes || '',
      internalNotes: invoice.internalNotes || '',
      autoGenerate: invoice.autoGenerate,
      autoSend: invoice.autoSend,
      notifyBeforeDays: invoice.notifyBeforeDays || 3,
      taxRate: invoice.taxRate
    });

    setItems(invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice
    })));

    const customer = customers.find(c => c._id?.toString() === invoice.customerId.toString());
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = subtotal * formData.taxRate;
      const totalAmount = subtotal + taxAmount;

      const payload = {
        ...formData,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        subtotal,
        taxAmount,
        totalAmount
      };

      const url = isEdit ? `/api/recurring-invoices/${invoice?._id}` : '/api/recurring-invoices';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        router.push('/recurring-invoices');
      } else {
        const data = await response.json();
        setError(data.error || 'エラーが発生しました');
      }
    } catch (error) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
    
    // 月額の自動計算
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    const monthlyAmount = subtotal + (subtotal * formData.taxRate);
    setFormData(prev => ({ ...prev, monthlyAmount }));
  };

  const calculateEndDate = () => {
    const startDate = new Date(formData.startDate);
    let endDate = new Date(startDate);

    switch (formData.frequency) {
      case 'monthly':
        // 例: 2025/8/1から12回の場合 -> 2026/7/1 (最終回の支払い日)
        endDate.setMonth(endDate.getMonth() + formData.totalInstallments - 1);
        break;
      case 'bi-monthly':
        endDate.setMonth(endDate.getMonth() + (formData.totalInstallments * 2) - 2);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + (formData.totalInstallments * 3) - 3);
        break;
      case 'semi-annually':
        endDate.setMonth(endDate.getMonth() + (formData.totalInstallments * 6) - 6);
        break;
      case 'annually':
        endDate.setFullYear(endDate.getFullYear() + formData.totalInstallments - 1);
        break;
      case 'custom':
        const totalDays = (formData.totalInstallments - 1) * formData.customFrequencyDays;
        endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
        break;
    }

    return endDate;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>
        {!isEdit && (
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/recurring-invoices/new')}
            >
              ← 作成方法選択に戻る
            </Button>
          </Box>
        )}
        
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {isEdit ? '定期請求書の編集' : 'フォームで手動作成'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isEdit ? '定期請求書の詳細を編集できます' : '詳細な設定が可能な定期請求書を作成'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>基本情報</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="タイトル"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Autocomplete
                      options={customers}
                      getOptionLabel={(option) => option.companyName}
                      value={selectedCustomer}
                      onChange={(_, newValue) => {
                        setSelectedCustomer(newValue);
                        setFormData({ ...formData, customerId: newValue?._id?.toString() || '' });
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="顧客" required />
                      )}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>請求内容</Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>品目</TableCell>
                        <TableCell align="right" width={100}>数量</TableCell>
                        <TableCell align="right" width={150}>単価</TableCell>
                        <TableCell align="right" width={150}>金額</TableCell>
                        <TableCell width={50}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              inputProps={{ min: 1 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseInt(e.target.value) || 0)}
                              InputProps={{
                                startAdornment: <InputAdornment position="start">¥</InputAdornment>
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                              disabled={items.length === 1}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddItem}
                  sx={{ mt: 1 }}
                >
                  品目を追加
                </Button>

                <Divider sx={{ my: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>消費税率</InputLabel>
                      <Select
                        value={formData.taxRate}
                        onChange={(e) => {
                          const newTaxRate = Number(e.target.value);
                          setFormData({ ...formData, taxRate: newTaxRate });
                          // 月額の再計算
                          const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
                          const monthlyAmount = subtotal + (subtotal * newTaxRate);
                          setFormData(prev => ({ ...prev, taxRate: newTaxRate, monthlyAmount }));
                        }}
                        label="消費税率"
                      >
                        <MenuItem value={0}>非課税 (0%)</MenuItem>
                        <MenuItem value={0.08}>軽減税率 (8%)</MenuItem>
                        <MenuItem value={0.1}>標準税率 (10%)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Typography>
                    小計: {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}
                  </Typography>
                  <Typography>
                    税額 ({(formData.taxRate * 100).toFixed(0)}%): 
                    {formatCurrency(items.reduce((sum, item) => sum + item.amount, 0) * formData.taxRate)}
                  </Typography>
                  <Typography variant="h6">
                    合計: {formatCurrency(formData.monthlyAmount)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>定期請求設定</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>支払いサイクル</InputLabel>
                      <Select
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as RecurringFrequency })}
                        label="支払いサイクル"
                      >
                        <MenuItem value="monthly">毎月</MenuItem>
                        <MenuItem value="bi-monthly">隔月</MenuItem>
                        <MenuItem value="quarterly">四半期</MenuItem>
                        <MenuItem value="semi-annually">半年</MenuItem>
                        <MenuItem value="annually">年次</MenuItem>
                        <MenuItem value="custom">カスタム</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.frequency === 'custom' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="カスタム日数"
                        value={formData.customFrequencyDays}
                        onChange={(e) => setFormData({ ...formData, customFrequencyDays: parseInt(e.target.value) || 30 })}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">日ごと</InputAdornment>
                        }}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="総回数"
                      value={formData.totalInstallments}
                      onChange={(e) => setFormData({ ...formData, totalInstallments: parseInt(e.target.value) || 1 })}
                      inputProps={{ min: 1 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">回</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="総契約金額"
                      value={formData.totalContractAmount}
                      onChange={(e) => setFormData({ ...formData, totalContractAmount: parseInt(e.target.value) || 0 })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">¥</InputAdornment>
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <DatePicker
                      label="開始日"
                      value={formData.startDate}
                      onChange={(newValue) => setFormData({ ...formData, startDate: newValue || new Date() })}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="終了予定日"
                      value={calculateEndDate().toLocaleDateString('ja-JP')}
                      disabled
                      helperText="開始日と総回数から自動計算されます"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>支払い設定</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>支払方法</InputLabel>
                      <Select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                        label="支払方法"
                      >
                        <MenuItem value="bank_transfer">銀行振込</MenuItem>
                        <MenuItem value="credit_card">クレジットカード</MenuItem>
                        <MenuItem value="cash">現金</MenuItem>
                        <MenuItem value="invoice">請求書払い</MenuItem>
                        <MenuItem value="other">その他</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="number"
                      label="支払いサイト"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: parseInt(e.target.value) || 30 })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">日</InputAdornment>
                      }}
                      helperText="請求書発行日から支払い期限までの日数"
                    />
                  </Grid>
                  
                  {formData.paymentMethod === 'credit_card' && (
                    <>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>決済サービス</InputLabel>
                          <Select
                            value={formData.paymentService || ''}
                            onChange={(e) => {
                              const service = e.target.value as 'square' | 'paypal' | '';
                              let feeRate = 0.0325; // Square default
                              let feeFixed = 0;
                              
                              if (service === 'paypal') {
                                feeRate = 0.036; // PayPal 3.6%
                                feeFixed = 40; // PayPal 40円
                              }
                              
                              setFormData({ 
                                ...formData, 
                                paymentService: service || undefined,
                                processingFeeRate: feeRate,
                                processingFeeFixed: feeFixed
                              });
                            }}
                            label="決済サービス"
                          >
                            <MenuItem value="">選択してください</MenuItem>
                            <MenuItem value="square">Square</MenuItem>
                            <MenuItem value="paypal">PayPal</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="決済手数料率"
                          value={(formData.processingFeeRate * 100).toFixed(2)}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            processingFeeRate: parseFloat(e.target.value) / 100 || 0 
                          })}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>
                          }}
                          helperText="例: Square 3.25%, PayPal 3.6%"
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="固定手数料"
                          value={formData.processingFeeFixed}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            processingFeeFixed: parseInt(e.target.value) || 0 
                          })}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">¥</InputAdornment>
                          }}
                          helperText="例: PayPal 40円"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Alert severity="info">
                          <Typography variant="body2">
                            <strong>手数料計算:</strong><br/>
                            請求金額: {formatCurrency(formData.monthlyAmount)}<br/>
                            手数料: {formatCurrency(Math.round(formData.monthlyAmount * formData.processingFeeRate + formData.processingFeeFixed))}<br/>
                            <strong>受取金額: {formatCurrency(Math.round(formData.monthlyAmount - (formData.monthlyAmount * formData.processingFeeRate + formData.processingFeeFixed)))}</strong>
                          </Typography>
                        </Alert>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>自動化設定</Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.autoGenerate}
                      onChange={(e) => setFormData({ ...formData, autoGenerate: e.target.checked })}
                    />
                  }
                  label="請求書を自動生成"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  指定した日数前に請求書が自動的に作成されます
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.autoSend}
                      onChange={(e) => setFormData({ ...formData, autoSend: e.target.checked })}
                      disabled={!formData.autoGenerate}
                    />
                  }
                  label="請求書を自動送信"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  請求書が作成された際に顧客に自動でメール送信されます
                </Typography>
                
                {formData.autoGenerate && (
                  <Box>
                    <TextField
                      fullWidth
                      type="number"
                      label="事前生成日数"
                      value={formData.notifyBeforeDays}
                      onChange={(e) => setFormData({ ...formData, notifyBeforeDays: parseInt(e.target.value) || 3 })}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">日前</InputAdornment>
                      }}
                      helperText="請求予定日の何日前に請求書を生成するか指定"
                      sx={{ mt: 2 }}
                    />
                    
                    <Alert severity="info" sx={{ mt: 2 }}>
                      例：毎月25日が請求予定日で3日前に設定した場合、毎月22日に請求書が自動生成されます
                    </Alert>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>備考</Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="顧客向け備考"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="内部メモ"
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6, mb: 10, display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<CancelIcon />}
            onClick={() => router.push('/recurring-invoices')}
            sx={{ minWidth: 120 }}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {isEdit ? '更新' : '作成'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default RecurringInvoiceForm;