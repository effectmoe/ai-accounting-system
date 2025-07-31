'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import RecurringInvoiceForm from '@/components/recurring-invoices/RecurringInvoiceForm';
import { RecurringInvoice } from '@/types/recurring-invoice';
import { Box, LinearProgress, Alert } from '@mui/material';

export default function EditRecurringInvoicePage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<RecurringInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/recurring-invoices/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setInvoice(data);
        } else {
          setError('定期請求書の取得に失敗しました');
        }
      } catch (err) {
        setError('エラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [params.id]);

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

  return <RecurringInvoiceForm invoice={invoice} isEdit />;
}