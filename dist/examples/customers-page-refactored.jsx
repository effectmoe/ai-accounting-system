"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomersPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
// 新しい共通コンポーネント
const PageLayout_1 = require("@/components/common/PageLayout");
const DataTable_1 = require("@/components/common/DataTable");
const SearchBar_1 = require("@/components/common/SearchBar");
const StatusBadge_1 = require("@/components/common/StatusBadge");
const LoadingState_1 = require("@/components/common/LoadingState");
// UI コンポーネント
const button_1 = require("@/components/ui/button");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const logger_1 = require("@/lib/logger");
// 定数
const ITEMS_PER_PAGE = 10;
// ヘルパー関数
function getPrimaryContact(customer) {
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
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    // State
    const [customers, setCustomers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const [selectedCustomers, setSelectedCustomers] = (0, react_1.useState)(new Set());
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    // URLパラメータから初期値を取得
    const initialPage = Number(searchParams.get('page')) || 1;
    const initialPageSize = Number(searchParams.get('pageSize')) || ITEMS_PER_PAGE;
    const initialSortField = searchParams.get('sortField') || 'createdAt';
    const initialSortOrder = searchParams.get('sortOrder') || 'desc';
    const initialSearch = searchParams.get('search') || '';
    const initialPrefecture = searchParams.get('prefecture') || '';
    const initialCity = searchParams.get('city') || '';
    const [page, setPage] = (0, react_1.useState)(initialPage);
    const [pageSize, setPageSize] = (0, react_1.useState)(initialPageSize);
    const [sortConfig, setSortConfig] = (0, react_1.useState)({
        key: initialSortField,
        direction: initialSortOrder,
    });
    const [searchQuery, setSearchQuery] = (0, react_1.useState)(initialSearch);
    const [filters, setFilters] = (0, react_1.useState)({
        prefecture: initialPrefecture,
        city: initialCity,
    });
    // カラム定義
    const columns = (0, react_1.useMemo)(() => [
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
            render: (customer) => (<link_1.default href={`/customers/${customer.id}`} className="text-blue-600 hover:underline font-medium">
          {customer.companyName}
        </link_1.default>),
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
                return (<div>
            <div className="font-medium">{contact.name}</div>
            {contact.email !== '-' && (<div className="text-sm text-gray-500">{contact.email}</div>)}
          </div>);
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
                return terms[customer.paymentTerms] || customer.paymentTerms;
            },
        },
        {
            key: 'status',
            label: 'ステータス',
            render: (customer) => (<StatusBadge_1.StatusBadge status={customer.isActive ? 'active' : 'inactive'} label={customer.isActive ? 'アクティブ' : '非アクティブ'}/>),
        },
        {
            key: 'createdAt',
            label: '作成日',
            sortable: true,
            render: (customer) => new Date(customer.createdAt).toLocaleDateString('ja-JP'),
        },
    ], []);
    // データ取得
    const fetchCustomers = (0, react_1.useCallback)(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                sortField: sortConfig.key,
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
        }
        catch (err) {
            const error = err;
            logger_1.logger.error('Failed to fetch customers', error);
            setError(error);
            react_hot_toast_1.toast.error('顧客データの取得に失敗しました');
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, sortConfig, searchQuery, filters]);
    // 初回データ取得
    (0, react_1.useEffect)(() => {
        fetchCustomers();
    }, [fetchCustomers]);
    // URL更新
    const updateURL = (0, react_1.useCallback)(() => {
        const params = new URLSearchParams();
        if (page !== 1)
            params.set('page', page.toString());
        if (pageSize !== ITEMS_PER_PAGE)
            params.set('pageSize', pageSize.toString());
        if (sortConfig.key !== 'createdAt')
            params.set('sortField', sortConfig.key);
        if (sortConfig.direction !== 'desc')
            params.set('sortOrder', sortConfig.direction);
        if (searchQuery)
            params.set('search', searchQuery);
        if (filters.prefecture)
            params.set('prefecture', filters.prefecture);
        if (filters.city)
            params.set('city', filters.city);
        const newURL = params.toString() ? `?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    }, [page, pageSize, sortConfig, searchQuery, filters]);
    (0, react_1.useEffect)(() => {
        updateURL();
    }, [updateURL]);
    // イベントハンドラー
    const handleSort = (column) => {
        setSortConfig(prev => ({
            key: column,
            direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
        setPage(1);
    };
    const handleSearch = (query) => {
        setSearchQuery(query);
        setPage(1);
    };
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };
    const handleDelete = async (customerId) => {
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
            react_hot_toast_1.toast.success('顧客を削除しました');
            await fetchCustomers();
        }
        catch (error) {
            logger_1.logger.error('Failed to delete customer', error);
            react_hot_toast_1.toast.error('顧客の削除に失敗しました');
        }
    };
    const handleBulkDelete = async (customerIds) => {
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
            react_hot_toast_1.toast.success(`${customerIds.length}件の顧客を削除しました`);
            setSelectedCustomers(new Set());
            await fetchCustomers();
        }
        catch (error) {
            logger_1.logger.error('Failed to bulk delete customers', error);
            react_hot_toast_1.toast.error('顧客の一括削除に失敗しました');
        }
    };
    // ページネーション設定
    const paginationConfig = {
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
            type: 'select',
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
            type: 'text',
        },
        {
            key: 'isActive',
            label: 'アクティブのみ',
            type: 'checkbox',
        },
    ];
    return (<PageLayout_1.PageLayout title="顧客管理" description="顧客情報の管理と編集を行います" breadcrumbs={[
            { label: '管理', href: '/admin' },
            { label: '顧客管理' },
        ]} actions={<>
          <button_1.Button variant="outline" onClick={() => react_hot_toast_1.toast.info('エクスポート機能は準備中です')}>
            <lucide_react_1.Download className="h-4 w-4 mr-2"/>
            エクスポート
          </button_1.Button>
          <button_1.Button variant="outline" onClick={() => react_hot_toast_1.toast.info('インポート機能は準備中です')}>
            <lucide_react_1.Upload className="h-4 w-4 mr-2"/>
            インポート
          </button_1.Button>
          <button_1.Button onClick={() => router.push('/customers/new')}>
            <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
            新規顧客
          </button_1.Button>
        </>}>
      <PageLayout_1.PageSection>
        <SearchBar_1.SearchBar placeholder="会社名、担当者名で検索..." value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} filters={filterConfigs} filterValues={filters} onFilterChange={handleFilterChange} showAdvanced={showFilters} onAdvancedToggle={() => setShowFilters(!showFilters)} className="mb-6"/>
        
        <DataTable_1.DataTable data={customers} columns={columns} loading={loading} error={error} sortConfig={sortConfig} onSort={handleSort} selection={{
            enabled: true,
            multiple: true,
        }} selectedItems={selectedCustomers} onSelectionChange={setSelectedCustomers} pagination={paginationConfig} onPageChange={setPage} onPageSizeChange={setPageSize} actions={(customer) => (<dropdown_menu_1.DropdownMenu>
              <dropdown_menu_1.DropdownMenuTrigger asChild>
                <button_1.Button variant="ghost" size="sm">
                  アクション
                </button_1.Button>
              </dropdown_menu_1.DropdownMenuTrigger>
              <dropdown_menu_1.DropdownMenuContent align="end">
                <dropdown_menu_1.DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
                  <lucide_react_1.Edit className="h-4 w-4 mr-2"/>
                  編集
                </dropdown_menu_1.DropdownMenuItem>
                <dropdown_menu_1.DropdownMenuItem onClick={() => handleDelete(customer.id)} className="text-red-600">
                  <lucide_react_1.Trash2 className="h-4 w-4 mr-2"/>
                  削除
                </dropdown_menu_1.DropdownMenuItem>
              </dropdown_menu_1.DropdownMenuContent>
            </dropdown_menu_1.DropdownMenu>)} bulkActions={[
            {
                label: '一括削除',
                onClick: handleBulkDelete,
                variant: 'destructive',
            },
        ]} emptyMessage="顧客が登録されていません" striped hoverable/>
      </PageLayout_1.PageSection>
    </PageLayout_1.PageLayout>);
}
// Suspenseでラップしたメインコンポーネント
function CustomersPage() {
    return (<react_1.Suspense fallback={<LoadingState_1.LoadingState fullPage message="顧客データを読み込んでいます..."/>}>
      <CustomersPageContent />
    </react_1.Suspense>);
}
