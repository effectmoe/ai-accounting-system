'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // メニュー項目をカテゴリー別に整理
  const menuCategories = [
    {
      title: '基本機能',
      items: [
        { href: '/', label: 'ダッシュボード' },
        { href: '/documents', label: '書類管理' },
        { href: '/deals', label: '案件管理' },
      ]
    },
    {
      title: '販売管理',
      items: [
        { href: '/quotes', label: '見積書' },
        { href: '/invoices', label: '請求書' },
        { href: '/delivery-notes', label: '納品書' },
      ]
    },
    {
      title: '仕入管理',
      items: [
        { href: '/suppliers', label: '仕入先' },
        { href: '/supplier-quotes', label: '仕入見積書' },
        { href: '/purchase-invoices', label: '仕入請求書' },
      ]
    },
    {
      title: 'マスタ管理',
      items: [
        { href: '/customers', label: '顧客管理' },
        { href: '/products', label: '商品管理' },
      ]
    },
    {
      title: 'その他',
      items: [
        { href: '/import', label: 'インポート' },
        { href: '/reports', label: 'レポート' },
        { href: '/faq', label: 'FAQ' },
        { href: '/settings', label: '設定' },
      ]
    }
  ];

  // 主要なナビゲーション項目（常に表示）
  const mainNavItems = [
    { href: '/', label: 'ダッシュボード' },
    { href: '/documents', label: '書類管理' },
    { href: '/deals', label: '案件管理' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-800">
                AAM Accounting
              </Link>
            </div>
            {/* 主要メニューのみ表示 */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            {/* 全デバイスでハンバーガーメニューを表示 */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded={isOpen}
            >
              <span className="sr-only">メニューを開く</span>
              {/* Hamburger icon */}
              <svg
                className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ドロップダウンメニュー（全デバイス対応） */}
      <div className={`${isOpen ? 'block' : 'hidden'} absolute top-16 left-0 right-0 bg-white shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      } block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;