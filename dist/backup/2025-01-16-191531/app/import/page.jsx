"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportPage;
const import_form_1 = __importDefault(require("./components/import-form"));
// import OCRUpload from './components/ocr-upload';  // 旧システムは無効化
const ocr_upload_azure_1 = __importDefault(require("./components/ocr-upload-azure"));
function ImportPage() {
    // 強制的にAzureコンポーネントを使用
    // const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    // const OCRComponent = useAzureMongoDB ? OCRUploadAzure : OCRUpload;
    const OCRComponent = ocr_upload_azure_1.default; // 常にAzureを使用
    return (<div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">データインポート</h1>
      
      {/* OCRアップロード */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">📸 領収書・請求書のOCR読み取り</h2>
          <p className="text-gray-600 text-sm">
            画像をアップロードすると、AIが自動的に内容を読み取って会計データに変換します。
          </p>
          <p className="text-blue-600 text-sm mt-1">
            ✨ Azure Form Recognizer + MongoDB GridFS を使用中
          </p>
        </div>
        
        <OCRComponent />
      </div>
      
      {/* CSVインポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">📊 freeeからのデータインポート</h2>
          <p className="text-gray-600 text-sm">
            freeeからエクスポートしたCSVファイルをアップロードして、データをインポートできます。
          </p>
        </div>
        
        <import_form_1.default />
      </div>
    </div>);
}
