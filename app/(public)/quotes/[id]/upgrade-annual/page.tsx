'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Calendar, TrendingDown, Gift, Shield, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function UpgradeAnnualPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const quoteId = params.id as string;
        const quoteRes = await fetch(`/api/quotes/${quoteId}`);
        if (!quoteRes.ok) {
          throw new Error('見積書が見つかりません');
        }
        const quoteData = await quoteRes.json();
        setQuote(quoteData);
      } catch (err) {
        logger.error('Error loading quote:', err);
        setError(err instanceof Error ? err.message : '見積書の読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [params.id]);

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

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || '見積書が見つかりません'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthlyAmount = quote.totalAmount || 0;
  const annualAmount = monthlyAmount * 12;
  const discountedAmount = Math.floor(annualAmount * 0.85);
  const savingsAmount = annualAmount - discountedAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-600">特別オファー</Badge>
          <h1 className="text-4xl font-bold mb-4">
            <Calendar className="inline-block mr-3 h-10 w-10 text-green-600" />
            年間契約割引
          </h1>
          <p className="text-xl text-gray-600">
            年間契約で15%の特別割引を適用
          </p>
        </div>

        {/* 見積書情報 */}
        <Card className="mb-8 bg-white/90 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">見積書番号</p>
              <p className="text-lg font-semibold">{quote.quoteNumber}</p>
            </div>
            
            {/* 価格比較 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 月額プラン */}
              <div className="p-4 border-2 border-gray-200 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-700">現在のプラン（月額）</h3>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">
                    ¥{monthlyAmount.toLocaleString()}
                    <span className="text-sm font-normal text-gray-600">/月</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    年間総額: ¥{annualAmount.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* 年間プラン */}
              <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-green-700">年間契約プラン</h3>
                  <Badge className="bg-red-500">15% OFF</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-green-700">
                    ¥{discountedAmount.toLocaleString()}
                    <span className="text-sm font-normal text-gray-600">/年</span>
                  </p>
                  <p className="text-sm text-gray-600 line-through">
                    通常: ¥{annualAmount.toLocaleString()}
                  </p>
                  <div className="pt-2 border-t border-green-200">
                    <p className="text-lg font-semibold text-green-600">
                      <TrendingDown className="inline-block h-5 w-5 mr-1" />
                      ¥{savingsAmount.toLocaleString()} お得！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 特典リスト */}
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle>年間契約の特典</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">15%割引適用</h3>
                  <p className="text-sm text-gray-600">
                    月額換算で¥{Math.floor(discountedAmount / 12).toLocaleString()}に
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">請求書発行の簡素化</h3>
                  <p className="text-sm text-gray-600">
                    年1回の請求で経理処理が簡単に
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">優先アップデート</h3>
                  <p className="text-sm text-gray-600">
                    新機能を他のお客様より先行してご利用可能
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">無料カスタマイズ（3回まで）</h3>
                  <p className="text-sm text-gray-600">
                    通常有料のカスタマイズを3回まで無料で対応
                  </p>
                </div>
              </div>
            </div>

            {/* 限定オファー */}
            <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <Gift className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-1">
                    今だけの特別特典
                  </h3>
                  <p className="text-sm text-amber-700">
                    今月中にお申し込みいただくと、追加で1ヶ月分の無料延長をプレゼント！
                    実質13ヶ月分を12ヶ月分の料金でご利用いただけます。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保証情報 */}
        <Card className="mb-8 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  30日間返金保証
                </h3>
                <p className="text-sm text-blue-800">
                  ご契約後30日以内であれば、理由を問わず全額返金いたします。
                  安心してお申し込みください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-6 text-lg"
            onClick={() => {
              const subject = encodeURIComponent('年間契約への切り替えお申し込み');
              const body = encodeURIComponent(
                `年間契約への切り替えをご希望です。\n\n` +
                `【見積書情報】\n` +
                `- 見積書番号: ${quote.quoteNumber}\n` +
                `- 月額料金: ¥${monthlyAmount.toLocaleString()}\n` +
                `- 年間料金（割引前）: ¥${annualAmount.toLocaleString()}\n` +
                `- 年間料金（15%割引後）: ¥${discountedAmount.toLocaleString()}\n` +
                `- 割引額: ¥${savingsAmount.toLocaleString()}\n\n` +
                `【お客様情報】\n` +
                `会社名: ${quote.customer?.companyName || ''}\n` +
                `ご担当者名:\n` +
                `ご連絡先:\n\n` +
                `よろしくお願いいたします。`
              );
              window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
            }}
          >
            年間契約に切り替える
          </Button>
          
          <p className="text-sm text-gray-600">
            ご不明な点がございましたら、お気軽にお問い合わせください
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              variant="outline"
              onClick={() => window.location.href = `/quotes/view/${params.id}`}
            >
              見積書に戻る
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => window.close()}
            >
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}