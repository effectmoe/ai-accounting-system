'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NewJournalPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>
        
        <h1 className="text-3xl font-bold">仕訳を作成</h1>
        <p className="text-gray-600 mt-2">新しい仕訳を作成します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>仕訳作成フォーム</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            仕訳作成機能は現在開発中です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}