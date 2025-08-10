import dynamic from 'next/dynamic';

const DebugPage = dynamic(
  () => import('../debug/page'),
  { 
    ssr: false,
    loading: () => <div className="p-8">Loading debug page...</div>
  }
);

export default function DebugWrapperPage() {
  return <DebugPage />;
}