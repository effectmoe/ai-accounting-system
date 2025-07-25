"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const navigation_1 = __importDefault(require("@/components/navigation"));
const react_hot_toast_1 = require("react-hot-toast");
const inter = (0, google_1.Inter)({ subsets: ['latin'] });
exports.metadata = {
    title: 'AAM Accounting Automation',
    description: 'AI-driven accounting system for Japanese tax compliance',
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
        noimageindex: true,
        nocache: true,
    },
};
function RootLayout({ children, }) {
    return (<html lang="ja">
      <body className={inter.className}>
        <navigation_1.default />
        <main className="min-h-screen bg-gray-50 pt-24 lg:pt-16">
          {children}
        </main>
        <react_hot_toast_1.Toaster position="top-right"/>
      </body>
    </html>);
}
