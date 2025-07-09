'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'AI会計アシスタント' },
    { href: '/documents', label: '書類一覧' },
    { href: '/customers', label: '顧客管理' },
    { href: '/products', label: '商品管理' },
    { href: '/invoices', label: '請求書' },
    { href: '/accounts', label: '勘定科目' },
    { href: '/journal', label: '仕訳帳' },
    { href: '/learning', label: 'AI学習管理' },
    { href: '/import', label: 'データインポート' },
    { href: '/automation', label: '自動化管理' },
    { href: '/mastra-admin', label: 'AAM管理' },
  ];
  
  const settingsItems = [
    { href: '/settings/company', label: '自社情報' },
    { href: '/settings/bank-accounts', label: '銀行口座' },
  ];
  
  return (
    <nav className="bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-white font-bold text-xl">
                AAM会計システム
              </span>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="relative group">
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname.startsWith('/settings')
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } focus:outline-none`}
                  >
                    設定
                  </button>
                  <div className="absolute right-0 z-50 hidden group-hover:block w-48 mt-1 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      {settingsItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block px-4 py-2 text-sm ${
                            pathname === item.href
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}