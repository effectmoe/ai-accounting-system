'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import HtmlQuoteEditor from '@/components/html-quote-editor';
import { Quote, CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';

export default function HtmlQuoteEditorPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [quoteId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 見積書データを取得
      const quoteResponse = await fetch(`/api/quotes/${quoteId}`);
      if (!quoteResponse.ok) {
        throw new Error('見積書の取得に失敗しました');
      }
      const quoteData = await quoteResponse.json();
      setQuote(quoteData);

      // 会社情報を取得
      const companyResponse = await fetch('/api/company-info');
      if (!companyResponse.ok) {
        // 会社情報がない場合はデフォルト値を使用
        setCompanyInfo({
          companyName: '株式会社サンプル',
          email: 'info@example.com',
          phone: '03-1234-5678',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          address1: '1-2-3',
          website: 'https://example.com',
          logoUrl: '',
          registrationNumber: '',
        });
      } else {
        const companyData = await companyResponse.json();
        // APIレスポンスから正しいフィールドを取得
        if (companyData.companyInfo) {
          setCompanyInfo(companyData.companyInfo);
        } else if (companyData.company_info) {
          setCompanyInfo(companyData.company_info);
        } else {
          setCompanyInfo(companyData);
        }
      }
    } catch (error) {
      logger.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedQuote: any) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuote),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      // 見積書データを再取得
      await fetchData();
    } catch (error) {
      logger.error('Error saving quote:', error);
      throw error;
    }
  };

  const handleSend = async (emailOptions: any) => {
    try {
      // メール送信履歴を記録
      const response = await fetch(`/api/quotes/${quoteId}/email-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentAt: new Date().toISOString(),
          sentTo: emailOptions.recipientEmail,
          sentBy: 'HTML Editor',
          trackingId: emailOptions.trackingId,
          type: 'html',
        }),
      });

      if (!response.ok) {
        logger.warn('Failed to record email history');
      }
    } catch (error) {
      logger.error('Error recording email history:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !quote || !companyInfo) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'データの取得に失敗しました'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push(`/quotes/${quoteId}`)}>
          見積書詳細に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/quotes/${quoteId}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          見積書詳細に戻る
        </Button>
        <h1 className="text-3xl font-bold">HTML見積書エディタ</h1>
        <p className="text-muted-foreground mt-2">
          インタラクティブなHTML形式の見積書を作成・送信できます
        </p>
      </div>

      {/* エディタコンポーネント */}
      <HtmlQuoteEditor
        quote={quote}
        companyInfo={companyInfo}
        onSave={handleSave}
        onSend={handleSend}
      />
    </div>
  );
}