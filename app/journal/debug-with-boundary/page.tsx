'use client';

import { ErrorBoundary } from '@/components/error-boundary';
import DebugPageContent from '../debug/page';

export default function DebugWithBoundaryPage() {
  return (
    <ErrorBoundary>
      <DebugPageContent />
    </ErrorBoundary>
  );
}