import { Suspense } from 'react';
import DocumentsContent from './DocumentsContent';
import DocumentsContentMongoDB from './DocumentsContentMongoDB';

export default function DocumentsPage() {
  // 環境変数に基づいてコンポーネントを選択
  const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
  const Component = useAzureMongoDB ? DocumentsContentMongoDB : DocumentsContent;
  
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