"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentsPage;
const react_1 = require("react");
const DocumentsContentMongoDB_1 = __importDefault(require("./DocumentsContentMongoDB"));
function DocumentsPage() {
    console.log('🔵🔵🔵 DocumentsPage がレンダリングされました！');
    // 環境変数に基づいてコンポーネントを選択
    // 注意: NEXT_PUBLIC_USE_AZURE_MONGODB環境変数も確認
    const useAzureMongoDBServer = process.env.USE_AZURE_MONGODB === 'true';
    const useAzureMongoDBClient = process.env.NEXT_PUBLIC_USE_AZURE_MONGODB === 'true';
    const useAzureMongoDB = useAzureMongoDBServer || useAzureMongoDBClient;
    console.log('🟡🟡🟡 useAzureMongoDBServer:', useAzureMongoDBServer);
    console.log('🟡🟡🟡 useAzureMongoDBClient:', useAzureMongoDBClient);
    console.log('🟡🟡🟡 useAzureMongoDB (final):', useAzureMongoDB);
    // MongoDBコンポーネントを使用
    const Component = DocumentsContentMongoDB_1.default;
    console.log('🟢🟢🟢 使用するコンポーネント: DocumentsContentMongoDB');
    return (<react_1.Suspense fallback={<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>}>
      <Component />
    </react_1.Suspense>);
}
