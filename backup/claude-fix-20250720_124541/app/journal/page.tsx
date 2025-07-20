'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function JournalPage() {
  const router = useRouter();

  useEffect(() => {
    // 仕訳帳機能は実装予定。現在はホームにリダイレクト
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">仕訳帳</h1>
        <p className="text-gray-600">この機能は現在開発中です。</p>
      </div>
    </div>
  );
}