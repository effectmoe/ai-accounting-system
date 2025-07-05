import ImportForm from './components/import-form';

export default function ImportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">データインポート</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">freeeからのデータインポート</h2>
          <p className="text-gray-600 text-sm">
            freeeからエクスポートしたCSVファイルをアップロードして、データをインポートできます。
          </p>
        </div>
        
        <ImportForm />
      </div>
    </div>
  );
}