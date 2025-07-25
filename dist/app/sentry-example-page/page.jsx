"use strict";
"use client";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SentryExamplePage;
const Sentry = __importStar(require("@sentry/nextjs"));
function SentryExamplePage() {
    return (<div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sentryテストページ</h1>
      <p className="mb-4">
        このページはSentryが正しく設定されているかをテストするためのページです。
      </p>
      <div className="space-y-4">
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => {
            throw new Error("Sentryテストエラー: このエラーは意図的に発生させたものです");
        }}>
          エラーをSentryに送信
        </button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => {
            Sentry.captureMessage("Sentryテストメッセージ: 手動で送信されたメッセージです", "info");
            alert("メッセージがSentryに送信されました");
        }}>
          メッセージをSentryに送信
        </button>
      </div>
    </div>);
}
