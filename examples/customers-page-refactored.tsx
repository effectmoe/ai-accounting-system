'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';

// 新しい共通コンポーネント
import { PageLayout, PageSection } from '@/components/common/PageLayout';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/LoadingState';

// UI コンポーネント
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 型定義
import { Customer, SortableField, SortOrder, FilterState } from '@/types/collections';
import { TableColumn, SortConfig, PaginationConfig } from '@/types/common';
import { logger } from '@/lib/logger';

// 定数
const ITEMS_PER_PAGE = 10;

// ヘルパー関数
function getPrimaryContact(customer: Customer) {
  if (!customer.contacts || customer.contacts.length === 0) {
    return { name: '-', email: '-', phone: '-' };
  }
  
  const primaryContact = customer.contacts.find(c => c.isPrimary) || customer.contacts[0];
  return {
    name: primaryContact.name || '-',
    email: primaryContact.email || '-',
    phone: primaryContact.phone || '-',
  };
}

// メインコンポーネント
function CustomersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // URLパラメータから初期値を取得
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialPageSize = Number(searchParams.get('pageSize')) || ITEMS_PER_PAGE;
  const initialSortField = (searchParams.get('sortField') as SortableField) || 'createdAt';
  const initialSortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';
  const initialSearch = searchParams.get('search') || '';
  const initialPrefecture = searchParams.get('prefecture') || '';
  const initialCity = searchParams.get('city') || '';
  
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<SortConfig<Customer>>({
    key: initialSortField,
    direction: initialSortOrder,
  });
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filters, setFilters] = useState<Record<string, any>>({
    prefecture: initialPrefecture,
    city: initialCity,
  });
  
  // カラム定義
  const columns: TableColumn<Customer>[] = useMemo(() => [
    {
      key: 'customerId',
      label: '顧客ID',
      sortable: true,
      width: '100px',
    },
    {
      key: 'companyName',
      label: '会社名',
      sortable: true,
      render: (customer) => (
        <Link
          href={`/customers/${customer.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {customer.companyName}
        </Link>
      ),
    },
    {
      key: 'department',
      label: '部署',
      sortable: true,
    },
    {
      key: 'primaryContact',
      label: '担当者',
      render: (customer) => {
        const contact = getPrimaryContact(customer);
        return (
          <div>
            <div className="font-medium">{contact.name}</div>
            {contact.email !== '-' && (
              <div className="text-sm text-gray-500">{contact.email}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'phone',
      label: '電話番号',
      sortable: true,
    },
    {
      key: 'paymentTerms',
      label: '支払条件',
      sortable: true,
      render: (customer) => {
        const terms = {
          cash: '現金',
          transfer: '振込',
          endOfMonth: '月末締め',
          endOfNextMonth: '翌月末払い',
        };
        return terms[customer.paymentTerms as keyof typeof terms] || customer.paymentTerms;
      },
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (customer) => (
        <StatusBadge 
          status={customer.isActive ? 'active' : 'inactive'}
          label={customer.isActive ? 'アクティブ' : '非アクティブ'}
        />
      ),
    },
    {
      key: 'createdAt',
      label: '作成日',
      sortable: true,
      render: (customer) => 
        new Date(customer.createdAt).toLocaleDateString('ja-JP'),
    },
  ], []);
  
  // データ取得
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sortField: sortConfig.key as string,
        sortOrder: sortConfig.direction,
        ...(searchQuery && { search: searchQuery }),
        ...(filters.prefecture && { prefecture: filters.prefecture }),
        ...(filters.city && { city: filters.city }),
      });
      
      const response = await fetch(`/api/customers?${params}`);
      
      if (!response.ok) {
        throw new Error('顧客データの取得に失敗しました');
      }
      
      const data = await response.json();
      setCustomers(data.customers);
      setTotalCount(data.total);
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to fetch customers', error);
      setError(error);
      toast.error('顧客データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortConfig, searchQuery, filters]);
  
  // 初回データ取得
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  // URL更新
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (page !== 1) params.set('page', page.toString());
    if (pageSize !== ITEMS_PER_PAGE) params.set('pageSize', pageSize.toString());
    if (sortConfig.key !== 'createdAt') params.set('sortField', sortConfig.key as string);
    if (sortConfig.direction !== 'desc') params.set('sortOrder', sortConfig.direction);
    if (searchQuery) params.set('search', searchQuery);
    if (filters.prefecture) params.set('prefecture', filters.prefecture);
    if (filters.city) params.set('city', filters.city);
    
    const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
  }, [page, pageSize, sortConfig, searchQuery, filters]);
  
  useEffect(() => {
    updateURL();
  }, [updateURL]);
  
  // イベントハンドラー
  const handleSort = (column: keyof Customer) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };
  
  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPage(1);
  };
  
  const handleDelete = async (customerId: string) => {
    if (!window.confirm('この顧客を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('顧客の削除に失敗しました');
      }
      
      toast.success('顧客を削除しました');
      await fetchCustomers();
    } catch (error) {
      logger.error('Failed to delete customer', error);
      toast.error('顧客の削除に失敗しました');
    }
  };
  
  const handleBulkDelete = async (customerIds: string[]) => {
    if (!window.confirm(`${customerIds.length}件の顧客を削除してもよろしいですか？`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/customers/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: customerIds }),
      });
      
      if (!response.ok) {
        throw new Error('顧客の一括削除に失敗しました');
      }
      
      toast.success(`${customerIds.length}件の顧客を削除しました`);
      setSelectedCustomers(new Set());
      await fetchCustomers();
    } catch (error) {
      logger.error('Failed to bulk delete customers', error);
      toast.error('顧客の一括削除に失敗しました');
    }
  };
  
  // ページネーション設定
  const paginationConfig: PaginationConfig = {
    page,
    pageSize,
    total: totalCount,
    pageSizeOptions: [10, 20, 50, 100],
  };
  
  // フィルター設定
  const filterConfigs = [
    {
      key: 'prefecture',
      label: '都道府県',
      type: 'select' as const,
      options: [
        { value: '東京都', label: '東京都' },
        { value: '大阪府', label: '大阪府' },
        { value: '愛知県', label: '愛知県' },
        // その他の都道府県...
      ],
    },
    {
      key: 'city',
      label: '市区町村',
      type: 'text' as const,
    },
    {
      key: 'isActive',
      label: 'アクティブのみ',
      type: 'checkbox' as const,
    },
  ];
  
  return (
    <PageLayout
      title="顧客管理"
      description="顧客情報の管理と編集を行います"
      breadcrumbs={[
        { label: '管理', href: '/admin' },
        { label: '顧客管理' },
      ]}
      actions={
        <>
          <Button
            variant="outline"
            onClick={() => toast.info('エクスポート機能は準備中です')}
          >
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('インポート機能は準備中です')}
          >
            <Upload className="h-4 w-4 mr-2" />
            インポート
          </Button>
          <Button onClick={() => router.push('/customers/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新規顧客
          </Button>
        </>
      }
    >
      <PageSection>
        <SearchBar
          placeholder="会社名、担当者名で検索..."
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          filters={filterConfigs}
          filterValues={filters}
          onFilterChange={handleFilterChange}
          showAdvanced={showFilters}
          onAdvancedToggle={() => setShowFilters(!showFilters)}
          className="mb-6"
        />
        
        <DataTable
          data={customers}
          columns={columns}
          loading={loading}
          error={error}
          
          sortConfig={sortConfig}
          onSort={handleSort}
          
          selection={{
            enabled: true,
            multiple: true,
          }}
          selectedItems={selectedCustomers}
          onSelectionChange={setSelectedCustomers}
          
          pagination={paginationConfig}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          
          actions={(customer) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  アクション
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(customer.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          bulkActions={[
            {
              label: '一括削除',
              onClick: handleBulkDelete,
              variant: 'destructive',
            },
          ]}
          
          emptyMessage="顧客が登録されていません"
          striped
          hoverable
        />
      </PageSection>
    </PageLayout>
  );
}

// Suspenseでラップしたメインコンポーネント
export default function CustomersPage() {
  return (
    <Suspense fallback={<LoadingState fullPage message="顧客データを読み込んでいます..." />}>
      <CustomersPageContent />
    </Suspense>
  );
}