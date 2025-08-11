'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function AcceptQuotePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const quoteId = params.id as string;
        
        // 見積書データを取得
        const quoteRes = await fetch(`/api/quotes/${quoteId}`);
        if (!quoteRes.ok) {
          throw new Error('見積書が見つかりません');
        }
        const quoteData = await quoteRes.json();
        setQuote(quoteData);
        
        // 既に承認済みかチェック
        if (quoteData.status === 'accepted') {
          setAlreadyAccepted(true);
          setAccepted(true);
        }
      } catch (err) {
        logger.error('Error loading quote:', err);
        setError(err instanceof Error ? err.message : '見積書の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [params.id]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // 承認処理を実装
      const response = await fetch(`/api/quotes/${params.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedAt: new Date().toISOString(),
          acceptedBy: quote?.customer?.email || quote?.customerEmail || 'customer@example.com',
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent
        })
      });
      
      if (!response.ok) {
        throw new Error('承認処理に失敗しました');
      }
      
      // APIから更新されたデータを取得して状態を更新
      const updatedQuoteRes = await fetch(`/api/quotes/${params.id}`);
      if (updatedQuoteRes.ok) {
        const updatedQuote = await updatedQuoteRes.json();
        setQuote(updatedQuote);
        if (updatedQuote.status === 'accepted') {
          setAlreadyAccepted(true);
        }
      }
      
      setAccepted(true);
      setAlreadyAccepted(true);
    } catch (err) {
      logger.error('Error accepting quote:', err);
      setError('承認処理に失敗しました');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">見積書を読み込んでいます...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50">
        <Card className="w-96">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">承認完了</CardTitle>
            <CardDescription className="text-center">
              見積書を承認いただきありがとうございます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">
              承認内容を受け付けました。
              <br />
              詳細は担当者よりご連絡させていただきます。
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push(`/quotes/view/${params.id}`)}>
                見積書を表示
              </Button>
              <Button variant="outline" onClick={() => window.close()}>
                閉じる
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>見積書の承認</CardTitle>
          <CardDescription>
            見積書番号: {quote?.quoteNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">合計金額</p>
              <p className="text-2xl font-bold">
                ¥{quote?.totalAmount?.toLocaleString()}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                承認により以下が実行されます：
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>見積書が正式に承認されます</li>
                <li>承認済みPDFが生成されます</li>
                <li>双方に確認メールが送信されます</li>
                <li>次のステップ（請求書発行等）が可能になります</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={handleAccept}
                disabled={accepting || alreadyAccepted}
                variant={alreadyAccepted ? 'secondary' : 'default'}
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    承認中...
                  </>
                ) : alreadyAccepted ? (
                  '承認済み'
                ) : (
                  '見積書を承認'
                )}
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => window.close()}
              >
                閉じる
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}