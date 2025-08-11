'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, BarChart3, TrendingUp, Brain, FileBarChart } from 'lucide-react';
import Image from 'next/image';

export default function DataAnalyticsPlanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-600">AI分析</Badge>
          <h1 className="text-4xl font-bold mb-4">
            <BarChart3 className="inline-block mr-3 h-10 w-10 text-purple-600" />
            データ分析オプション
          </h1>
          <p className="text-xl text-gray-600">
            AIを活用した高度な分析でビジネスインサイトを獲得
          </p>
        </div>

        {/* 価格カード */}
        <Card className="mb-8 shadow-xl">
          <CardHeader className="text-center bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <CardTitle className="text-3xl">¥50,000/回</CardTitle>
            <CardDescription className="text-purple-100">
              1回あたりの分析料金 / 最大3ヶ月分のデータ分析
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">カスタムダッシュボード作成</h3>
                  <p className="text-sm text-gray-600">
                    お客様のKPIに合わせたオーダーメイドダッシュボード
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">予測分析レポート</h3>
                  <p className="text-sm text-gray-600">
                    AIによる売上予測と需要予測を含むレポート
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">ROI最適化提案</h3>
                  <p className="text-sm text-gray-600">
                    投資効果を最大化するための具体的な改善提案
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">競合分析</h3>
                  <p className="text-sm text-gray-600">
                    市場における立ち位置と競合との比較分析
                  </p>
                </div>
              </div>
            </div>

            {/* サンプルセクション */}
            <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-2">
                📊 分析サンプル
              </h3>
              <p className="text-sm text-purple-700 mb-3">
                実際の分析レポートのサンプルをご覧いただけます
              </p>
              {/* ダミーのサンプル画像エリア */}
              <div className="bg-white p-4 rounded border border-purple-200">
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded flex items-center justify-center">
                  <div className="text-center">
                    <FileBarChart className="h-16 w-16 text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-purple-600">分析レポートサンプル</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分析内容の詳細 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <Brain className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-2">AI分析技術</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 機械学習による傾向分析</li>
                <li>• 異常値検出と原因分析</li>
                <li>• パターン認識による予測</li>
                <li>• 自然言語処理によるレポート生成</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="font-semibold mb-2">提供形式</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• PDFレポート（30-50ページ）</li>
                <li>• インタラクティブダッシュボード</li>
                <li>• エクセルデータファイル</li>
                <li>• オンライン説明会（1時間）</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 納期情報 */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">📅 納期について</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-purple-700">データ収集</p>
                <p className="text-gray-600">3-5営業日</p>
              </div>
              <div>
                <p className="font-medium text-purple-700">分析作業</p>
                <p className="text-gray-600">5-7営業日</p>
              </div>
              <div>
                <p className="font-medium text-purple-700">レポート作成</p>
                <p className="text-gray-600">2-3営業日</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ※データ量や分析内容により変動する場合があります
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-6 text-lg"
            onClick={() => {
              // 親ウィンドウにメッセージを送信してオプションを追加
              if (window.opener) {
                window.opener.postMessage({
                  type: 'ADD_OPTION',
                  option: {
                    title: 'データ分析オプション',
                    description: 'AIを活用した高度なデータ分析で経営判断をサポート',
                    price: 50000,
                    features: [
                      '売上データ分析',
                      'KPI自動レポート',
                      'トレンド予測',
                      '改善提案レポート'
                    ],
                    ctaText: 'データ分析を申し込む',
                    ctaUrl: '/plans/data-analytics'
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
            まずはサンプルレポートをご確認ください
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