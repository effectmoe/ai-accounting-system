import React, { lazy } from 'react';
import dynamic from 'next/dynamic';
import { DynamicLoader, DynamicErrorBoundary } from '@/components/common/DynamicLoader';
import { useDynamicImport } from '@/hooks/useDynamicImport';

// 例1: React.lazy を使用した動的インポート
const LazyReportsPage = lazy(() => import('@/app/reports/page'));

export function Example1() {
  return (
    <DynamicErrorBoundary>
      <DynamicLoader message="レポートページを読み込んでいます...">
        <LazyReportsPage />
      </DynamicLoader>
    </DynamicErrorBoundary>
  );
}

// 例2: Next.js dynamic を使用（SSRを無効化）
const DynamicPDFViewer = dynamic(
  () => import('@/components/documents/PDFViewer').then(mod => mod.PDFViewer),
  {
    loading: () => <DynamicLoader message="PDFビューアを読み込んでいます..." />,
    ssr: false, // クライアントサイドのみでレンダリング
  }
);

export function Example2() {
  return <DynamicPDFViewer document="example.pdf" />;
}

// 例3: カスタムフックを使用した条件付き動的インポート
export function Example3() {
  const { module: recharts, loading, error } = useDynamicImport(
    () => import('recharts'),
    [] // 依存配列
  );

  if (loading) return <DynamicLoader message="グラフライブラリを読み込んでいます..." />;
  if (error) return <div>エラー: {error.message}</div>;
  if (!recharts) return null;

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = recharts;

  return (
    <LineChart width={600} height={300} data={[]}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  );
}

// 例4: ルートベースの自動コード分割（Next.js App Router）
// app/heavy-feature/page.tsx
const HeavyFeaturePage = dynamic(
  () => import('@/app/heavy-feature/components/HeavyComponent'),
  {
    loading: () => <DynamicLoader />,
  }
);

// 例5: 条件付きコンポーネントローディング
export function ConditionalDynamicImport({ showAdvanced }: { showAdvanced: boolean }) {
  const AdvancedFeatures = showAdvanced
    ? dynamic(() => import('@/components/AdvancedFeatures'), {
        loading: () => <DynamicLoader message="高度な機能を読み込んでいます..." />,
      })
    : () => null;

  return (
    <div>
      <h2>基本機能</h2>
      {/* 基本的なコンテンツ */}
      
      {showAdvanced && <AdvancedFeatures />}
    </div>
  );
}

// 例6: 大きなフォームコンポーネントの遅延読み込み
export const DynamicInvoiceForm = dynamic(
  () => import('@/components/invoices/InvoiceForm').then(mod => ({
    default: mod.InvoiceForm,
  })),
  {
    loading: () => <DynamicLoader message="請求書フォームを準備しています..." />,
    ssr: true, // SSRを有効にしてSEOを維持
  }
);

// 例7: モーダルコンポーネントの動的インポート
export function DynamicModalExample() {
  const [showModal, setShowModal] = React.useState(false);

  const DynamicModal = React.useMemo(
    () =>
      showModal
        ? dynamic(() => import('@/components/modals/ComplexModal'), {
            loading: () => <DynamicLoader message="モーダルを読み込んでいます..." />,
          })
        : () => null,
    [showModal]
  );

  return (
    <>
      <button onClick={() => setShowModal(true)}>モーダルを開く</button>
      {showModal && <DynamicModal onClose={() => setShowModal(false)} />}
    </>
  );
}