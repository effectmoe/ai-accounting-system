'use client';
// Last updated: 2025-08-11 11:30

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
  const [considering, setConsidering] = useState(false);
  const [considered, setConsidered] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [alreadyConsidering, setAlreadyConsidering] = useState(false);

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
        // 既に検討中かチェック
        if (quoteData.status === 'considering') {
          setAlreadyConsidering(true);
          setConsidered(true);
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
    if (accepting || alreadyAccepted || alreadyConsidering) {
      return; // 既に処理中または承認済み/検討中の場合は何もしない
    }
    
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '承認処理に失敗しました');
      }
      
      // 承認成功を即座に反映
      setAccepted(true);
      setAlreadyAccepted(true);
      
      // 状態を更新して承認済み画面を表示
      if (quote) {
        setQuote({ ...quote, status: 'accepted' });
      }
      
    } catch (err) {
      logger.error('Error accepting quote:', err);
      setError(err instanceof Error ? err.message : '承認処理に失敗しました');
      setAccepting(false); // エラー時のみacceptingをfalseに
    }
  };

  const handleConsider = async () => {
    if (considering || alreadyConsidering || alreadyAccepted) {
      return; // 既に処理中または検討中/承認済みの場合は何もしない
    }
    
    setConsidering(true);
    try {
      // 検討中処理を実装
      const response = await fetch(`/api/quotes/${params.id}/consider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consideredAt: new Date().toISOString(),
          consideredBy: quote?.customer?.email || quote?.customerEmail || 'customer@example.com',
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '検討中処理に失敗しました');
      }
      
      // 検討中成功を即座に反映
      setConsidered(true);
      setAlreadyConsidering(true);
      
      // 状態を更新して検討中画面を表示
      if (quote) {
        setQuote({ ...quote, status: 'considering' });
      }
      
    } catch (err) {
      logger.error('Error marking quote as considering:', err);
      setError(err instanceof Error ? err.message : '検討中処理に失敗しました');
      setConsidering(false); // エラー時のみconsideringをfalseに
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">見積書を読み込んでいます...</p>
            </CardContent>
          </Card>
        </div>
        
        {/* AAM-Accountingシステム署名 */}
        <footer className="border-t border-gray-200 py-4">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-500">
              このシステムは
              <a 
                href="https://notion.effect.moe/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                株式会社EFFECT
              </a>
              のAAM-Accountingシステムです
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-red-600">エラー</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* AAM-Accountingシステム署名 */}
        <footer className="border-t border-gray-200 py-4">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-500">
              このシステムは
              <a 
                href="https://notion.effect.moe/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                株式会社EFFECT
              </a>
              のAAM-Accountingシステムです
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex flex-col min-h-screen bg-green-50">
        <div className="flex-grow flex items-center justify-center">
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
        
        {/* AAM-Accountingシステム署名 */}
        <footer className="border-t border-gray-200 py-4 bg-white">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-500">
              このシステムは
              <a 
                href="https://notion.effect.moe/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                株式会社EFFECT
              </a>
              のAAM-Accountingシステムです
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (considered) {
    return (
      <div className="flex flex-col min-h-screen bg-yellow-50">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <svg className="h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="text-center">検討中として記録しました</CardTitle>
              <CardDescription className="text-center">
                見積書を検討いただきありがとうございます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-6">
                検討中ステータスとして記録しました。
                <br />
                ご検討の結果、何かご不明な点がございましたら
                <br />
                お気軽にお問い合わせください。
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
        
        {/* AAM-Accountingシステム署名 */}
        <footer className="border-t border-gray-200 py-4 bg-white">
          <div className="max-w-md mx-auto text-center">
            <p className="text-xs text-gray-500">
              このシステムは
              <a 
                href="https://notion.effect.moe/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                株式会社EFFECT
              </a>
              のAAM-Accountingシステムです
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow flex items-center justify-center">
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

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={handleAccept}
                    disabled={accepting || alreadyAccepted || alreadyConsidering}
                    variant={alreadyAccepted ? 'secondary' : 'default'}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        承認中...
                      </>
                    ) : alreadyAccepted ? (
                      '承認済み'
                    ) : alreadyConsidering ? (
                      '承認不可（検討中）'
                    ) : (
                      '見積書を承認'
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={handleConsider}
                    disabled={considering || alreadyConsidering || alreadyAccepted}
                  >
                    {considering ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        処理中...
                      </>
                    ) : alreadyConsidering ? (
                      '検討中'
                    ) : alreadyAccepted ? (
                      '検討不可（承認済み）'
                    ) : (
                      '検討する'
                    )}
                  </Button>
                </div>
                <Button 
                  variant="ghost"
                  className="w-full"
                  onClick={() => window.close()}
                >
                  閉じる
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* AAM-Accountingシステム署名 */}
      <footer className="border-t border-gray-200 py-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-xs text-gray-500">
            このシステムは
            <a 
              href="https://notion.effect.moe/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              株式会社EFFECT
            </a>
            のAAM-Accountingシステムです
          </p>
        </div>
      </footer>
    </div>
  );
}