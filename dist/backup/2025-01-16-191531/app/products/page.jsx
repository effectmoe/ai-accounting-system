"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
const core_1 = require("@dnd-kit/core");
const sortable_1 = require("@dnd-kit/sortable");
const sortable_2 = require("@dnd-kit/sortable");
const utilities_1 = require("@dnd-kit/utilities");
const ITEMS_PER_PAGE = 20;
// カラム設定のLocalStorageキー
const COLUMN_VISIBILITY_STORAGE_KEY = 'products-column-visibility';
const STORAGE_VERSION = 1;
// デフォルトのカラム表示設定（順序付き）
const DEFAULT_COLUMN_CONFIGS = [
    { key: 'productCode', visible: true, order: 0 },
    { key: 'productName', visible: true, order: 1 }, // 必須
    { key: 'category', visible: true, order: 2 },
    { key: 'unitPrice', visible: true, order: 3 },
    { key: 'stockQuantity', visible: true, order: 4 },
    { key: 'unit', visible: true, order: 5 },
    { key: 'taxRate', visible: true, order: 6 },
    { key: 'description', visible: false, order: 7 },
    { key: 'tags', visible: false, order: 8 },
    { key: 'createdAt', visible: true, order: 9 },
    { key: 'updatedAt', visible: false, order: 10 },
];
// useColumnVisibility カスタムフック（順序管理機能付き）
function useColumnVisibility() {
    const [columnConfigs, setColumnConfigsState] = (0, react_1.useState)(DEFAULT_COLUMN_CONFIGS);
    const [showColumnSettings, setShowColumnSettings] = (0, react_1.useState)(false);
    // LocalStorageから設定を読み込み
    (0, react_1.useEffect)(() => {
        try {
            const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
            if (saved) {
                const parsedData = JSON.parse(saved);
                // バージョンチェック
                if (parsedData.version === STORAGE_VERSION && Array.isArray(parsedData.columns)) {
                    setColumnConfigsState(parsedData.columns);
                }
            }
        }
        catch (error) {
            console.error('Failed to load column visibility settings:', error);
        }
    }, []);
    // 設定をLocalStorageに保存
    const saveColumnConfigs = (0, react_1.useCallback)((configs) => {
        setColumnConfigsState(configs);
        try {
            const data = {
                version: STORAGE_VERSION,
                columns: configs,
            };
            localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(data));
        }
        catch (error) {
            console.error('Failed to save column visibility settings:', error);
        }
    }, []);
    // 個別カラムの表示/非表示切り替え
    const toggleColumn = (0, react_1.useCallback)((columnKey) => {
        const newConfigs = columnConfigs.map(config => config.key === columnKey
            ? { ...config, visible: !config.visible }
            : config);
        saveColumnConfigs(newConfigs);
    }, [columnConfigs, saveColumnConfigs]);
    // カラムの順序変更
    const reorderColumns = (0, react_1.useCallback)((activeKey, overKey) => {
        const oldIndex = columnConfigs.findIndex(config => config.key === activeKey);
        const newIndex = columnConfigs.findIndex(config => config.key === overKey);
        if (oldIndex !== -1 && newIndex !== -1) {
            const newConfigs = (0, sortable_1.arrayMove)(columnConfigs, oldIndex, newIndex);
            // 順序番号を再割り当て
            const reorderedConfigs = newConfigs.map((config, index) => ({
                ...config,
                order: index,
            }));
            saveColumnConfigs(reorderedConfigs);
        }
    }, [columnConfigs, saveColumnConfigs]);
    // 設定リセット
    const resetColumnSettings = (0, react_1.useCallback)(() => {
        saveColumnConfigs(DEFAULT_COLUMN_CONFIGS);
    }, [saveColumnConfigs]);
    // 旧形式の互換性のためのgetter
    const columnVisibility = (0, react_1.useMemo)(() => {
        const visibility = {};
        columnConfigs.forEach(config => {
            visibility[config.key] = config.visible;
        });
        return visibility;
    }, [columnConfigs]);
    return {
        columnConfigs,
        columnVisibility,
        toggleColumn,
        reorderColumns,
        resetColumnSettings,
        showColumnSettings,
        setShowColumnSettings,
    };
}
function ProductsPageContent() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [products, setProducts] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [totalPages, setTotalPages] = (0, react_1.useState)(1);
    const [totalItems, setTotalItems] = (0, react_1.useState)(0);
    const [selectedProducts, setSelectedProducts] = (0, react_1.useState)(new Set());
    const [sortBy, setSortBy] = (0, react_1.useState)('createdAt');
    const [sortOrder, setSortOrder] = (0, react_1.useState)('desc');
    // ステータス更新中の商品IDを管理
    const [updatingStatus, setUpdatingStatus] = (0, react_1.useState)(new Set());
    // フィルター関連の状態
    const [filters, setFilters] = (0, react_1.useState)({});
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    // カラム表示設定
    const { columnConfigs, columnVisibility, toggleColumn, reorderColumns, resetColumnSettings, showColumnSettings, setShowColumnSettings, } = useColumnVisibility();
    // カラム設定ドロップダウンの外部クリック処理
    const columnSettingsRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const handleClickOutside = (event) => {
            if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target)) {
                setShowColumnSettings(false);
            }
        };
        if (showColumnSettings) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showColumnSettings, setShowColumnSettings]);
    // デバウンス用のref
    const searchDebounceRef = (0, react_1.useRef)();
    const filterDebounceRef = (0, react_1.useRef)();
    // カラム定義
    const columnDefinitions = (0, react_1.useMemo)(() => [
        {
            key: 'productCode',
            label: '商品コード',
            sortable: true,
            render: (product) => product.productCode,
        },
        {
            key: 'productName',
            label: '商品名',
            required: true,
            sortable: true,
            render: (product) => (<div>
          <div className="font-medium">{product.productName}</div>
          {product.productNameKana && (<div className="text-xs text-gray-500">{product.productNameKana}</div>)}
        </div>),
        },
        {
            key: 'category',
            label: 'カテゴリ',
            sortable: true,
            render: (product) => (<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {product.category || '-'}
        </span>),
        },
        {
            key: 'unitPrice',
            label: '単価',
            sortable: true,
            render: (product) => `¥${product.unitPrice.toLocaleString()}`,
        },
        {
            key: 'stockQuantity',
            label: '在庫数',
            sortable: true,
            render: (product) => {
                const quantity = product.stockQuantity || 0;
                const colorClass = quantity === 0 ? 'text-red-600' : quantity < 10 ? 'text-yellow-600' : 'text-gray-900';
                return <span className={colorClass}>{quantity}</span>;
            },
        },
        {
            key: 'unit',
            label: '単位',
            sortable: false,
            render: (product) => product.unit || '-',
        },
        {
            key: 'taxRate',
            label: '税率',
            sortable: true,
            render: (product) => {
                const rate = (product.taxRate || 0) * 100;
                return `${rate.toFixed(0)}%`;
            },
        },
        {
            key: 'description',
            label: '説明',
            sortable: false,
            render: (product) => (<div className="max-w-xs truncate" title={product.description}>
          {product.description || '-'}
        </div>),
        },
        {
            key: 'tags',
            label: 'タグ',
            sortable: false,
            render: (product) => product.tags?.length ? (<div className="flex gap-1 flex-wrap">
          {product.tags.map((tag, index) => (<span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {tag}
            </span>))}
        </div>) : '-',
        },
        {
            key: 'createdAt',
            label: '登録日',
            sortable: true,
            render: (product) => product.createdAt ? new Date(product.createdAt).toLocaleDateString('ja-JP') : '-',
        },
        {
            key: 'updatedAt',
            label: '更新日',
            sortable: false,
            render: (product) => product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('ja-JP') : '-',
        },
    ], []);
    // 表示対象のカラム（順序を考慮）
    const visibleColumns = (0, react_1.useMemo)(() => {
        // カラム設定を順序でソート
        const sortedConfigs = [...columnConfigs].sort((a, b) => a.order - b.order);
        // 表示するカラムのみを取得し、定義と結合
        const visible = [];
        sortedConfigs.forEach(config => {
            if (config.visible || columnDefinitions.find(def => def.key === config.key)?.required) {
                const definition = columnDefinitions.find(def => def.key === config.key);
                if (definition) {
                    visible.push(definition);
                }
            }
        });
        return visible;
    }, [columnDefinitions, columnConfigs]);
    // 商品一覧を取得
    const fetchProducts = (0, react_1.useCallback)(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                q: searchTerm,
                sortBy: sortBy,
                sortOrder: sortOrder,
            });
            // フィルターパラメータを追加
            if (filters.isActive !== undefined) {
                params.set('isActive', filters.isActive.toString());
            }
            if (filters.category) {
                params.set('category', filters.category);
            }
            if (filters.unitPriceMin !== undefined) {
                params.set('unitPriceMin', filters.unitPriceMin.toString());
            }
            if (filters.unitPriceMax !== undefined) {
                params.set('unitPriceMax', filters.unitPriceMax.toString());
            }
            if (filters.stockQuantityMin !== undefined) {
                params.set('stockQuantityMin', filters.stockQuantityMin.toString());
            }
            if (filters.stockQuantityMax !== undefined) {
                params.set('stockQuantityMax', filters.stockQuantityMax.toString());
            }
            if (filters.taxRates && filters.taxRates.length > 0) {
                params.set('taxRates', filters.taxRates.join(','));
            }
            if (filters.createdAtStart) {
                params.set('createdAtStart', filters.createdAtStart);
            }
            if (filters.createdAtEnd) {
                params.set('createdAtEnd', filters.createdAtEnd);
            }
            const response = await fetch(`/api/products?${params}`);
            if (!response.ok) {
                throw new Error('商品データの取得に失敗しました');
            }
            const data = await response.json();
            // APIレスポンスの形式に応じて処理
            if (data.products && Array.isArray(data.products)) {
                setProducts(data.products.map((p) => ({
                    ...p,
                    id: p.id || p._id?.toString()
                })));
                setTotalItems(data.total || data.products.length);
                setTotalPages(Math.ceil((data.total || data.products.length) / ITEMS_PER_PAGE));
            }
            else if (Array.isArray(data)) {
                // 配列が直接返される場合
                setProducts(data.map((p) => ({
                    ...p,
                    id: p.id || p._id?.toString()
                })));
                setTotalItems(data.length);
                setTotalPages(Math.ceil(data.length / ITEMS_PER_PAGE));
            }
            else {
                throw new Error('予期しないレスポンス形式');
            }
        }
        catch (error) {
            console.error('Error loading products:', error);
            react_hot_toast_1.toast.error('商品データの読み込みに失敗しました');
        }
        finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, sortBy, sortOrder, filters]);
    // カテゴリ一覧を取得
    const fetchCategories = (0, react_1.useCallback)(async () => {
        try {
            const response = await fetch('/api/products/categories');
            if (!response.ok) {
                throw new Error('カテゴリ一覧の取得に失敗しました');
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                setCategories(data);
            }
        }
        catch (err) {
            console.error('カテゴリ一覧取得エラー:', err);
        }
    }, []);
    // URLパラメータから初期状態を設定
    (0, react_1.useEffect)(() => {
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';
        const sortByParam = searchParams.get('sortBy');
        const sortOrderParam = searchParams.get('sortOrder');
        setCurrentPage(page);
        setSearchTerm(search);
        if (sortByParam && ['productCode', 'productName', 'category', 'unitPrice', 'stockQuantity', 'taxRate', 'createdAt'].includes(sortByParam)) {
            setSortBy(sortByParam);
        }
        if (sortOrderParam && ['asc', 'desc'].includes(sortOrderParam)) {
            setSortOrder(sortOrderParam);
        }
        // フィルターパラメータの復元
        const newFilters = {};
        const isActiveParam = searchParams.get('isActive');
        if (isActiveParam !== null) {
            newFilters.isActive = isActiveParam === 'true';
        }
        const category = searchParams.get('category');
        if (category) {
            newFilters.category = category;
        }
        const unitPriceMin = searchParams.get('unitPriceMin');
        if (unitPriceMin) {
            const min = parseInt(unitPriceMin);
            if (!isNaN(min)) {
                newFilters.unitPriceMin = min;
            }
        }
        const unitPriceMax = searchParams.get('unitPriceMax');
        if (unitPriceMax) {
            const max = parseInt(unitPriceMax);
            if (!isNaN(max)) {
                newFilters.unitPriceMax = max;
            }
        }
        const stockQuantityMin = searchParams.get('stockQuantityMin');
        if (stockQuantityMin) {
            const min = parseInt(stockQuantityMin);
            if (!isNaN(min)) {
                newFilters.stockQuantityMin = min;
            }
        }
        const stockQuantityMax = searchParams.get('stockQuantityMax');
        if (stockQuantityMax) {
            const max = parseInt(stockQuantityMax);
            if (!isNaN(max)) {
                newFilters.stockQuantityMax = max;
            }
        }
        const taxRates = searchParams.get('taxRates');
        if (taxRates) {
            newFilters.taxRates = taxRates.split(',').map(rate => parseFloat(rate)).filter(rate => !isNaN(rate));
        }
        const createdAtStart = searchParams.get('createdAtStart');
        if (createdAtStart) {
            newFilters.createdAtStart = createdAtStart;
        }
        const createdAtEnd = searchParams.get('createdAtEnd');
        if (createdAtEnd) {
            newFilters.createdAtEnd = createdAtEnd;
        }
        setFilters(newFilters);
        // フィルターが設定されている場合はフィルターパネルを開く
        const hasFilters = Object.keys(newFilters).length > 0;
        setShowFilters(hasFilters);
    }, [searchParams]);
    (0, react_1.useEffect)(() => {
        fetchCategories();
    }, [fetchCategories]);
    (0, react_1.useEffect)(() => {
        fetchProducts();
    }, [fetchProducts]);
    // URLパラメータを更新
    const updateURL = (0, react_1.useCallback)(() => {
        const params = new URLSearchParams();
        if (currentPage > 1)
            params.set('page', currentPage.toString());
        if (searchTerm)
            params.set('search', searchTerm);
        if (sortBy !== 'createdAt')
            params.set('sortBy', sortBy);
        if (sortOrder !== 'desc')
            params.set('sortOrder', sortOrder);
        // フィルターパラメータの追加
        if (filters.isActive !== undefined) {
            params.set('isActive', filters.isActive.toString());
        }
        if (filters.category) {
            params.set('category', filters.category);
        }
        if (filters.unitPriceMin !== undefined) {
            params.set('unitPriceMin', filters.unitPriceMin.toString());
        }
        if (filters.unitPriceMax !== undefined) {
            params.set('unitPriceMax', filters.unitPriceMax.toString());
        }
        if (filters.stockQuantityMin !== undefined) {
            params.set('stockQuantityMin', filters.stockQuantityMin.toString());
        }
        if (filters.stockQuantityMax !== undefined) {
            params.set('stockQuantityMax', filters.stockQuantityMax.toString());
        }
        if (filters.taxRates && filters.taxRates.length > 0) {
            params.set('taxRates', filters.taxRates.join(','));
        }
        if (filters.createdAtStart) {
            params.set('createdAtStart', filters.createdAtStart);
        }
        if (filters.createdAtEnd) {
            params.set('createdAtEnd', filters.createdAtEnd);
        }
        const queryString = params.toString();
        const newURL = queryString ? `?${queryString}` : '';
        if (window.location.search !== newURL) {
            router.replace(`/products${newURL}`, { scroll: false });
        }
    }, [currentPage, searchTerm, sortBy, sortOrder, filters, router]);
    (0, react_1.useEffect)(() => {
        updateURL();
    }, [updateURL]);
    // ソート処理
    const handleSort = (field) => {
        if (sortBy === field) {
            // 同じフィールドの場合は順序を切り替え
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        }
        else {
            // 異なるフィールドの場合は昇順から開始
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1); // ソート変更時はページをリセット
    };
    // ソートアイコンコンポーネント
    const SortIcon = ({ field }) => {
        if (sortBy !== field) {
            return <lucide_react_1.ChevronsUpDown className="w-4 h-4 text-gray-400"/>;
        }
        return sortOrder === 'asc' ?
            <lucide_react_1.ChevronUp className="w-4 h-4 text-blue-600"/> :
            <lucide_react_1.ChevronDown className="w-4 h-4 text-blue-600"/>;
    };
    // 商品削除
    const handleDeleteProduct = async (productId) => {
        if (!confirm('この商品を削除してもよろしいですか？')) {
            return;
        }
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('商品の削除に失敗しました');
            }
            react_hot_toast_1.toast.success('商品を削除しました');
            fetchProducts();
        }
        catch (error) {
            console.error('削除エラー:', error);
            react_hot_toast_1.toast.error('商品の削除に失敗しました');
        }
    };
    // ステータス更新
    const handleStatusUpdate = async (productId, newStatus) => {
        // すでに更新中の場合は処理しない
        if (updatingStatus.has(productId)) {
            return;
        }
        // 楽観的更新: UIを即座に更新
        const originalProducts = [...products];
        setProducts(prev => prev.map(product => {
            const id = product.id || product._id?.toString() || '';
            if (id === productId) {
                return { ...product, isActive: newStatus };
            }
            return product;
        }));
        // 更新中状態をセット
        setUpdatingStatus(prev => new Set([...prev, productId]));
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isActive: newStatus }),
            });
            if (!response.ok) {
                throw new Error('ステータスの更新に失敗しました');
            }
            const data = await response.json();
            // 成功時のトースト表示
            react_hot_toast_1.toast.success(`ステータスを${newStatus ? 'アクティブ' : '非アクティブ'}に更新しました`);
            // サーバーからの最新データで更新（念のため）
            if (data) {
                setProducts(prev => prev.map(product => {
                    const id = product.id || product._id?.toString() || '';
                    if (id === productId) {
                        return {
                            ...product,
                            isActive: data.isActive ?? newStatus
                        };
                    }
                    return product;
                }));
            }
        }
        catch (error) {
            console.error('ステータス更新エラー:', error);
            // エラー時は元の状態に戻す
            setProducts(originalProducts);
            // エラートースト表示
            const errorMessage = error instanceof Error ? error.message : 'ステータスの更新に失敗しました';
            react_hot_toast_1.toast.error(errorMessage);
        }
        finally {
            // 更新中状態を解除
            setUpdatingStatus(prev => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
            });
        }
    };
    // 複数選択
    const toggleProductSelection = (productId) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            }
            else {
                newSet.add(productId);
            }
            return newSet;
        });
    };
    const selectAllProducts = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        }
        else {
            setSelectedProducts(new Set(products.map(product => product.id || product._id?.toString() || '')));
        }
    };
    // 一括削除
    const deleteSelectedProducts = async () => {
        if (selectedProducts.size === 0)
            return;
        if (!confirm(`選択した${selectedProducts.size}件の商品を削除しますか？`)) {
            return;
        }
        try {
            const deletePromises = Array.from(selectedProducts).map(productId => fetch(`/api/products/${productId}`, { method: 'DELETE' }));
            const results = await Promise.all(deletePromises);
            const failedDeletions = results.filter(r => !r.ok).length;
            if (failedDeletions > 0) {
                react_hot_toast_1.toast.error(`${failedDeletions}件の削除に失敗しました`);
            }
            else {
                react_hot_toast_1.toast.success(`${selectedProducts.size}件の商品を削除しました`);
            }
            setSelectedProducts(new Set());
            fetchProducts();
        }
        catch (error) {
            console.error('Error deleting products:', error);
            react_hot_toast_1.toast.error('削除に失敗しました');
        }
    };
    // 一括ステータス変更
    const updateSelectedProductsStatus = async (newStatus) => {
        if (selectedProducts.size === 0)
            return;
        if (!confirm(`選択した${selectedProducts.size}件の商品を${newStatus ? 'アクティブ' : '非アクティブ'}にしますか？`)) {
            return;
        }
        try {
            const updatePromises = Array.from(selectedProducts).map(productId => fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus })
            }));
            const results = await Promise.all(updatePromises);
            const failedUpdates = results.filter(r => !r.ok).length;
            if (failedUpdates > 0) {
                react_hot_toast_1.toast.error(`${failedUpdates}件の更新に失敗しました`);
            }
            else {
                react_hot_toast_1.toast.success(`${selectedProducts.size}件の商品を${newStatus ? 'アクティブ' : '非アクティブ'}にしました`);
            }
            setSelectedProducts(new Set());
            fetchProducts();
        }
        catch (error) {
            console.error('Error updating products:', error);
            react_hot_toast_1.toast.error('更新に失敗しました');
        }
    };
    // フィルター処理（デバウンス付き）
    const handleFilterChange = (0, react_1.useCallback)((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setCurrentPage(1); // フィルター変更時はページをリセット
        // デバウンス処理
        if (filterDebounceRef.current) {
            clearTimeout(filterDebounceRef.current);
        }
        filterDebounceRef.current = setTimeout(() => {
            // フィルター変更後のfetchProductsは自動的にuseEffectで実行される
        }, 300);
    }, []);
    // フィルターリセット
    const resetFilters = () => {
        setFilters({});
        setCurrentPage(1);
    };
    // フィルターチップ削除
    const removeFilter = (key) => {
        const newFilters = { ...filters };
        delete newFilters[key];
        setFilters(newFilters);
        setCurrentPage(1);
    };
    // アクティブなフィルター数を取得
    const getActiveFilterCount = () => {
        return Object.keys(filters).length;
    };
    // ドラッグ可能なカラム項目コンポーネント
    const SortableColumnItem = ({ column, config }) => {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging, } = (0, sortable_2.useSortable)({ id: column.key });
        const style = {
            transform: utilities_1.CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };
        const isDisabled = column.required;
        return (<div ref={setNodeRef} style={style} className={`flex items-center gap-2 p-2 bg-white rounded border ${isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200'} ${isDisabled ? 'opacity-60' : ''}`}>
        <div {...attributes} {...listeners} className={`cursor-grab active:cursor-grabbing ${isDisabled ? 'invisible' : ''}`}>
          <lucide_react_1.GripVertical className="w-4 h-4 text-gray-400"/>
        </div>
        <label className="flex items-center gap-2 flex-1 cursor-pointer">
          <input type="checkbox" checked={config.visible} disabled={isDisabled} onChange={() => !isDisabled && toggleColumn(column.key)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
          <span className="text-sm text-gray-700">
            {column.label}
            {column.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      </div>);
    };
    // カラム設定ドロップダウン
    const ColumnSettingsDropdown = () => {
        const sensors = (0, core_1.useSensors)((0, core_1.useSensor)(core_1.PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }), (0, core_1.useSensor)(core_1.KeyboardSensor, {
            coordinateGetter: sortable_1.sortableKeyboardCoordinates,
        }));
        const handleDragEnd = (event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                reorderColumns(active.id, over.id);
            }
        };
        if (!showColumnSettings)
            return null;
        // 順序でソートされたカラム設定
        const sortedConfigs = [...columnConfigs].sort((a, b) => a.order - b.order);
        const sortableItems = sortedConfigs.map(config => config.key);
        return (<div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">表示項目の設定</h3>
            <button onClick={() => setShowColumnSettings(false)} className="text-gray-400 hover:text-gray-600">
              <lucide_react_1.X className="w-4 h-4"/>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ドラッグ＆ドロップで項目の並び順を変更できます
          </p>
        </div>
        <div className="p-3 max-h-96 overflow-y-auto">
          <core_1.DndContext sensors={sensors} collisionDetection={core_1.closestCenter} onDragEnd={handleDragEnd}>
            <sortable_1.SortableContext items={sortableItems} strategy={sortable_1.verticalListSortingStrategy}>
              <div className="space-y-2">
                {sortedConfigs.map((config) => {
                const column = columnDefinitions.find(def => def.key === config.key);
                if (!column)
                    return null;
                return (<SortableColumnItem key={config.key} column={column} config={config}/>);
            })}
              </div>
            </sortable_1.SortableContext>
          </core_1.DndContext>
        </div>
        <div className="p-3 border-t border-gray-200 flex justify-between">
          <button onClick={resetColumnSettings} className="text-sm text-gray-600 hover:text-gray-800">
            リセット
          </button>
          <button onClick={() => setShowColumnSettings(false)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
            完了
          </button>
        </div>
      </div>);
    };
    if (loading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);
    }
    return (<div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <link_1.default href="/products/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
          <lucide_react_1.Plus className="w-4 h-4"/>
          新規商品登録
        </link_1.default>
      </div>

      {/* 検索バー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <form onSubmit={(e) => {
            e.preventDefault();
            setCurrentPage(1);
            fetchProducts();
        }} className="flex gap-2">
          <div className="flex-1 relative">
            <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <input type="text" value={searchTerm} onChange={(e) => {
            const value = e.target.value;
            setSearchTerm(value);
            // 検索のデバウンス処理
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
            searchDebounceRef.current = setTimeout(() => {
                setCurrentPage(1);
                // fetchProductsは依存関係で自動実行される
            }, 300);
        }} placeholder="商品名、商品コード、説明で検索..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors ${showFilters
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              <lucide_react_1.Filter className="w-4 h-4"/>
              フィルター
              {getActiveFilterCount() > 0 && (<span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>)}
            </button>
            <div className="relative" ref={columnSettingsRef}>
              <button type="button" onClick={() => setShowColumnSettings(!showColumnSettings)} className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors ${showColumnSettings
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                <lucide_react_1.Columns className="w-4 h-4"/>
                表示項目
              </button>
              <ColumnSettingsDropdown />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            検索
          </button>
        </form>

        {/* フィルターパネル */}
        {showFilters && (<div className="mt-4 p-4 border-t bg-gray-50 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* アクティブ状態フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select value={filters.isActive === undefined ? '' : filters.isActive.toString()} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.isActive;
                    setFilters(newFilters);
                }
                else {
                    handleFilterChange({ isActive: value === 'true' });
                }
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">全て</option>
                  <option value="true">アクティブ</option>
                  <option value="false">非アクティブ</option>
                </select>
              </div>

              {/* カテゴリフィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <select value={filters.category || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.category;
                    setFilters(newFilters);
                }
                else {
                    handleFilterChange({ category: value });
                }
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">全てのカテゴリ</option>
                  {categories.map((category) => (<option key={category} value={category}>
                      {category}
                    </option>))}
                </select>
              </div>

              {/* 税率フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  税率
                </label>
                <div className="space-y-2">
                  {[0, 0.08, 0.1].map((rate) => (<label key={rate} className="flex items-center">
                      <input type="checkbox" checked={filters.taxRates?.includes(rate) || false} onChange={(e) => {
                    const currentRates = filters.taxRates || [];
                    let newRates;
                    if (e.target.checked) {
                        newRates = [...currentRates, rate];
                    }
                    else {
                        newRates = currentRates.filter(r => r !== rate);
                    }
                    if (newRates.length === 0) {
                        const newFilters = { ...filters };
                        delete newFilters.taxRates;
                        setFilters(newFilters);
                    }
                    else {
                        handleFilterChange({ taxRates: newRates });
                    }
                }} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                      <span className="ml-2 text-sm text-gray-700">
                        {(rate * 100).toFixed(0)}%
                      </span>
                    </label>))}
                </div>
              </div>

              {/* 価格範囲フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  価格範囲（円）
                </label>
                <div className="flex gap-2">
                  <input type="number" value={filters.unitPriceMin || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.unitPriceMin;
                    setFilters(newFilters);
                }
                else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        handleFilterChange({ unitPriceMin: num });
                    }
                }
            }} placeholder="最小" min="0" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <span className="flex items-center text-gray-500">〜</span>
                  <input type="number" value={filters.unitPriceMax || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.unitPriceMax;
                    setFilters(newFilters);
                }
                else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        handleFilterChange({ unitPriceMax: num });
                    }
                }
            }} placeholder="最大" min="0" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* 在庫数範囲フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  在庫数
                </label>
                <div className="flex gap-2">
                  <input type="number" value={filters.stockQuantityMin || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.stockQuantityMin;
                    setFilters(newFilters);
                }
                else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        handleFilterChange({ stockQuantityMin: num });
                    }
                }
            }} placeholder="最小" min="0" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  <span className="flex items-center text-gray-500">〜</span>
                  <input type="number" value={filters.stockQuantityMax || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.stockQuantityMax;
                    setFilters(newFilters);
                }
                else {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 0) {
                        handleFilterChange({ stockQuantityMax: num });
                    }
                }
            }} placeholder="最大" min="0" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* 登録日範囲フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  登録日（開始）
                </label>
                <input type="date" value={filters.createdAtStart || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.createdAtStart;
                    setFilters(newFilters);
                }
                else {
                    handleFilterChange({ createdAtStart: value });
                }
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  登録日（終了）
                </label>
                <input type="date" value={filters.createdAtEnd || ''} onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    const newFilters = { ...filters };
                    delete newFilters.createdAtEnd;
                    setFilters(newFilters);
                }
                else {
                    handleFilterChange({ createdAtEnd: value });
                }
            }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>

            {/* フィルターリセットボタン */}
            {getActiveFilterCount() > 0 && (<div className="mt-4 flex justify-end">
                <button type="button" onClick={resetFilters} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1">
                  <lucide_react_1.X className="w-4 h-4"/>
                  フィルターをクリア
                </button>
              </div>)}
          </div>)}

        {/* アクティブフィルターチップ */}
        {getActiveFilterCount() > 0 && (<div className="mt-3 flex flex-wrap gap-2">
            {filters.isActive !== undefined && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                ステータス: {filters.isActive ? 'アクティブ' : '非アクティブ'}
                <button onClick={() => removeFilter('isActive')} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
            {filters.category && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                カテゴリ: {filters.category}
                <button onClick={() => removeFilter('category')} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
            {filters.taxRates && filters.taxRates.length > 0 && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                税率: {filters.taxRates.map(r => `${(r * 100).toFixed(0)}%`).join(', ')}
                <button onClick={() => removeFilter('taxRates')} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
            {(filters.unitPriceMin !== undefined || filters.unitPriceMax !== undefined) && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                価格: ¥
                {filters.unitPriceMin !== undefined ? filters.unitPriceMin.toLocaleString() : '0'}
                〜
                {filters.unitPriceMax !== undefined ? `¥${filters.unitPriceMax.toLocaleString()}` : '∞'}
                <button onClick={() => {
                    const newFilters = { ...filters };
                    delete newFilters.unitPriceMin;
                    delete newFilters.unitPriceMax;
                    setFilters(newFilters);
                    setCurrentPage(1);
                }} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
            {(filters.stockQuantityMin !== undefined || filters.stockQuantityMax !== undefined) && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                在庫数: 
                {filters.stockQuantityMin !== undefined ? filters.stockQuantityMin : '0'}
                〜
                {filters.stockQuantityMax !== undefined ? filters.stockQuantityMax : '∞'}
                <button onClick={() => {
                    const newFilters = { ...filters };
                    delete newFilters.stockQuantityMin;
                    delete newFilters.stockQuantityMax;
                    setFilters(newFilters);
                    setCurrentPage(1);
                }} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
            {(filters.createdAtStart || filters.createdAtEnd) && (<div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                登録日: 
                {filters.createdAtStart || '〜'}
                {filters.createdAtStart && filters.createdAtEnd && ' 〜 '}
                {filters.createdAtEnd || '〜'}
                <button onClick={() => {
                    const newFilters = { ...filters };
                    delete newFilters.createdAtStart;
                    delete newFilters.createdAtEnd;
                    setFilters(newFilters);
                    setCurrentPage(1);
                }} className="ml-1 hover:bg-blue-200 rounded-full p-0.5">
                  <lucide_react_1.X className="w-3 h-3"/>
                </button>
              </div>)}
          </div>)}
      </div>

      {/* 商品一覧 */}
      <div className="bg-white rounded-lg shadow">
        {selectedProducts.size > 0 && (<div className="flex gap-2 items-center p-4 bg-blue-50 border-b">
            <input type="checkbox" checked={selectedProducts.size === products.length} onChange={selectAllProducts} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
            <span className="text-sm">{selectedProducts.size}件選択中</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => updateSelectedProductsStatus(true)} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm">
                一括アクティブ化
              </button>
              <button onClick={() => updateSelectedProductsStatus(false)} className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm">
                一括非アクティブ化
              </button>
              <button onClick={deleteSelectedProducts} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                <lucide_react_1.Trash2 className="w-4 h-4"/>
                一括削除
              </button>
            </div>
          </div>)}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">
                  <input type="checkbox" checked={selectedProducts.size === products.length && products.length > 0} onChange={selectAllProducts} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                </th>
                {visibleColumns.map((column) => (<th key={column.key} className="p-4 text-left text-sm font-medium text-gray-700">
                    {column.sortable ? (<button onClick={() => handleSort(column.key)} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                        {column.label}
                        <SortIcon field={column.key}/>
                      </button>) : (<span>{column.label}</span>)}
                  </th>))}
                <th className="p-4 text-left text-sm font-medium text-gray-700">ステータス</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (<tr>
                  <td colSpan={visibleColumns.length + 3} className="p-8 text-center text-gray-500">
                    商品データがありません
                  </td>
                </tr>) : (products.map((product) => {
            const productId = product.id || product._id?.toString() || '';
            return (<tr key={productId} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <input type="checkbox" checked={selectedProducts.has(productId)} onChange={() => toggleProductSelection(productId)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"/>
                      </td>
                      {visibleColumns.map((column) => (<td key={column.key} className={`p-4 text-sm ${column.key === 'productName' ? 'font-medium' : 'text-gray-600'}`}>
                          {column.render(product)}
                        </td>))}
                      <td className="p-4 text-sm">
                        <button onClick={() => handleStatusUpdate(productId, !product.isActive)} disabled={updatingStatus.has(productId)} className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${product.isActive !== false
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} ${updatingStatus.has(productId)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-sm'}`} title="クリックでステータスを切り替え">
                          {updatingStatus.has(productId) && (<div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"/>)}
                          {product.isActive !== false ? 'アクティブ' : '非アクティブ'}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <link_1.default href={`/products/${productId}/edit`} className="text-blue-600 hover:text-blue-800 p-1" title="編集">
                            <lucide_react_1.Edit className="w-4 h-4"/>
                          </link_1.default>
                          <button onClick={() => handleDeleteProduct(productId)} className="text-red-600 hover:text-red-800 p-1" title="削除">
                            <lucide_react_1.Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </td>
                    </tr>);
        }))}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (<div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-600">
              {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} / {totalItems} 件を表示
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`p-2 rounded ${currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
                <lucide_react_1.ChevronLeft className="w-4 h-4"/>
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                    page = i + 1;
                }
                else if (currentPage <= 3) {
                    page = i + 1;
                }
                else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                }
                else {
                    page = currentPage - 2 + i;
                }
                return (<button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded ${currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
                      {page}
                    </button>);
            })}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`p-2 rounded ${currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50 text-gray-700'}`}>
                <lucide_react_1.ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          </div>)}
      </div>
    </div>);
}
function ProductsPage() {
    return (<react_1.Suspense fallback={<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>}>
      <ProductsPageContent />
    </react_1.Suspense>);
}
