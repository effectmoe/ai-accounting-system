import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  Users, 
  Package, 
  Upload,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Sparkles,
  ScanLine,
  Receipt,
  Building2,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

const quickActions = [
  {
    title: '請求書作成',
    description: 'AIアシスタントと会話しながら請求書を作成',
    href: '/invoices/new',
    icon: Plus,
    color: 'from-blue-500 to-blue-600',
    badge: 'AI対応'
  },
  {
    title: 'OCRスキャン',
    description: '領収書や請求書をスキャンして自動読み取り',
    href: '/documents',
    icon: ScanLine,
    color: 'from-purple-500 to-purple-600',
    badge: '高精度'
  },
  {
    title: '請求書一覧',
    description: '作成した請求書の管理・送信',
    href: '/invoices',
    icon: Receipt,
    color: 'from-green-500 to-green-600'
  },
  {
    title: '顧客管理',
    description: '顧客情報の登録・管理',
    href: '/customers',
    icon: Building2,
    color: 'from-orange-500 to-orange-600'
  }
];

const features = [
  {
    title: 'ドキュメント管理',
    description: 'OCR機能で紙の書類をデジタル化。AIが自動で仕訳を提案します。',
    icon: FileText,
    href: '/documents',
    stats: { label: '処理速度', value: '5秒/枚' }
  },
  {
    title: '商品マスタ',
    description: '商品情報を一元管理。請求書作成時に簡単に選択できます。',
    icon: ShoppingBag,
    href: '/products',
    stats: { label: '登録可能数', value: '無制限' }
  },
  {
    title: 'レポート分析',
    description: '売上や支出を可視化。経営状況を一目で把握できます。',
    icon: BarChart3,
    href: '/reports',
    stats: { label: '分析項目', value: '20種類+' }
  }
];

const recentActivities = [
  { icon: CheckCircle, text: '請求書 #2024-001 が送信されました', time: '5分前', color: 'text-green-600' },
  { icon: Upload, text: '領収書3件がアップロードされました', time: '1時間前', color: 'text-blue-600' },
  { icon: Users, text: '新規顧客「株式会社サンプル」が追加されました', time: '3時間前', color: 'text-purple-600' }
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ヒーローセクション */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50" />
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-600 mb-4 shadow-sm">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>AI搭載の次世代会計システム</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              業務を<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">スマート</span>に
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              請求書作成、OCR読み取り、顧客管理まで。
              AIがあなたの会計業務を効率化します。
            </p>
          </div>

          {/* クイックアクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="group">
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${action.color}`} />
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      {action.badge && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {action.badge}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    <div className="flex items-center text-sm text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span>始める</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">今月の請求額</p>
                    <p className="text-2xl font-bold text-gray-900">¥1,234,567</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12.5%</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">処理済み書類</p>
                    <p className="text-2xl font-bold text-gray-900">156件</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                      <Clock className="w-4 h-4" />
                      <span>今月</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">アクティブ顧客</p>
                    <p className="text-2xl font-bold text-gray-900">48社</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-purple-600">
                      <Users className="w-4 h-4" />
                      <span>+3 新規</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 機能紹介 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">主な機能</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Link key={feature.href} href={feature.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 group cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <feature.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{feature.stats.label}</span>
                        <span className="font-semibold text-gray-900">{feature.stats.value}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">最近のアクティビティ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <activity.icon className={`w-5 h-5 ${activity.color}`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.text}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}