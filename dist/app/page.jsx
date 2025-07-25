"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const ai_chat_dialog_1 = __importDefault(require("@/components/ai-chat-dialog"));
const simple_knowledge_dialog_1 = __importDefault(require("@/components/simple-knowledge-dialog"));
const lucide_react_1 = require("lucide-react");
const quickActions = [
    {
        title: '仕訳管理',
        description: 'タイムライン表示で仕訳を視覚的に管理',
        href: '/journal',
        icon: lucide_react_1.BookOpenCheck,
        color: 'from-violet-500 to-violet-600',
        badge: '新機能'
    },
    {
        title: '見積書作成',
        description: 'AIアシスタントと会話しながら見積書を作成',
        href: '/quotes/new',
        icon: lucide_react_1.Plus,
        color: 'from-indigo-500 to-indigo-600',
        badge: 'AI対応'
    },
    {
        title: '請求書作成',
        description: 'AIアシスタントと会話しながら請求書を作成',
        href: '/invoices/new',
        icon: lucide_react_1.Plus,
        color: 'from-blue-500 to-blue-600',
        badge: 'AI対応'
    },
    {
        title: 'OCRスキャン',
        description: '領収書や請求書をスキャンして自動読み取り',
        href: '/documents',
        icon: lucide_react_1.ScanLine,
        color: 'from-purple-500 to-purple-600',
        badge: '高精度'
    },
    {
        title: '見積書一覧',
        description: '作成した見積書の管理・送信',
        href: '/quotes',
        icon: lucide_react_1.FileText,
        color: 'from-emerald-500 to-emerald-600'
    },
    {
        title: '請求書一覧',
        description: '作成した請求書の管理・送信',
        href: '/invoices',
        icon: lucide_react_1.Receipt,
        color: 'from-green-500 to-green-600'
    },
    {
        title: '顧客管理',
        description: '顧客情報の登録・管理',
        href: '/customers',
        icon: lucide_react_1.Building2,
        color: 'from-orange-500 to-orange-600'
    },
    {
        title: 'FAQ',
        description: 'よくある質問とその回答',
        href: '/faq',
        icon: lucide_react_1.HelpCircle,
        color: 'from-amber-500 to-amber-600',
        badge: 'ナレッジ'
    },
    {
        title: '仕入先管理',
        description: '仕入先の登録・管理',
        href: '/suppliers',
        icon: lucide_react_1.Building2,
        color: 'from-slate-500 to-slate-600'
    },
    {
        title: '仕入先見積書',
        description: '仕入先からの見積書管理',
        href: '/supplier-quotes',
        icon: lucide_react_1.FileText,
        color: 'from-teal-500 to-teal-600',
        badge: '新機能'
    },
    {
        title: '仕入先請求書',
        description: '仕入先からの請求書管理',
        href: '/purchase-invoices',
        icon: lucide_react_1.Receipt,
        color: 'from-green-500 to-green-600',
        badge: '新機能'
    }
];
const features = [
    {
        title: 'ドキュメント管理',
        description: 'OCR機能で紙の書類をデジタル化。AIが自動で仕訳を提案します。',
        icon: lucide_react_1.FileText,
        href: '/documents',
        stats: { label: '処理速度', value: '5秒/枚' }
    },
    {
        title: '商品マスタ',
        description: '商品情報を一元管理。請求書作成時に簡単に選択できます。',
        icon: lucide_react_1.ShoppingBag,
        href: '/products',
        stats: { label: '登録可能数', value: '無制限' }
    },
    {
        title: 'レポート分析',
        description: '売上や支出を可視化。経営状況を一目で把握できます。',
        icon: lucide_react_1.BarChart3,
        href: '/reports',
        stats: { label: '分析項目', value: '20種類+' }
    }
];
// アクティビティのアイコンマッピング
const getActivityIcon = (type) => {
    switch (type) {
        case 'invoice_created':
        case 'invoice_sent':
            return lucide_react_1.CheckCircle;
        case 'document_created':
        case 'ocr_completed':
            return lucide_react_1.ScanLine;
        case 'customer_created':
            return lucide_react_1.Users;
        case 'supplier_created':
            return lucide_react_1.Building2;
        case 'supplier_quote_created':
            return lucide_react_1.FileText;
        default:
            return lucide_react_1.CheckCircle;
    }
};
// アクティビティの色マッピング
const getActivityColor = (type) => {
    switch (type) {
        case 'invoice_created':
        case 'invoice_sent':
            return 'text-green-600';
        case 'document_created':
        case 'ocr_completed':
            return 'text-blue-600';
        case 'customer_created':
            return 'text-purple-600';
        case 'supplier_created':
            return 'text-orange-600';
        case 'supplier_quote_created':
            return 'text-teal-600';
        default:
            return 'text-gray-600';
    }
};
function Home() {
    const [isChatOpen, setIsChatOpen] = (0, react_1.useState)(false);
    const [isKnowledgeChatOpen, setIsKnowledgeChatOpen] = (0, react_1.useState)(false);
    const [documentType, setDocumentType] = (0, react_1.useState)('invoice');
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // ダッシュボードメトリクスを取得
    (0, react_1.useEffect)(() => {
        const fetchMetrics = async () => {
            try {
                console.log('Fetching dashboard metrics...');
                setLoading(true);
                const response = await fetch('/api/dashboard/metrics');
                if (!response.ok) {
                    throw new Error(`Failed to fetch metrics: ${response.status}`);
                }
                const data = await response.json();
                console.log('Dashboard metrics loaded:', data);
                setMetrics(data);
                setError(null);
            }
            catch (err) {
                console.error('Error fetching dashboard metrics:', err);
                setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
            }
            finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, []);
    return (<main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* ヒーローセクション */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-50"/>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-gray-600 mb-4 shadow-sm">
              <lucide_react_1.Sparkles className="w-4 h-4 text-purple-500"/>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {quickActions.map((action) => (<link_1.default key={action.href} href={action.href} className="group">
                <card_1.Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${action.color}`}/>
                  <card_1.CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                        <action.icon className="w-6 h-6 text-white"/>
                      </div>
                      {action.badge && (<span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {action.badge}
                        </span>)}
                    </div>
                  </card_1.CardHeader>
                  <card_1.CardContent>
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                    <div className="flex items-center text-sm text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span>始める</span>
                      <lucide_react_1.ArrowRight className="w-4 h-4 ml-1"/>
                    </div>
                  </card_1.CardContent>
                </card_1.Card>
              </link_1.default>))}
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <card_1.Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <card_1.CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">総請求額</p>
                    {loading ? (<div className="h-8 bg-gray-200 rounded animate-pulse"></div>) : error ? (<p className="text-xl font-bold text-red-500">エラー</p>) : (<p className="text-2xl font-bold text-gray-900">
                        ¥{metrics?.totalRevenue.toLocaleString() || '0'}
                      </p>)}
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                      <lucide_react_1.TrendingUp className="w-4 h-4"/>
                      <span>累計</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <lucide_react_1.TrendingUp className="w-6 h-6 text-green-600"/>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <card_1.CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">処理済み書類</p>
                    {loading ? (<div className="h-8 bg-gray-200 rounded animate-pulse"></div>) : error ? (<p className="text-xl font-bold text-red-500">エラー</p>) : (<p className="text-2xl font-bold text-gray-900">
                        {metrics?.processedDocuments || 0}件
                      </p>)}
                    <div className="flex items-center gap-1 mt-2 text-sm text-blue-600">
                      <lucide_react_1.Clock className="w-4 h-4"/>
                      <span>保留中: {metrics?.pendingDocuments || 0}件</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <lucide_react_1.FileText className="w-6 h-6 text-blue-600"/>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card className="bg-white/80 backdrop-blur-sm border-gray-100">
              <card_1.CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">アクティブ顧客</p>
                    {loading ? (<div className="h-8 bg-gray-200 rounded animate-pulse"></div>) : error ? (<p className="text-xl font-bold text-red-500">エラー</p>) : (<p className="text-2xl font-bold text-gray-900">
                        {metrics?.activeCustomers || 0}社
                      </p>)}
                    <div className="flex items-center gap-1 mt-2 text-sm text-purple-600">
                      <lucide_react_1.Users className="w-4 h-4"/>
                      <span>過去90日</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <lucide_react_1.Users className="w-6 h-6 text-purple-600"/>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          {/* AIチャットアシスタント */}
          <div className="text-center mb-12">
            <card_1.Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-xl">
              <card_1.CardContent className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <lucide_react_1.Bot className="w-8 h-8 text-white"/>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  AIアシスタントに相談
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  請求書・見積書の作成から税務相談まで、AIが専門的にサポートします。
                  最新の税務・会計ナレッジを活用して、正確な回答を提供します。
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button_1.Button onClick={() => {
            setDocumentType('invoice');
            setIsChatOpen(true);
        }} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      <lucide_react_1.MessageSquare className="mr-2 h-5 w-5"/>
                      請求書作成チャット
                    </button_1.Button>
                    <button_1.Button onClick={() => {
            setDocumentType('quote');
            setIsChatOpen(true);
        }} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                      <lucide_react_1.MessageSquare className="mr-2 h-5 w-5"/>
                      見積書作成チャット
                    </button_1.Button>
                  </div>
                  <button_1.Button onClick={() => setIsKnowledgeChatOpen(true)} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    <lucide_react_1.BookOpen className="mr-2 h-5 w-5"/>
                    税務相談チャット
                  </button_1.Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>24時間対応</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>専門知識搭載</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>日本税制対応</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>外部ナレッジ活用</span>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          {/* 機能紹介 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">主な機能</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature) => (<link_1.default key={feature.href} href={feature.href}>
                  <card_1.Card className="h-full hover:shadow-lg transition-all duration-300 group cursor-pointer">
                    <card_1.CardHeader>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <feature.icon className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors"/>
                        </div>
                        <card_1.CardTitle className="text-lg">{feature.title}</card_1.CardTitle>
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </card_1.CardHeader>
                    <card_1.CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{feature.stats.label}</span>
                        <span className="font-semibold text-gray-900">{feature.stats.value}</span>
                      </div>
                    </card_1.CardContent>
                  </card_1.Card>
                </link_1.default>))}
            </div>
          </div>

          {/* 最近のアクティビティ */}
          <card_1.Card className="bg-white/80 backdrop-blur-sm">
            <card_1.CardHeader>
              <card_1.CardTitle className="text-lg">最近のアクティビティ</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-3">
              {loading ? (
        // ローディング状態
        Array.from({ length: 3 }).map((_, index) => (<div key={index} className="flex items-center gap-3 p-3 rounded-lg">
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </div>))) : error ? (<div className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="w-5 h-5 text-red-500">⚠</div>
                  <div className="flex-1">
                    <p className="text-sm text-red-600">アクティビティの読み込みに失敗しました</p>
                    <p className="text-xs text-gray-500">{error}</p>
                  </div>
                </div>) : (metrics?.recentActivities && metrics.recentActivities.length > 0 ? (metrics.recentActivities.map((activity, index) => {
            const ActivityIcon = getActivityIcon(activity.type);
            const activityColor = getActivityColor(activity.type);
            const timeAgo = new Date(activity.timestamp).toLocaleString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            return (<div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <ActivityIcon className={`w-5 h-5 ${activityColor}`}/>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">{timeAgo}</p>
                        </div>
                      </div>);
        })) : (<div className="flex items-center gap-3 p-3 rounded-lg">
                    <div className="w-5 h-5 text-gray-400">ℹ</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">最近のアクティビティはありません</p>
                      <p className="text-xs text-gray-500">システムを使用するとここに表示されます</p>
                    </div>
                  </div>))}
            </card_1.CardContent>
          </card_1.Card>

          {/* 管理者向けツール */}
          <card_1.Card className="bg-white/80 backdrop-blur-sm mt-6">
            <card_1.CardHeader>
              <card_1.CardTitle className="text-lg text-gray-700">管理者向けツール</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <lucide_react_1.Database className="w-5 h-5 text-gray-500"/>
                <div className="flex-1">
                  <link_1.default href="/import" className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    freeeからのデータインポート
                  </link_1.default>
                  <p className="text-xs text-gray-500 mt-1">
                    freeeからエクスポートしたCSVファイルを一括インポート
                  </p>
                </div>
                <lucide_react_1.ArrowRight className="w-4 h-4 text-gray-400"/>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>
      </div>

      {/* AIチャットモーダル */}
      {isChatOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <lucide_react_1.Bot className="w-6 h-6 text-white"/>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AIアシスタント</h3>
                  <p className="text-sm text-gray-500">会計・税務の専門知識でサポート</p>
                </div>
              </div>
              <button_1.Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button_1.Button>
            </div>
            <div className="h-[60vh]">
              <ai_chat_dialog_1.default mode="create" documentType={documentType} onClose={() => setIsChatOpen(false)} isOpen={isChatOpen}/>
            </div>
          </div>
        </div>)}

      {/* ナレッジチャットモーダル */}
      <simple_knowledge_dialog_1.default isOpen={isKnowledgeChatOpen} onClose={() => setIsKnowledgeChatOpen(false)} title="税務・会計ナレッジチャット" placeholder="税務や会計に関する質問を入力してください（例：インボイス制度について教えて）"/>
    </main>);
}
