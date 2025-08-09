'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmailAnalyticsDashboard from '@/components/email-analytics-dashboard';

export default function EmailAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('quoteId') || undefined;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Button>
      </div>
      <EmailAnalyticsDashboard quoteId={quoteId} />
    </div>
  );
}