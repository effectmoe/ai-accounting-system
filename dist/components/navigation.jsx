"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const Navigation = () => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const pathname = (0, navigation_1.usePathname)();
    const menuRef = (0, react_1.useRef)(null);
    // メニューの外側をクリックしたら閉じる
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    const isActive = (href) => {
        if (href === '/') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };
    return (<nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50" ref={menuRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <link_1.default href="/" className="text-xl font-bold text-gray-800">
                AAM Accounting
              </link_1.default>
            </div>
            {/* 主要メニューのみ表示 */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {mainNavItems.map((item) => (<link_1.default key={item.href} href={item.href} className={`${isActive(item.href)
                ? 'border-indigo-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}>
                  {item.label}
                </link_1.default>))}
            </div>
          </div>
          <div className="flex items-center">
            {/* 全デバイスでハンバーガーメニューを表示 */}
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500" aria-expanded={isOpen}>
              <span className="sr-only">メニューを開く</span>
              {/* Hamburger icon */}
              <svg className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              {/* Close icon */}
              <svg className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ドロップダウンメニュー（全デバイス対応） */}
      <div className={`${isOpen ? 'block' : 'hidden'} absolute top-16 left-0 right-0 bg-white shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuCategories.map((category) => (<div key={category.title}>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  {category.title}
                </h3>
                <div className="space-y-1">
                  {category.items.map((item) => (<link_1.default key={item.href} href={item.href} className={`${isActive(item.href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'} block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`} onClick={() => setIsOpen(false)}>
                      {item.label}
                    </link_1.default>))}
                </div>
              </div>))}
          </div>
        </div>
      </div>
    </nav>);
};
exports.default = Navigation;
