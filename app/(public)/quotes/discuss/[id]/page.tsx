'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function DiscussQuotePage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        
        // 顧客情報から初期値を設定
        if (quoteData.customerEmail) {
          setContactEmail(quoteData.customerEmail);
        }
        if (quoteData.customerName) {
          setContactName(quoteData.customerName);
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

  const handleSend = async () => {
    if (!message || !contactEmail || !contactName) {
      alert('すべての項目を入力してください');
      return;
    }

    setSending(true);
    try {
      // 問い合わせ送信処理を実装
      const response = await fetch(`/api/quotes/${params.id}/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          contactEmail,
          contactName,
          quoteNumber: quote?.quoteNumber,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('送信に失敗しました');
      }
      
      setSent(true);
    } catch (err) {
      logger.error('Error sending message:', err);
      setError('送信に失敗しました');
    } finally {
      setSending(false);
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
              によるAI駆動のAAM-Accountingシステムで構成されています
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
              によるAI駆動のAAM-Accountingシステムで構成されています
            </p>
          </div>
        </footer>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col min-h-screen bg-blue-50">
        <div className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <MessageSquare className="h-16 w-16 text-blue-500" />
              </div>
              <CardTitle className="text-center">送信完了</CardTitle>
              <CardDescription className="text-center">
                お問い合わせありがとうございます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-6">
                担当者より1営業日以内にご連絡させていただきます。
                <br />
                <span className="text-sm">
                  ご質問内容は見積書番号と紐づけて管理されます。
                </span>
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.href = `/quotes/view/${params.id}`}>
                  見積書に戻る
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
              によるAI駆動のAAM-Accountingシステムで構成されています
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              見積書について相談
            </CardTitle>
            <CardDescription>
              見積書番号: {quote?.quoteNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">見積金額</p>
                  <p className="text-xl font-bold">
                    ¥{quote?.totalAmount?.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-sm text-amber-800">
                    💡 こちらからのお問い合わせ内容をもとに、
                    より最適な提案をさせていただく場合がございます。
                  </p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="contact-name">お名前</Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="山田太郎"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contact-email">メールアドレス</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">ご相談内容</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="見積書の内容についてご質問やご要望をお聞かせください"
                  rows={6}
                  className="mt-1"
                />
              </div>

              <Button 
                className="w-full"
                onClick={handleSend}
                disabled={sending || !message || !contactEmail || !contactName}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    送信
                  </>
                )}
              </Button>
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
            によるAI駆動のAAM-Accountingシステムで構成されています
          </p>
        </div>
      </footer>
    </div>
  );
}