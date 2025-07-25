"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GlobalError;
// import * as Sentry from "@sentry/nextjs";
// import Error from "next/error";
const react_1 = require("react");
function GlobalError({ error, reset, }) {
    (0, react_1.useEffect)(() => {
        // Sentry.captureException(error);
        console.error('Global error:', error);
    }, [error]);
    return (<html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-4">
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            <button onClick={reset} className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>);
}
