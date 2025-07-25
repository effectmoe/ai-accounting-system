"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportPage;
const import_form_1 = __importDefault(require("./components/import-form")); // freeeインポート機能
function ImportPage() {
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">freee データインポート</h1>
      
      {/* freee CSVインポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">📊 freeeからのデータインポート</h2>
          <p className="text-gray-600 text-sm">
            freeeからエクスポートしたCSVファイルをアップロードして、データをインポートできます。
          </p>
          <p className="text-blue-600 text-sm mt-2">
            💡 OCR機能をお探しの場合は、以下のページをご利用ください：
          </p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="text-gray-600">
              • <strong>一般的な書類:</strong> <a href="/documents/new" className="text-blue-600 hover:text-blue-800 underline">新規ドキュメント</a>
            </p>
            <p className="text-gray-600">
              • <strong>仕入先見積書:</strong> <a href="/supplier-quotes" className="text-blue-600 hover:text-blue-800 underline">仕入先見積書ページ</a>の「OCRスキャン」ボタン
            </p>
            <p className="text-gray-600">
              • <strong>仕入請求書:</strong> <a href="/purchase-invoices" className="text-blue-600 hover:text-blue-800 underline">仕入請求書ページ</a>の「OCRスキャン」ボタン
            </p>
          </div>
        </div>
        
        <import_form_1.default />
      </div>
    </div>);
}
