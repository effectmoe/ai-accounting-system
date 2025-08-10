import RecurringInvoiceDetail from '@/components/recurring-invoices/RecurringInvoiceDetail';

export default function RecurringInvoiceDetailPage({ params }: { params: { id: string } }) {
  return <RecurringInvoiceDetail invoiceId={params.id} />;
}