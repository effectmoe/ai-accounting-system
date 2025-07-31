import RecurringInvoiceSchedule from '@/components/recurring-invoices/RecurringInvoiceSchedule';

export default function RecurringInvoiceSchedulePage({ params }: { params: { id: string } }) {
  return <RecurringInvoiceSchedule invoiceId={params.id} />;
}