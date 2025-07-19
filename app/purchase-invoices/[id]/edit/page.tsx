'use client';

import { redirect } from 'next/navigation';

export default function PurchaseInvoiceEditPage({ params }: { params: { id: string } }) {
  // 現時点では編集機能は未実装のため、詳細画面にリダイレクト
  redirect(`/purchase-invoices/${params.id}`);
}