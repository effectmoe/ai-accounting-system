"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JournalPage;
const navigation_1 = require("next/navigation");
const react_1 = require("react");
function JournalPage() {
    const router = (0, navigation_1.useRouter)();
    (0, react_1.useEffect)(() => {
        // 仕訳帳機能は実装予定。現在はホームにリダイレクト
        router.replace('/');
    }, [router]);
    return (<div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">仕訳帳</h1>
        <p className="text-gray-600">この機能は現在開発中です。</p>
      </div>
    </div>);
}
