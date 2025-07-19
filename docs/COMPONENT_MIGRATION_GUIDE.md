# コンポーネント移行ガイド

## 概要

このガイドは、既存のコンポーネントを新しい共通コンポーネントライブラリに移行する方法を説明します。

## 移行前後の比較

### 1. DataTable の移行

**Before:**
```tsx
// app/customers/page.tsx (1500行以上の複雑なコード)
<div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr>
        {/* 手動でソート、選択、カラムを実装 */}
      </tr>
    </thead>
    <tbody>
      {customers.map(customer => (
        {/* 手動でローディング、空状態、ページネーションを実装 */}
      ))}
    </tbody>
  </table>
</div>
```

**After:**
```tsx
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';

const columns = [
  { 
    key: 'name', 
    label: '顧客名', 
    sortable: true 
  },
  { 
    key: 'email', 
    label: 'メール', 
    sortable: true 
  },
  { 
    key: 'status', 
    label: 'ステータス',
    render: (customer) => <StatusBadge status={customer.status} />
  },
];

<DataTable
  data={customers}
  columns={columns}
  loading={loading}
  sortConfig={sortConfig}
  onSort={handleSort}
  selection={{ enabled: true, multiple: true }}
  pagination={{
    page,
    pageSize,
    total: totalCustomers,
  }}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
  actions={(customer) => (
    <Button size="sm" variant="ghost">編集</Button>
  )}
/>
```

### 2. ローディング状態の統一

**Before:**
```tsx
// 3種類の異なるローディング実装
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
<Loader2 className="h-4 w-4 animate-spin" />
<div className="flex h-screen items-center justify-center">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
</div>
```

**After:**
```tsx
import { LoadingState } from '@/components/common/LoadingState';

// インライン
<LoadingState size="sm" />

// メッセージ付き
<LoadingState message="データを読み込んでいます..." />

// フルページ
<LoadingState fullPage />
```

### 3. フォームフィールドの統一

**Before:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">
    名前 <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
  {errors.name && (
    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
  )}
</div>
```

**After:**
```tsx
import { TextField } from '@/components/forms/FormField';

<TextField
  label="名前"
  name="name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  required
  hint="フルネームを入力してください"
/>
```

### 4. ステータスバッジの統一

**Before:**
```tsx
// 各ファイルで独自のステータス表示
<span className={`px-2 py-1 rounded-full text-xs ${
  status === 'active' ? 'bg-green-100 text-green-800' :
  status === 'inactive' ? 'bg-gray-100 text-gray-800' :
  'bg-red-100 text-red-800'
}`}>
  {status}
</span>
```

**After:**
```tsx
import { StatusBadge } from '@/components/common/StatusBadge';

<StatusBadge status={status} size="sm" />

// カスタムラベル
<StatusBadge status="processing" label="処理中..." />

// 請求書専用
<InvoiceStatusBadge status={invoice.status} />
```

### 5. ページレイアウトの統一

**Before:**
```tsx
<div className="min-h-screen bg-gray-100">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900">顧客管理</h1>
    </div>
    <div className="mt-8">
      {/* コンテンツ */}
    </div>
  </div>
</div>
```

**After:**
```tsx
import { PageLayout, PageSection } from '@/components/common/PageLayout';
import { Button } from '@/components/ui/button';

<PageLayout
  title="顧客管理"
  description="顧客情報の管理と編集を行います"
  breadcrumbs={[
    { label: '管理', href: '/admin' },
    { label: '顧客管理' }
  ]}
  actions={
    <Button onClick={() => router.push('/customers/new')}>
      新規顧客
    </Button>
  }
>
  <PageSection title="顧客一覧">
    <DataTable {...tableProps} />
  </PageSection>
  
  <PageSection 
    title="統計" 
    description="過去30日間の統計情報"
  >
    {/* 統計コンテンツ */}
  </PageSection>
</PageLayout>
```

### 6. 検索バーの統一

**Before:**
```tsx
<div className="flex gap-4">
  <input 
    type="text" 
    placeholder="検索..."
    className="..."
    onChange={handleSearch}
  />
  <select onChange={handleFilter}>
    <option>すべて</option>
    <option>アクティブ</option>
  </select>
</div>
```

**After:**
```tsx
import { SearchBar } from '@/components/common/SearchBar';

<SearchBar
  placeholder="顧客を検索..."
  onSearch={handleSearch}
  filters={[
    {
      key: 'status',
      label: 'ステータス',
      type: 'select',
      options: [
        { value: 'active', label: 'アクティブ' },
        { value: 'inactive', label: '非アクティブ' }
      ]
    },
    {
      key: 'created',
      label: '作成日',
      type: 'date'
    }
  ]}
  onFilterChange={handleFilterChange}
  showAdvanced={showFilters}
  onAdvancedToggle={() => setShowFilters(!showFilters)}
/>
```

## 移行の優先順位

### Phase 1: 高インパクト（1-2週間）
1. **DataTable** - `/app/customers/page.tsx`, `/app/invoices/page.tsx`, `/app/products/page.tsx`
2. **LoadingState/EmptyState** - 全ページ
3. **StatusBadge** - 全テーブル表示

### Phase 2: 中インパクト（1週間）
1. **FormField** - すべてのフォーム
2. **SearchBar** - リスト画面
3. **PageLayout** - 全ページのレイアウト

### Phase 3: 低インパクト（随時）
1. その他の細かいコンポーネント
2. スタイルの微調整
3. アクセシビリティの改善

## 移行手順

1. **インポートの追加**
   ```tsx
   import { DataTable } from '@/components/common/DataTable';
   import { LoadingState } from '@/components/common/LoadingState';
   // etc...
   ```

2. **既存コードの削除**
   - 手動実装のテーブル、ローディング、ページネーションを削除

3. **新コンポーネントの実装**
   - プロップスに必要なデータを渡す
   - イベントハンドラーを接続

4. **スタイルの調整**
   - 必要に応じてclassNameプロップでカスタマイズ

5. **テスト**
   - 機能が正しく動作することを確認
   - レスポンシブデザインの確認

## 注意事項

- 一度に大きな変更をせず、段階的に移行する
- 各移行後に十分なテストを行う
- カスタマイズが必要な場合は、共通コンポーネントを拡張する
- チーム内で移行状況を共有する

## サポート

移行中に問題が発生した場合は、以下を確認してください：
- コンポーネントのPropsドキュメント
- 既存の使用例
- TypeScriptの型定義