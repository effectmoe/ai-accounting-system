import { redirect } from 'next/navigation';

export default function TransactionsPage() {
  // 仕訳帳ページにリダイレクト
  redirect('/journal');
}