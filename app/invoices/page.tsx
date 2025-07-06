import { redirect } from 'next/navigation';

export default function InvoicesPage() {
  // 書類一覧ページにリダイレクト
  redirect('/documents');
}