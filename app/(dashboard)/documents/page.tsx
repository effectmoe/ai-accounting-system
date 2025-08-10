import { Suspense } from 'react';
import DocumentsContent from './DocumentsContent';
import DocumentsContentMongoDB from './DocumentsContentMongoDB';

export default function DocumentsPage() {
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
  const Component = DocumentsContentMongoDB;
  console.log('🟢🟢🟢 使用するコンポーネント: DocumentsContentMongoDB');
  
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <Component />
    </Suspense>
  );
}