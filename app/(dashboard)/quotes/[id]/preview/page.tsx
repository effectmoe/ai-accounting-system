'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HtmlQuoteEditor from '@/components/html-quote-editor';
import { Quote } from '@/types/collections';
import { CompanyInfo } from '@/types/collections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';

export default function QuotePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const quoteId = params.id as string;
        
        // 見積書データを取得
        const quoteRes = await fetch(`/api/quotes/${quoteId}`);
        if (!quoteRes.ok) {
          throw new Error('見積書が見つかりません');
        }
        const quoteData = await quoteRes.json();
        setQuote(quoteData);

        // 会社情報を取得
        const companyRes = await fetch('/api/company-info');
        if (!companyRes.ok) {
          throw new Error('会社情報の取得に失敗しました');
        }
        const companyData = await companyRes.json();
        setCompanyInfo(companyData);
      } catch (err) {
        logger.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  const handleSave = async (updatedQuote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuote),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setQuote(updatedQuote);
      toast.success('見積書を保存しました');
    } catch (err) {
      logger.error('Error saving quote:', err);
      toast.error('保存に失敗しました');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote || !companyInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'データが見つかりません'}</p>
            <Button onClick={() => router.push('/quotes')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              見積書一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button onClick={() => router.push(`/quotes/${params.id}`)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          見積書詳細に戻る
        </Button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">見積書プレビュー・送信</h1>
      
      <HtmlQuoteEditor
        quote={quote}
        companyInfo={companyInfo}
        onSave={handleSave}
        onSend={undefined}  // 明示的にundefinedを渡す
      />
    </div>
  );
}