import RecurringInvoicePaymentHistory from '@/components/recurring-invoices/RecurringInvoicePaymentHistory';

export default function RecurringInvoicePaymentHistoryPage({ params }: { params: { id: string } }) {
  return <RecurringInvoicePaymentHistory invoiceId={params.id} />;
}