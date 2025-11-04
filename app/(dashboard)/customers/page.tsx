'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, X, Columns, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Customer, SortableField, SortOrder, FilterState } from '@/types/collections';
import { logger } from '@/lib/logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ITEMS_PER_PAGE = 10;

// 担当者情報取得ユーティリティ関数
interface PrimaryContactInfo {
  name: string;
  nameKana?: string;
  email?: string;
  phone?: string;
}

function getPrimaryContact(customer: Customer): PrimaryContactInfo {
  if (!customer.contacts || customer.contacts.length === 0) {
    return { name: '-' };
  }
  
  // 主担当者を優先（isPrimary: true）
  const primaryContact = customer.contacts.find(contact => contact.isPrimary === true);
  const targetContact = primaryContact || customer.contacts[0];
  
  return {
    name: targetContact.name || '-',
    nameKana: targetContact.nameKana,
    email: targetContact.email,
    phone: targetContact.phone,
  };
}

// カラム定義インターフェース
interface ColumnDefinition {
  key: string;
  label: string;
  required?: boolean;
  sortable?: boolean;
  render: (customer: Customer) => React.ReactNode;
}

// カラム設定インターフェース（順序付き）
interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
}

// LocalStorageのデータ構造
interface ColumnVisibilityStorageData {
  version: number;
  columns: ColumnConfig[];
}

// カラム設定のLocalStorageキー
const COLUMN_VISIBILITY_STORAGE_KEY = 'customers-column-visibility';
const STORAGE_VERSION = 2; // ストレージバージョン（構造変更時に更新）

// デフォルトのカラム表示設定（順序付き）
const DEFAULT_COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'customerId', visible: true, order: 0 },
  { key: 'companyName', visible: true, order: 1 }, // 必須
  { key: 'companyNameKana', visible: false, order: 2 },
  { key: 'department', visible: true, order: 3 },
  { key: 'primaryContactName', visible: true, order: 4 },
  { key: 'primaryContactNameKana', visible: false, order: 5 },
  { key: 'email', visible: true, order: 6 },
  { key: 'primaryContactEmail', visible: false, order: 7 },
  { key: 'phone', visible: true, order: 8 },
  { key: 'primaryContactPhone', visible: false, order: 9 },
  { key: 'prefecture', visible: false, order: 10 },
  { key: 'city', visible: false, order: 11 },
  { key: 'website', visible: false, order: 12 },
  { key: 'paymentTerms', visible: true, order: 13 },
  { key: 'createdAt', visible: true, order: 14 },
  { key: 'updatedAt', visible: false, order: 15 },
];

// useColumnVisibility カスタムフック（順序管理機能付き）
function useColumnVisibility() {
  const [columnConfigs, setColumnConfigsState] = useState<ColumnConfig[]>(DEFAULT_COLUMN_CONFIGS);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // 旧形式から新形式への移行
  const migrateOldFormat = useCallback((oldSettings: any): ColumnConfig[] => {
    if (typeof oldSettings !== 'object' || oldSettings === null) {
      return DEFAULT_COLUMN_CONFIGS;
    }

    // 旧形式の場合（オブジェクト形式）
    if (!Array.isArray(oldSettings) && !oldSettings.version) {
      const configs: ColumnConfig[] = [];
      DEFAULT_COLUMN_CONFIGS.forEach((defaultConfig) => {
        configs.push({
          key: defaultConfig.key,
          visible: oldSettings[defaultConfig.key] !== undefined ? oldSettings[defaultConfig.key] : defaultConfig.visible,
          order: defaultConfig.order,
        });
      });
      return configs;
    }

    return DEFAULT_COLUMN_CONFIGS;
  }, []);

  // LocalStorageから設定を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (saved) {
        const parsedData = JSON.parse(saved);
        
        // バージョンチェックと移行
        if (parsedData.version === STORAGE_VERSION && Array.isArray(parsedData.columns)) {
          // 現行バージョン
          setColumnConfigsState(parsedData.columns);
        } else {
          // 旧バージョンからの移行
          const migrated = migrateOldFormat(parsedData);
          setColumnConfigsState(migrated);
          // 移行したデータを保存
          const newData: ColumnVisibilityStorageData = {
            version: STORAGE_VERSION,
            columns: migrated,
          };
          localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(newData));
        }
      }
    } catch (error) {
      logger.error('Failed to load column visibility settings:', error);
    }
  }, [migrateOldFormat]);

  // 設定をLocalStorageに保存
  const saveColumnConfigs = useCallback((configs: ColumnConfig[]) => {
    setColumnConfigsState(configs);
    try {
      const data: ColumnVisibilityStorageData = {
        version: STORAGE_VERSION,
        columns: configs,
      };
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save column visibility settings:', error);
    }
  }, []);

  // 個別カラムの表示/非表示切り替え
  const toggleColumn = useCallback((columnKey: string) => {
    const newConfigs = columnConfigs.map(config => 
      config.key === columnKey 
        ? { ...config, visible: !config.visible }
        : config
    );
    saveColumnConfigs(newConfigs);
  }, [columnConfigs, saveColumnConfigs]);

  // カラムの順序変更
  const reorderColumns = useCallback((activeKey: string, overKey: string) => {
    const oldIndex = columnConfigs.findIndex(config => config.key === activeKey);
    const newIndex = columnConfigs.findIndex(config => config.key === overKey);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newConfigs = arrayMove(columnConfigs, oldIndex, newIndex);
      // 順序番号を再割り当て
      const reorderedConfigs = newConfigs.map((config, index) => ({
        ...config,
        order: index,
      }));
      saveColumnConfigs(reorderedConfigs);
    }
  }, [columnConfigs, saveColumnConfigs]);

  // 設定リセット
  const resetColumnSettings = useCallback(() => {
    saveColumnConfigs(DEFAULT_COLUMN_CONFIGS);
  }, [saveColumnConfigs]);

  // 旧形式の互換性のためのgetter
  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
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

function CustomersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortableField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // ステータス更新中の顧客IDを管理
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  // フィルター関連の状態
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  // 初回マウントを追跡するref
  const isInitialMount = useRef(true);
  
  // カラム表示設定
  const {
    columnConfigs,
    columnVisibility,
    toggleColumn,
    reorderColumns,
    resetColumnSettings,
    showColumnSettings,
    setShowColumnSettings,
  } = useColumnVisibility();

  // カラム設定ドロップダウンの外部クリック処理
  const columnSettingsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSettingsRef.current && !columnSettingsRef.current.contains(event.target as Node)) {
        setShowColumnSettings(false);
      }
    };

    if (showColumnSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnSettings, setShowColumnSettings]);
  
  // デバウンス用のref
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const filterDebounceRef = useRef<NodeJS.Timeout>();

  // 都道府県マスターデータ
  const PREFECTURES = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];

  // 市区町村候補（都道府県に応じて動的に表示する簡易版）
  const getCityCandidates = (prefecture: string): string[] => {
    // 簡易的な主要都市データ（実際の案件では郵便番号APIなどを使用）
    const cityData: { [key: string]: string[] } = {
      '東京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区', '八王子市', '立川市', '武蔵野市', '三鷹市', '青梅市'],
      '大阪府': ['大阪市北区', '大阪市都島区', '大阪市福島区', '大阪市此花区', '大阪市西区', '大阪市港区', '大阪市大正区', '大阪市天王寺区', '大阪市浪速区', '大阪市西淀川区', '大阪市東淀川区', '大阪市東成区', '大阪市生野区', '大阪市旭区', '大阪市城東区', '大阪市阿倍野区', '大阪市住吉区', '大阪市東住吉区', '大阪市西成区', '大阪市淀川区', '大阪市鶴見区', '大阪市住之江区', '大阪市平野区', '大阪市中央区', '堺市', '豊中市', '池田市', '吹田市', '泉大津市', '高槻市', '貝塚市', '守口市', '枚方市', '茨木市', '八尾市', '泉佐野市', '富田林市', '寝屋川市', '河内長野市', '松原市', '大東市', '和泉市', '箕面市', '柏原市', '羽曳野市', '門真市', '摂津市', '高石市', '藤井寺市', '東大阪市', '泉南市', '四條畷市', '交野市', '大阪狭山市', '阪南市'],
      '神奈川県': ['横浜市鶴見区', '横浜市神奈川区', '横浜市西区', '横浜市中区', '横浜市南区', '横浜市保土ケ谷区', '横浜市磯子区', '横浜市金沢区', '横浜市港北区', '横浜市戸塚区', '横浜市港南区', '横浜市旭区', '横浜市緑区', '横浜市瀬谷区', '横浜市栄区', '横浜市泉区', '横浜市青葉区', '横浜市都筑区', '川崎市川崎区', '川崎市幸区', '川崎市中原区', '川崎市高津区', '川崎市多摩区', '川崎市宮前区', '川崎市麻生区', '相模原市緑区', '相模原市中央区', '相模原市南区', '横須賀市', '平塚市', '鎌倉市', '藤沢市', '小田原市', '茅ヶ崎市', '逗子市', '三浦市', '秦野市', '厚木市', '大和市', '伊勢原市', '海老名市', '座間市', '南足柄市', '綾瀬市'],
      '愛知県': ['名古屋市千種区', '名古屋市東区', '名古屋市北区', '名古屋市西区', '名古屋市中村区', '名古屋市中区', '名古屋市昭和区', '名古屋市瑞穂区', '名古屋市熱田区', '名古屋市中川区', '名古屋市港区', '名古屋市南区', '名古屋市守山区', '名古屋市緑区', '名古屋市名東区', '名古屋市天白区', '豊橋市', '岡崎市', '一宮市', '瀬戸市', '半田市', '春日井市', '豊川市', '津島市', '碧南市', '刈谷市', '豊田市', '安城市', '西尾市', '蒲郡市', '犬山市', '常滑市', '江南市', '小牧市', '稲沢市', '新城市', '東海市', '大府市', '知多市', '知立市', '尾張旭市', '高浜市', '岩倉市', '豊明市', '日進市', '田原市', '愛西市', '清須市', '北名古屋市', 'あま市', '長久手市']
    };
    return cityData[prefecture] || [];
  };

  // カラム定義
  const columnDefinitions: ColumnDefinition[] = useMemo(() => [
    {
      key: 'customerId',
      label: '顧客コード',
      sortable: true,
      render: (customer) => customer.customerId || '-',
    },
    {
      key: 'companyName',
      label: '会社名',
      required: true,
      sortable: true,
      render: (customer) => customer.companyName,
    },
    {
      key: 'companyNameKana',
      label: '会社名カナ',
      sortable: true,
      render: (customer) => customer.companyNameKana || '-',
    },
    {
      key: 'department',
      label: '部署',
      sortable: true,
      render: (customer) => customer.department || '-',
    },
    {
      key: 'prefecture',
      label: '都道府県',
      sortable: true,
      render: (customer) => customer.prefecture || '-',
    },
    {
      key: 'city',
      label: '市区町村',
      sortable: true,
      render: (customer) => customer.city || '-',
    },
    {
      key: 'email',
      label: 'メールアドレス',
      sortable: true,
      render: (customer) => customer.email || '-',
    },
    {
      key: 'phone',
      label: '電話番号',
      sortable: false,
      render: (customer) => customer.phone || '-',
    },
    {
      key: 'website',
      label: 'ウェブサイト',
      sortable: false,
      render: (customer) => customer.website ? (
        <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {customer.website}
        </a>
      ) : '-',
    },
    {
      key: 'paymentTerms',
      label: '支払いサイト',
      sortable: true,
      render: (customer) => customer.paymentTerms ? `${customer.paymentTerms}日` : '-',
    },
    {
      key: 'createdAt',
      label: '登録日',
      sortable: true,
      render: (customer) => customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('ja-JP') : '-',
    },
    {
      key: 'updatedAt',
      label: '更新日',
      sortable: false,
      render: (customer) => customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString('ja-JP') : '-',
    },
    // 担当者情報
    {
      key: 'primaryContactName',
      label: '担当者名',
      sortable: true,
      render: (customer) => {
        const contact = getPrimaryContact(customer);
        return contact.name;
      },
    },
    {
      key: 'primaryContactNameKana',
      label: '担当者名カナ',
      sortable: true,
      render: (customer) => {
        const contact = getPrimaryContact(customer);
        return contact.nameKana || '-';
      },
    },
    {
      key: 'primaryContactEmail',
      label: '担当者メール',
      sortable: false,
      render: (customer) => {
        const contact = getPrimaryContact(customer);
        return contact.email ? (
          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
            {contact.email}
          </a>
        ) : '-';
      },
    },
    {
      key: 'primaryContactPhone',
      label: '担当者連絡先',
      sortable: false,
      render: (customer) => {
        const contact = getPrimaryContact(customer);
        return contact.phone ? (
          <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
            {contact.phone}
          </a>
        ) : '-';
      },
    },
  ], []);

  // 表示対象のカラム（順序を考慮）
  const visibleColumns = useMemo(() => {
    // カラム設定を順序でソート
    const sortedConfigs = [...columnConfigs].sort((a, b) => a.order - b.order);
    
    // 表示するカラムのみを取得し、定義と結合
    const visible: ColumnDefinition[] = [];
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

  // 顧客一覧を取得
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: debouncedSearchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });
      
      // フィルターパラメータを追加
      if (filters.isActive !== undefined) {
        params.set('isActive', filters.isActive.toString());
      }
      if (filters.prefecture) {
        params.set('prefecture', filters.prefecture);
      }
      if (filters.city) {
        params.set('city', filters.city);
      }
      if (filters.paymentTermsMin !== undefined) {
        params.set('paymentTermsMin', filters.paymentTermsMin.toString());
      }
      if (filters.paymentTermsMax !== undefined) {
        params.set('paymentTermsMax', filters.paymentTermsMax.toString());
      }
      if (filters.createdAtStart) {
        params.set('createdAtStart', filters.createdAtStart);
      }
      if (filters.createdAtEnd) {
        params.set('createdAtEnd', filters.createdAtEnd);
      }
      
      const response = await fetch(`/api/customers?${params}`);
      
      if (!response.ok) {
        throw new Error('顧客データの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.customers);
        setTotal(data.total);
        setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
      } else {
        throw new Error(data.error || '顧客データの取得に失敗しました');
      }
    } catch (error) {
      logger.error('Error loading customers:', error);
      toast.error('顧客データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, sortBy, sortOrder, filters]);

  // URLパラメータから初期状態を設定
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const sortByParam = searchParams.get('sortBy') as SortableField;
    const sortOrderParam = searchParams.get('sortOrder') as SortOrder;
    
    setCurrentPage(page);
    setSearchTerm(search);
    
    if (sortByParam && ['customerId', 'companyName', 'companyNameKana', 'department', 'prefecture', 'city', 'email', 'paymentTerms', 'createdAt', 'primaryContactName', 'primaryContactNameKana'].includes(sortByParam)) {
      setSortBy(sortByParam);
    }
    
    if (sortOrderParam && ['asc', 'desc'].includes(sortOrderParam)) {
      setSortOrder(sortOrderParam);
    }
    
    // フィルターパラメータの復元
    const newFilters: FilterState = {};
    
    const isActiveParam = searchParams.get('isActive');
    if (isActiveParam !== null) {
      newFilters.isActive = isActiveParam === 'true';
    }
    
    const prefecture = searchParams.get('prefecture');
    if (prefecture) {
      newFilters.prefecture = prefecture;
    }
    
    const city = searchParams.get('city');
    if (city) {
      newFilters.city = city;
    }
    
    const paymentTermsMin = searchParams.get('paymentTermsMin');
    if (paymentTermsMin) {
      const min = parseInt(paymentTermsMin);
      if (!isNaN(min)) {
        newFilters.paymentTermsMin = min;
      }
    }
    
    const paymentTermsMax = searchParams.get('paymentTermsMax');
    if (paymentTermsMax) {
      const max = parseInt(paymentTermsMax);
      if (!isNaN(max)) {
        newFilters.paymentTermsMax = max;
      }
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

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // 検索時はページを1に戻す
    }, 500); // 500ms後に検索実行

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // フィルター変更時もページを1に戻す（初回マウント時を除く）
  useEffect(() => {
    if (isInitialMount.current) {
      // 初回マウント時はページリセットをスキップ
      isInitialMount.current = false;
      return;
    }
    // フィルターが実際に変更された場合のみページをリセット
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // URLパラメータを更新
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (searchTerm) params.set('search', searchTerm);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    
    // フィルターパラメータの追加
    if (filters.isActive !== undefined) {
      params.set('isActive', filters.isActive.toString());
    }
    if (filters.prefecture) {
      params.set('prefecture', filters.prefecture);
    }
    if (filters.city) {
      params.set('city', filters.city);
    }
    if (filters.paymentTermsMin !== undefined) {
      params.set('paymentTermsMin', filters.paymentTermsMin.toString());
    }
    if (filters.paymentTermsMax !== undefined) {
      params.set('paymentTermsMax', filters.paymentTermsMax.toString());
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
      router.replace(`/customers${newURL}`, { scroll: false });
    }
  }, [currentPage, searchTerm, sortBy, sortOrder, filters, router]);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // ソート処理
  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      // 同じフィールドの場合は順序を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 異なるフィールドの場合は昇順から開始
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // ソート変更時はページをリセット
  };

  // ソートアイコンコンポーネント
  const SortIcon = ({ field }: { field: SortableField }) => {
    if (sortBy !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  // 顧客削除
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('この顧客を削除してもよろしいですか？')) {
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
      fetchCustomers();
    } catch (error) {
      logger.error('削除エラー:', error);
      toast.error('顧客の削除に失敗しました');
    }
  };

  // ステータス更新
  const handleStatusUpdate = async (customerId: string, newStatus: boolean) => {
    // すでに更新中の場合は処理しない
    if (updatingStatus.has(customerId)) {
      return;
    }

    // 楽観的更新: UIを即座に更新
    const originalCustomers = [...customers];
    setCustomers(prev => 
      prev.map(customer => {
        const id = customer.id || customer._id?.toString() || '';
        if (id === customerId) {
          return { ...customer, isActive: newStatus };
        }
        return customer;
      })
    );

    // 更新中状態をセット
    setUpdatingStatus(prev => new Set([...prev, customerId]));

    try {
      const response = await fetch(`/api/customers/${customerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ステータスの更新に失敗しました');
      }

      // 成功時のトースト表示
      toast.success(data.message || `ステータスを${newStatus ? 'アクティブ' : '非アクティブ'}に更新しました`);

      // サーバーからの最新データで更新（念のため）
      if (data.customer) {
        setCustomers(prev => 
          prev.map(customer => {
            const id = customer.id || customer._id?.toString() || '';
            if (id === customerId) {
              return {
                ...data.customer,
                id: data.customer.id || data.customer._id?.toString(),
              };
            }
            return customer;
          })
        );
      }

    } catch (error) {
      logger.error('ステータス更新エラー:', error);
      
      // エラー時は元の状態に戻す
      setCustomers(originalCustomers);
      
      // エラートースト表示
      const errorMessage = error instanceof Error ? error.message : 'ステータスの更新に失敗しました';
      toast.error(errorMessage);
    } finally {
      // 更新中状態を解除
      setUpdatingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(customerId);
        return newSet;
      });
    }
  };

  // 複数選択
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(customer => customer.id)));
    }
  };

  // 一括削除
  const deleteSelectedCustomers = async () => {
    if (selectedCustomers.size === 0) return;
    
    if (!confirm(`選択した${selectedCustomers.size}件の顧客を削除しますか？`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedCustomers).map(customerId => 
        fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletions = results.filter(r => !r.ok).length;
      
      if (failedDeletions > 0) {
        toast.error(`${failedDeletions}件の削除に失敗しました`);
      } else {
        toast.success(`${selectedCustomers.size}件の顧客を削除しました`);
      }
      
      setSelectedCustomers(new Set());
      fetchCustomers();
    } catch (error) {
      logger.error('Error deleting customers:', error);
      toast.error('削除に失敗しました');
    }
  };

  // 検索処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  // フィルター処理（デバウンス付き）
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // フィルター変更時はページをリセット
    
    // デバウンス処理
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }
    
    filterDebounceRef.current = setTimeout(() => {
      // フィルター変更後のfetchCustomersは自動的にuseEffectで実行される
    }, 300);
  }, []);

  // フィルターリセット
  const resetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // フィルターチップ削除
  const removeFilter = (key: keyof FilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    
    // 都道府県を削除する場合は、市区町村も削除
    if (key === 'prefecture' && newFilters.city) {
      delete newFilters.city;
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // アクティブなフィルター数を取得
  const getActiveFilterCount = () => {
    return Object.keys(filters).length;
  };

  // ドラッグ可能なカラム項目コンポーネント
  const SortableColumnItem = ({ column, config }: { column: ColumnDefinition; config: ColumnConfig }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: column.key });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const isDisabled = column.required;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 bg-white rounded border ${
          isDragging ? 'border-blue-400 shadow-lg' : 'border-gray-200'
        } ${isDisabled ? 'opacity-60' : ''}`}
      >
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing ${
            isDisabled ? 'invisible' : ''
          }`}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <label className="flex items-center gap-2 flex-1 cursor-pointer">
          <input
            type="checkbox"
            checked={config.visible}
            disabled={isDisabled}
            onChange={() => !isDisabled && toggleColumn(column.key)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            {column.label}
            {column.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      </div>
    );
  };

  // カラム設定ドロップダウン
  const ColumnSettingsDropdown = () => {
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        reorderColumns(active.id as string, over.id as string);
      }
    };

    if (!showColumnSettings) return null;

    // 順序でソートされたカラム設定
    const sortedConfigs = [...columnConfigs].sort((a, b) => a.order - b.order);
    const sortableItems = sortedConfigs.map(config => config.key);

    return (
      <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">表示項目の設定</h3>
            <button
              onClick={() => setShowColumnSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ドラッグ＆ドロップで項目の並び順を変更できます
          </p>
        </div>
        <div className="p-3 max-h-96 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItems}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedConfigs.map((config) => {
                  const column = columnDefinitions.find(def => def.key === config.key);
                  if (!column) return null;
                  
                  return (
                    <SortableColumnItem
                      key={config.key}
                      column={column}
                      config={config}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <div className="p-3 border-t border-gray-200 flex justify-between">
          <button
            onClick={resetColumnSettings}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            リセット
          </button>
          <button
            onClick={() => setShowColumnSettings(false)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            完了
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <Link 
          href="/customers/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新規顧客登録
        </Link>
      </div>

      {/* 検索バー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="顧客コード、会社名、メールアドレス、部署名で検索..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              フィルター
              {getActiveFilterCount() > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
            <div className="relative" ref={columnSettingsRef}>
              <button
                type="button"
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors ${
                  showColumnSettings 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Columns className="w-4 h-4" />
                表示項目
              </button>
              <ColumnSettingsDropdown />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            検索
          </button>
        </form>

        {/* フィルターパネル */}
        {showFilters && (
          <div className="mt-4 p-4 border-t bg-gray-50 rounded-b-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* アクティブ状態フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newFilters = { ...filters };
                      delete newFilters.isActive;
                      setFilters(newFilters);
                    } else {
                      handleFilterChange({ isActive: value === 'true' });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全て</option>
                  <option value="true">アクティブ</option>
                  <option value="false">非アクティブ</option>
                </select>
              </div>

              {/* 都道府県フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  都道府県
                </label>
                <select
                  value={filters.prefecture || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newFilters = { ...filters };
                      delete newFilters.prefecture;
                      delete newFilters.city; // 都道府県変更時は市区町村もクリア
                      setFilters(newFilters);
                    } else {
                      const newFilters = { ...filters, prefecture: value };
                      delete newFilters.city; // 都道府県変更時は市区町村もクリア
                      handleFilterChange(newFilters);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全ての都道府県</option>
                  {PREFECTURES.map((prefecture) => (
                    <option key={prefecture} value={prefecture}>
                      {prefecture}
                    </option>
                  ))}
                </select>
              </div>

              {/* 市区町村フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  市区町村
                </label>
                <select
                  value={filters.city || ''}
                  disabled={!filters.prefecture}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newFilters = { ...filters };
                      delete newFilters.city;
                      setFilters(newFilters);
                    } else {
                      handleFilterChange({ city: value });
                    }
                  }}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !filters.prefecture ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">全ての市区町村</option>
                  {filters.prefecture && getCityCandidates(filters.prefecture).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {!filters.prefecture && (
                  <p className="text-xs text-gray-500 mt-1">
                    都道府県を選択してください
                  </p>
                )}
              </div>

              {/* 支払いサイト範囲フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支払いサイト（日）
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.paymentTermsMin || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        const newFilters = { ...filters };
                        delete newFilters.paymentTermsMin;
                        setFilters(newFilters);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= 0) {
                          handleFilterChange({ paymentTermsMin: num });
                        }
                      }
                    }}
                    placeholder="最小"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="flex items-center text-gray-500">〜</span>
                  <input
                    type="number"
                    value={filters.paymentTermsMax || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        const newFilters = { ...filters };
                        delete newFilters.paymentTermsMax;
                        setFilters(newFilters);
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= 0) {
                          handleFilterChange({ paymentTermsMax: num });
                        }
                      }
                    }}
                    placeholder="最大"
                    min="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 登録日範囲フィルター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  登録日（開始）
                </label>
                <input
                  type="date"
                  value={filters.createdAtStart || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newFilters = { ...filters };
                      delete newFilters.createdAtStart;
                      setFilters(newFilters);
                    } else {
                      handleFilterChange({ createdAtStart: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  登録日（終了）
                </label>
                <input
                  type="date"
                  value={filters.createdAtEnd || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      const newFilters = { ...filters };
                      delete newFilters.createdAtEnd;
                      setFilters(newFilters);
                    } else {
                      handleFilterChange({ createdAtEnd: value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* フィルターリセットボタン */}
            {getActiveFilterCount() > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  フィルターをクリア
                </button>
              </div>
            )}
          </div>
        )}

        {/* アクティブフィルターチップ */}
        {getActiveFilterCount() > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.isActive !== undefined && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                ステータス: {filters.isActive ? 'アクティブ' : '非アクティブ'}
                <button
                  onClick={() => removeFilter('isActive')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.prefecture && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                都道府県: {filters.prefecture}
                <button
                  onClick={() => removeFilter('prefecture')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.city && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                市区町村: {filters.city}
                <button
                  onClick={() => removeFilter('city')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {(filters.paymentTermsMin !== undefined || filters.paymentTermsMax !== undefined) && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                支払いサイト: 
                {filters.paymentTermsMin !== undefined ? `${filters.paymentTermsMin}` : '0'}
                〜
                {filters.paymentTermsMax !== undefined ? `${filters.paymentTermsMax}` : '∞'}日
                <button
                  onClick={() => {
                    const newFilters = { ...filters };
                    delete newFilters.paymentTermsMin;
                    delete newFilters.paymentTermsMax;
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {(filters.createdAtStart || filters.createdAtEnd) && (
              <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                登録日: 
                {filters.createdAtStart || '〜'}
                {filters.createdAtStart && filters.createdAtEnd && ' 〜 '}
                {filters.createdAtEnd || '〜'}
                <button
                  onClick={() => {
                    const newFilters = { ...filters };
                    delete newFilters.createdAtStart;
                    delete newFilters.createdAtEnd;
                    setFilters(newFilters);
                    setCurrentPage(1);
                  }}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 顧客一覧 */}
      <div className="bg-white rounded-lg shadow">
        {selectedCustomers.size > 0 && (
          <div className="flex gap-2 items-center p-4 bg-blue-50 border-b">
            <input
              type="checkbox"
              checked={selectedCustomers.size === customers.length}
              onChange={selectAllCustomers}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm">{selectedCustomers.size}件選択中</span>
            <button
              onClick={deleteSelectedCustomers}
              className="ml-auto text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              一括削除
            </button>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === customers.length && customers.length > 0}
                    onChange={selectAllCustomers}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                {visibleColumns.map((column) => (
                  <th key={column.key} className="p-4 text-left text-sm font-medium text-gray-700">
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key as SortableField)}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      >
                        {column.label}
                        <SortIcon field={column.key as SortableField} />
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                ))}
                <th className="p-4 text-left text-sm font-medium text-gray-700">ステータス</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 3} className="p-8 text-center text-gray-500">
                    顧客データがありません
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id || customer._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id || customer._id?.toString() || '')}
                        onChange={() => toggleCustomerSelection(customer.id || customer._id?.toString() || '')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    {visibleColumns.map((column) => (
                      <td key={column.key} className={`p-4 text-sm ${
                        column.key === 'companyName' ? 'font-medium' : 'text-gray-600'
                      }`}>
                        {column.render(customer)}
                      </td>
                    ))}
                    <td className="p-4 text-sm">
                      <button
                        onClick={() => {
                          const customerId = customer.id || customer._id?.toString() || '';
                          const newStatus = customer.isActive === false;
                          handleStatusUpdate(customerId, newStatus);
                        }}
                        disabled={updatingStatus.has(customer.id || customer._id?.toString() || '')}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                          customer.isActive !== false 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        } ${
                          updatingStatus.has(customer.id || customer._id?.toString() || '')
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer hover:shadow-sm'
                        }`}
                        title="クリックでステータスを切り替え"
                      >
                        {updatingStatus.has(customer.id || customer._id?.toString() || '') && (
                          <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                        )}
                        {customer.isActive !== false ? 'アクティブ' : '非アクティブ'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/${customer.id || customer._id}/edit`}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id || customer._id?.toString() || '')}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-600">
              {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, total)} 件を表示
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CustomersPageContent />
    </Suspense>
  );
}