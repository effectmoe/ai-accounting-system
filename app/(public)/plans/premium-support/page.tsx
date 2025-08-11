'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket, Shield, Clock, Users } from 'lucide-react';

export default function PremiumSupportPlanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-600">人気プラン</Badge>
          <h1 className="text-4xl font-bold mb-4">
            <Rocket className="inline-block mr-3 h-10 w-10 text-blue-600" />
            プレミアムサポートプラン
          </h1>
          <p className="text-xl text-gray-600">
            優先サポートと拡張保証でビジネスを加速
          </p>
        </div>

        {/* 価格カード */}
        <Card className="mb-8 shadow-xl">
          <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <CardTitle className="text-3xl">月額 ¥20,000</CardTitle>
            <CardDescription className="text-blue-100">
              消費税別 / 最低契約期間なし
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">24時間以内の優先対応</h3>
                  <p className="text-sm text-gray-600">
                    通常48-72時間の対応を24時間以内に短縮
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">専任サポート担当者</h3>
                  <p className="text-sm text-gray-600">
                    お客様専任の担当者が一貫してサポート
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">月次レポート作成</h3>
                  <p className="text-sm text-gray-600">
                    業務改善提案を含む詳細レポートを毎月提供
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">無償アップデート</h3>
                  <p className="text-sm text-gray-600">
                    新機能や改善版を追加費用なしで提供
                  </p>
                </div>
              </div>
            </div>

            {/* 追加特典 */}
            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2">
                🎁 今なら初月50%OFF
              </h3>
              <p className="text-sm text-amber-700">
                新規ご契約のお客様限定で、初月料金を半額でご提供
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 詳細情報 */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <Clock className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-semibold mb-2">対応時間</h3>
              <p className="text-sm text-gray-600">
                平日 9:00-21:00<br />
                土日祝 10:00-18:00
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-semibold mb-2">サポート方法</h3>
              <p className="text-sm text-gray-600">
                メール / チャット<br />
                電話 / ビデオ通話
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="font-semibold mb-2">保証内容</h3>
              <p className="text-sm text-gray-600">
                満足保証付き<br />
                30日間返金保証
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            onClick={() => {
              // 親ウィンドウにメッセージを送信してオプションを追加
              if (window.opener) {
                window.opener.postMessage({
                  type: 'ADD_OPTION',
                  option: {
                    title: 'プレミアムサポートプラン',
                    description: '優先サポートと拡張保証でビジネスを加速',
                    price: 20000,
                    features: [
                      '24時間以内の優先対応',
                      '専任サポート担当者',
                      '月次レポート作成',
                      '無償アップデート'
                    ],
                    ctaText: 'プレミアムサポートを申し込む',
                    ctaUrl: '/plans/premium-support'
                  }
                }, '*');
                
                // メッセージ送信後、ウィンドウを閉じる
                setTimeout(() => {
                  window.close();
                }, 100);
              } else {
                // 親ウィンドウがない場合は見積書ページにリダイレクト
                window.location.href = '/quotes';
              }
            }}
          >
            見積書に追加する
          </Button>
          
          <p className="text-sm text-gray-600">
            ご不明な点がございましたら、お気軽にお問い合わせください
          </p>
          
          <Button 
            variant="outline"
            onClick={() => window.close()}
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}