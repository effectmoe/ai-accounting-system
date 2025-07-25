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
    const navItems = [
        { href: '/', label: 'ダッシュボード' },
        { href: '/documents', label: '書類管理' },
        { href: '/quotes', label: '見積書' },
        { href: '/invoices', label: '請求書' },
        { href: '/delivery-notes', label: '納品書' },
        { href: '/customers', label: '顧客管理' },
        { href: '/products', label: '商品管理' },
        { href: '/import', label: 'インポート' },
        { href: '/reports', label: 'レポート' },
        { href: '/settings', label: '設定' },
    ];
    const isActive = (href) => {
        if (href === '/') {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };
    return (<nav className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <link_1.default href="/" className="text-xl font-bold text-gray-800">
                AAM Accounting
              </link_1.default>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (<link_1.default key={item.href} href={item.href} className={`${isActive(item.href)
                ? 'border-indigo-500 text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}>
                  {item.label}
                </link_1.default>))}
            </div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500" aria-expanded={isOpen}>
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

      {/* Mobile menu */}
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {navItems.map((item) => (<link_1.default key={item.href} href={item.href} className={`${isActive(item.href)
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`} onClick={() => setIsOpen(false)}>
              {item.label}
            </link_1.default>))}
        </div>
      </div>
    </nav>);
};
exports.default = Navigation;
