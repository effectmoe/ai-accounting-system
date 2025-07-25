"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentsPage;
const react_1 = require("react");
const DocumentsContent_1 = __importDefault(require("./DocumentsContent"));
const DocumentsContentMongoDB_1 = __importDefault(require("./DocumentsContentMongoDB"));
function DocumentsPage() {
    // 環境変数に基づいてコンポーネントを選択
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    const Component = useAzureMongoDB ? DocumentsContentMongoDB_1.default : DocumentsContent_1.default;
    return (<react_1.Suspense fallback={<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>}>
      <Component />
    </react_1.Suspense>);
}
