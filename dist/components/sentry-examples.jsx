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
exports.SentryExamples = SentryExamples;
const Sentry = __importStar(require("@sentry/nextjs"));
const sentry_utils_1 = require("@/lib/sentry-utils");
/**
 * Sentryの実装例を示すコンポーネント
 */
function SentryExamples() {
    // 例1: UIアクションのトラッキング
    const handleSaveClick = () => {
        (0, sentry_utils_1.trackUIAction)("Save Invoice", {
            invoiceId: "INV-001",
            amount: 10000,
            customerId: "CUST-123",
        }, () => {
            // 実際の保存処理
            sentry_utils_1.logger.debug("Invoice saved");
        });
    };
    // 例2: APIコールのトラッキング
    const handleFetchData = async () => {
        try {
            const data = await (0, sentry_utils_1.trackAPICall)("GET", "/api/invoices", async () => {
                const response = await fetch("/api/invoices");
                if (!response.ok)
                    throw response;
                return response.json();
            });
            sentry_utils_1.logger.debug("Data fetched:", data);
        }
        catch (error) {
            // エラーは自動的にSentryに送信される
            sentry_utils_1.logger.error("Failed to fetch data");
        }
    };
    // 例3: エラーのキャプチャ
    const handleError = () => {
        try {
            throw new Error("テストエラー: 意図的に発生させたエラー");
        }
        catch (error) {
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
        Sentry.startSpan({
            op: "business.process",
            name: "Generate Monthly Report",
        }, async (parentSpan) => {
            // 子スパン1: データ取得
            await Sentry.startSpan({
                op: "db.query",
                name: "Fetch Monthly Data",
            }, async (span) => {
                span.setAttribute("month", "2025-01");
                // データベースクエリのシミュレーション
                await new Promise((resolve) => setTimeout(resolve, 100));
            });
            // 子スパン2: レポート生成
            await Sentry.startSpan({
                op: "report.generate",
                name: "Generate PDF",
            }, async (span) => {
                span.setAttribute("format", "pdf");
                span.setAttribute("pages", 10);
                // PDF生成のシミュレーション
                await new Promise((resolve) => setTimeout(resolve, 200));
            });
            parentSpan.setAttribute("report.status", "completed");
        });
    };
    // 例5: ロギング
    const handleLogging = () => {
        // 様々なレベルのログ
        sentry_utils_1.logger.trace("Starting process", { step: 1 });
        sentry_utils_1.logger.debug(sentry_utils_1.logger.fmt `User ${123} accessed the page`);
        sentry_utils_1.logger.info("Report generated successfully", {
            reportId: "RPT-001",
            pages: 5,
        });
        sentry_utils_1.logger.warn("API rate limit approaching", {
            current: 450,
            limit: 500,
        });
        sentry_utils_1.logger.error("Failed to send email", {
            recipient: "user@example.com",
            error: "SMTP connection failed",
        });
    };
    return (<div className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Sentry実装例</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={handleSaveClick} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          UIアクショントラッキング
        </button>

        <button onClick={handleFetchData} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          APIコールトラッキング
        </button>

        <button onClick={handleError} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          エラーキャプチャ
        </button>

        <button onClick={handleComplexOperation} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
          複雑な操作のトラッキング
        </button>

        <button onClick={handleLogging} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
          ロギング例
        </button>
      </div>
    </div>);
}
