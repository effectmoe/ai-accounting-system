import { Suspense } from 'react';
import DocumentsContent from './DocumentsContent';

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}