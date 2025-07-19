import React, { Suspense } from 'react';
import { LoadingState } from './LoadingState';

interface DynamicLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

/**
 * 動的インポートされたコンポーネントのラッパー
 * Suspenseとエラーバウンダリを提供
 */
export function DynamicLoader({ 
  children, 
  fallback,
  message = 'コンポーネントを読み込んでいます...' 
}: DynamicLoaderProps) {
  return (
    <Suspense fallback={fallback || <LoadingState message={message} />}>
      {children}
    </Suspense>
  );
}

// エラーバウンダリコンポーネント
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class DynamicErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dynamic import error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <p className="text-red-600">コンポーネントの読み込みに失敗しました</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ページを再読み込み
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}