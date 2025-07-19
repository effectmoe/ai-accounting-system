"use client";

import * as Sentry from "@sentry/nextjs";
import { trackUIAction, trackAPICall, logger } from "@/lib/sentry-utils";

/**
 * Sentryの実装例を示すコンポーネント
 */
export function SentryExamples() {
  // 例1: UIアクションのトラッキング
  const handleSaveClick = () => {
    trackUIAction(
      "Save Invoice",
      {
        invoiceId: "INV-001",
        amount: 10000,
        customerId: "CUST-123",
      },
      () => {
        // 実際の保存処理
        console.log("Invoice saved");
      }
    );
  };

  // 例2: APIコールのトラッキング
  const handleFetchData = async () => {
    try {
      const data = await trackAPICall(
        "GET",
        "/api/invoices",
        async () => {
          const response = await fetch("/api/invoices");
          if (!response.ok) throw response;
          return response.json();
        }
      );
      console.log("Data fetched:", data);
    } catch (error) {
      // エラーは自動的にSentryに送信される
      console.error("Failed to fetch data");
    }
  };

  // 例3: エラーのキャプチャ
  const handleError = () => {
    try {
      throw new Error("テストエラー: 意図的に発生させたエラー");
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          section: "examples",
          severity: "low",
        },
        extra: {
          userId: "user123",
          action: "test_error",
        },
      });
    }
  };

  // 例4: カスタムスパンの作成
  const handleComplexOperation = () => {
    Sentry.startSpan(
      {
        op: "business.process",
        name: "Generate Monthly Report",
      },
      async (parentSpan) => {
        // 子スパン1: データ取得
        await Sentry.startSpan(
          {
            op: "db.query",
            name: "Fetch Monthly Data",
          },
          async (span) => {
            span.setAttribute("month", "2025-01");
            // データベースクエリのシミュレーション
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        );

        // 子スパン2: レポート生成
        await Sentry.startSpan(
          {
            op: "report.generate",
            name: "Generate PDF",
          },
          async (span) => {
            span.setAttribute("format", "pdf");
            span.setAttribute("pages", 10);
            // PDF生成のシミュレーション
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        );

        parentSpan.setAttribute("report.status", "completed");
      }
    );
  };

  // 例5: ロギング
  const handleLogging = () => {
    // 様々なレベルのログ
    logger.trace("Starting process", { step: 1 });
    logger.debug(logger.fmt`User ${123} accessed the page`);
    logger.info("Report generated successfully", {
      reportId: "RPT-001",
      pages: 5,
    });
    logger.warn("API rate limit approaching", {
      current: 450,
      limit: 500,
    });
    logger.error("Failed to send email", {
      recipient: "user@example.com",
      error: "SMTP connection failed",
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Sentry実装例</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleSaveClick}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          UIアクショントラッキング
        </button>

        <button
          onClick={handleFetchData}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          APIコールトラッキング
        </button>

        <button
          onClick={handleError}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          エラーキャプチャ
        </button>

        <button
          onClick={handleComplexOperation}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          複雑な操作のトラッキング
        </button>

        <button
          onClick={handleLogging}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          ロギング例
        </button>
      </div>
    </div>
  );
}