'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  Home,
  Upload,
  Plus,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigationItems = [
  {
    name: 'ホーム',
    href: '/',
    icon: Home,
    description: 'ダッシュボード'
  },
  {
    name: 'ドキュメント',
    href: '/documents',
    icon: FileText,
    description: 'OCR・書類管理'
  },
  {
    name: '請求書',
    href: '/invoices',
    icon: FileText,
    description: '請求書管理',
    actions: [
      { name: '新規作成', href: '/invoices/new', icon: Plus }
    ]
  },
  {
    name: '顧客',
    href: '/customers',
    icon: Users,
    description: '顧客管理',
    actions: [
      { name: '新規登録', href: '/customers/new', icon: Plus }
    ]
  },
  {
    name: '商品',
    href: '/products',
    icon: Package,
    description: '商品管理',
    actions: [
      { name: '新規登録', href: '/products/new', icon: Plus }
    ]
  },
  {
    name: 'レポート',
    href: '/reports',
    icon: BarChart3,
    description: '分析・レポート'
  },
  {
    name: '設定',
    href: '/settings/company',
    icon: Settings,
    description: 'システム設定'
  }
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">AAM会計システム</h1>
              <p className="text-xs text-gray-500">AI-Powered Accounting</p>
            </div>
          </Link>

          {/* メインナビゲーション */}
          <div className="hidden lg:flex items-center gap-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-gray-100",
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>

                  {/* ドロップダウンメニュー */}
                  {item.actions && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="p-2">
                        <p className="text-xs text-gray-500 px-3 py-1">{item.description}</p>
                        {item.actions.map((action) => (
                          <Link
                            key={action.href}
                            href={action.href}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
                          >
                            <action.icon className="w-4 h-4 text-gray-400" />
                            <span>{action.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* クイックアクション */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-2"
              asChild
            >
              <Link href="/import">
                <Upload className="w-4 h-4" />
                <span>インポート</span>
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              asChild
            >
              <Link href="/invoices/new">
                <Plus className="w-4 h-4 mr-1" />
                <span>請求書作成</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* モバイルナビゲーション */}
      <div className="lg:hidden border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs whitespace-nowrap",
                    "hover:bg-gray-100",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}