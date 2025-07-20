"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sentryテストページ</h1>
      <p className="mb-4">
        このページはSentryが正しく設定されているかをテストするためのページです。
      </p>
      <div className="space-y-4">
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => {
            throw new Error("Sentryテストエラー: このエラーは意図的に発生させたものです");
          }}
        >
          エラーをSentryに送信
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {
            Sentry.captureMessage("Sentryテストメッセージ: 手動で送信されたメッセージです", "info");
            alert("メッセージがSentryに送信されました");
          }}
        >
          メッセージをSentryに送信
        </button>
      </div>
    </div>
  );
}