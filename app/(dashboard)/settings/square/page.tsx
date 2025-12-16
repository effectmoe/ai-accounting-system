'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowDownToLine,
  Loader2,
  Building2,
  FileText,
  Users,
  Link as LinkIcon,
  ExternalLink,
  Calendar,
  Filter,
  CheckSquare,
  Square as SquareIcon,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface SquareSettings {
  locationId?: string;
  autoSync?: boolean;
  accessToken?: string;
  webhookSignatureKey?: string;
}

interface Merchant {
  id: string;
  businessName: string;
  country: string;
  currency: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
  address?: any;
  status: string;
  currency: string;
  country: string;
  timezone: string;
  businessName?: string;
}

interface SyncStats {
  invoices: {
    total: number;
    synced: number;
    failed: number;
    pending: number;
  };
  customers: {
    total: number;
    synced: number;
    failed: number;
    pending: number;
  };
}

interface SyncMapping {
  squareInvoiceId?: string;
  squareCustomerId?: string;
  systemInvoiceId?: string;
  systemCustomerId?: string;
  lastSyncedAt: string;
  syncStatus: 'synced' | 'failed' | 'pending';
  errorMessage?: string;
}

interface SquareInvoice {
  id: string;
  invoiceNumber: string;
  title?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  scheduledAt?: string;
  orderId?: string;
  primaryRecipient?: {
    customer_id?: string;
    given_name?: string;
    family_name?: string;
    email_address?: string;
    company_name?: string;
  };
  paymentRequests?: Array<{
    uid: string;
    requestType: string;
    dueDate?: string;
    computedAmountMoney?: {
      amount: number;
      currency: string;
    };
    totalCompletedAmountMoney?: {
      amount: number;
      currency: string;
    };
  }>;
  publicUrl?: string;
}

export default function SquareSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [settings, setSettings] = useState<SquareSettings>({});
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [invoiceMappings, setInvoiceMappings] = useState<SyncMapping[]>([]);
  const [customerMappings, setCustomerMappings] = useState<SyncMapping[]>([]);

  const [activeTab, setActiveTab] = useState<'settings' | 'sync'>('settings');

  // 日付範囲・請求書選択用の状態
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [squareInvoices, setSquareInvoices] = useState<SquareInvoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [syncMode, setSyncMode] = useState<'all' | 'dateRange' | 'selected'>('all');
  const [showInvoiceList, setShowInvoiceList] = useState(false);

  // 検索・ソート・フィルター用の状態
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'invoiceNumber' | 'amount' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 一覧表示の高さ設定
  const [listHeight, setListHeight] = useState<'compact' | 'normal' | 'expanded'>('normal');

  useEffect(() => {
    fetchSettings();
    fetchSyncStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/square/settings');
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      logger.error('Error fetching Square settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/square/sync');
      const data = await response.json();

      if (data.success) {
        setSyncStats(data.stats);
        setInvoiceMappings(data.invoiceMappings || []);
        setCustomerMappings(data.customerMappings || []);
      }
    } catch (error) {
      logger.error('Error fetching sync status:', error);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/square/test-connection');
      const data = await response.json();

      if (data.success) {
        setMerchant(data.merchant);
        setConnectionStatus('connected');
        toast.success('Square API接続に成功しました');

        // ロケーション一覧を取得
        await fetchLocations();
      } else {
        setConnectionStatus('disconnected');
        toast.error(data.error || 'Square API接続に失敗しました');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      logger.error('Error testing Square connection:', error);
      toast.error('Square API接続テストに失敗しました');
    } finally {
      setTesting(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/square/locations');
      const data = await response.json();

      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      logger.error('Error fetching locations:', error);
    }
  };

  // Square から請求書一覧を取得
  const fetchSquareInvoices = async () => {
    if (!settings.locationId) {
      toast.error('ロケーションを選択してください');
      return;
    }

    setLoadingInvoices(true);
    try {
      const params = new URLSearchParams({
        locationId: settings.locationId,
        limit: '100',
      });
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/square/invoices?${params}`);
      const data = await response.json();

      if (data.success) {
        setSquareInvoices(data.invoices || []);
        setShowInvoiceList(true);
        toast.success(`${data.invoices?.length || 0}件の請求書を取得しました`);
      } else {
        toast.error(data.error || '請求書の取得に失敗しました');
      }
    } catch (error) {
      logger.error('Error fetching Square invoices:', error);
      toast.error('請求書の取得に失敗しました');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // 請求書の選択/解除
  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  // 全選択/解除
  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === squareInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(squareInvoices.map(inv => inv.id));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/square/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: settings.locationId,
          autoSync: settings.autoSync,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('設定を保存しました');
      } else {
        toast.error(data.error || '設定の保存に失敗しました');
      }
    } catch (error) {
      logger.error('Error saving settings:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!settings.locationId && syncMode !== 'selected') {
      toast.error('ロケーションを選択してください');
      return;
    }

    let confirmMessage = '';
    let requestBody: any = {};

    switch (syncMode) {
      case 'all':
        confirmMessage = 'Squareの全請求書をインポートしますか？この処理には時間がかかる場合があります。';
        requestBody = {
          type: 'all',
          locationId: settings.locationId,
        };
        break;
      case 'dateRange':
        if (!dateFrom || !dateTo) {
          toast.error('開始日と終了日を入力してください');
          return;
        }
        confirmMessage = `${dateFrom} から ${dateTo} の期間の請求書をインポートしますか？`;
        requestBody = {
          type: 'dateRange',
          locationId: settings.locationId,
          dateFrom,
          dateTo,
        };
        break;
      case 'selected':
        if (selectedInvoiceIds.length === 0) {
          toast.error('インポートする請求書を選択してください');
          return;
        }
        confirmMessage = `選択した${selectedInvoiceIds.length}件の請求書をインポートしますか？`;
        requestBody = {
          type: 'selected',
          invoiceIds: selectedInvoiceIds,
        };
        break;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/square/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`同期完了: ${data.result.success}件成功、${data.result.failed}件失敗`);
        await fetchSyncStatus();
        // 選択をリセット
        setSelectedInvoiceIds([]);
      } else {
        toast.error(data.error || '同期に失敗しました');
      }
    } catch (error) {
      logger.error('Error syncing:', error);
      toast.error('同期処理に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  // 金額をフォーマット
  const formatMoney = (amount?: number, currency?: string) => {
    if (amount === undefined) return '-';
    // Square APIは通貨によって単位が異なる
    // JPY: 円単位（そのまま使用）
    // USD等: セント単位（100で割る）
    const currencyCode = currency || 'JPY';
    const value = currencyCode === 'JPY' ? amount : amount / 100;
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  // ステータスを日本語に変換
  const getInvoiceStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': '下書き',
      'UNPAID': '未払い',
      'SCHEDULED': '予定',
      'PARTIALLY_PAID': '一部支払済',
      'PAID': '支払済',
      'PARTIALLY_REFUNDED': '一部返金済',
      'REFUNDED': '返金済',
      'CANCELED': 'キャンセル',
      'FAILED': '失敗',
      'PAYMENT_PENDING': '支払待ち',
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: 'synced' | 'failed' | 'pending') => {
    switch (status) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3" />
            同期済み
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            失敗
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
            <AlertCircle className="w-3 h-3" />
            保留中
          </span>
        );
    }
  };

  // 請求書の顧客名を取得するヘルパー関数
  const getCustomerName = (invoice: SquareInvoice): string => {
    const recipient = invoice.primaryRecipient;
    if (!recipient) return '';
    if (recipient.company_name) return recipient.company_name;
    if (recipient.family_name && recipient.given_name) {
      return `${recipient.family_name} ${recipient.given_name}`;
    }
    return recipient.email_address || '';
  };

  // 請求書の金額を取得するヘルパー関数
  const getInvoiceAmount = (invoice: SquareInvoice): number => {
    return invoice.paymentRequests?.[0]?.computedAmountMoney?.amount || 0;
  };

  // フィルター・ソート・検索を適用した請求書一覧を返す
  const filteredAndSortedInvoices = (): SquareInvoice[] => {
    let result = [...squareInvoices];

    // キーワード検索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((invoice) => {
        const invoiceNumber = (invoice.invoiceNumber || '').toLowerCase();
        const title = (invoice.title || '').toLowerCase();
        const customerName = getCustomerName(invoice).toLowerCase();
        const email = (invoice.primaryRecipient?.email_address || '').toLowerCase();
        return (
          invoiceNumber.includes(query) ||
          title.includes(query) ||
          customerName.includes(query) ||
          email.includes(query)
        );
      });
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      result = result.filter((invoice) => invoice.status === statusFilter);
    }

    // ソート
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'invoiceNumber':
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
          break;
        case 'amount':
          comparison = getInvoiceAmount(a) - getInvoiceAmount(b);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  };

  // ソートの切り替え
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // ソートアイコンの表示
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="w-3 h-3 opacity-30" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  // 一覧の高さクラスを取得
  const getListHeightClass = (): string => {
    switch (listHeight) {
      case 'compact':
        return 'max-h-64'; // 256px - 約6行
      case 'normal':
        return 'max-h-96'; // 384px - 約10行
      case 'expanded':
        return 'max-h-[600px]'; // 600px - 約15行以上
      default:
        return 'max-h-96';
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5l6-4.5-6-4.5v9z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Square 連携設定</h1>
            <p className="text-gray-600">Squareの請求書・顧客情報を同期します</p>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                接続設定
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sync'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                同期状況
              </div>
            </button>
          </nav>
        </div>

        {/* 接続設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* 接続ステータス */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                接続ステータス
              </h2>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {connectionStatus === 'connected' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : connectionStatus === 'disconnected' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">
                      {connectionStatus === 'connected'
                        ? '接続済み'
                        : connectionStatus === 'disconnected'
                        ? '接続エラー'
                        : '未接続'}
                    </p>
                    {merchant && (
                      <p className="text-sm text-gray-600">
                        {merchant.businessName} ({merchant.currency})
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  接続テスト
                </button>
              </div>
            </div>

            {/* API設定の説明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">API設定について</h3>
              <p className="text-sm text-blue-700 mb-2">
                Square APIと連携するには、以下の環境変数をVercelに設定してください：
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li><code className="bg-blue-100 px-1 rounded">SQUARE_ACCESS_TOKEN</code> - Square Developer DashboardのAPIキー</li>
                <li><code className="bg-blue-100 px-1 rounded">SQUARE_ENVIRONMENT</code> - <code>sandbox</code> または <code>production</code></li>
                <li><code className="bg-blue-100 px-1 rounded">SQUARE_WEBHOOK_SIGNATURE_KEY</code> - Webhook署名キー（オプション）</li>
              </ul>
              <a
                href="https://developer.squareup.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                Square Developer Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* ロケーション選択 */}
            {locations.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  ロケーション設定
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      同期するロケーション
                    </label>
                    <select
                      value={settings.locationId || ''}
                      onChange={(e) => setSettings({ ...settings, locationId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">ロケーションを選択...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoSync"
                      checked={settings.autoSync || false}
                      onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoSync" className="ml-2 text-sm text-gray-700">
                      Webhookによる自動同期を有効にする
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      設定を保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Webhook設定</h2>
              <p className="text-sm text-gray-600 mb-4">
                Squareからリアルタイムで更新を受信するには、Square Developer Dashboardで以下のWebhook URLを設定してください：
              </p>
              <div className="bg-gray-100 rounded-lg p-3">
                <code className="text-sm break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/square` : '/api/webhooks/square'}
                </code>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                購読するイベント: invoice.created, invoice.published, invoice.updated, invoice.payment_made, customer.created, customer.updated
              </p>
            </div>
          </div>
        )}

        {/* 同期状況タブ */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            {/* 同期アクション */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <ArrowDownToLine className="w-5 h-5" />
                データ同期
              </h2>

              {!settings.locationId && (
                <p className="text-yellow-600 text-sm mb-4">
                  同期を実行するには、接続設定タブでロケーションを選択してください。
                </p>
              )}

              {/* 同期モード選択 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  同期モード
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSyncMode('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                      syncMode === 'all'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    全データ
                  </button>
                  <button
                    onClick={() => setSyncMode('dateRange')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                      syncMode === 'dateRange'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    日付範囲
                  </button>
                  <button
                    onClick={() => setSyncMode('selected')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                      syncMode === 'selected'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    選択インポート
                  </button>
                </div>
              </div>

              {/* 日付範囲入力（日付範囲モード or 選択モードで表示） */}
              {(syncMode === 'dateRange' || syncMode === 'selected') && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap items-end gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始日
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了日
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={fetchSquareInvoices}
                      disabled={loadingInvoices || !settings.locationId}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
                    >
                      {loadingInvoices ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      請求書を検索
                    </button>
                  </div>
                </div>
              )}

              {/* 請求書一覧（選択モードで表示） */}
              {syncMode === 'selected' && showInvoiceList && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Square 請求書一覧
                      <span className="text-sm text-gray-500">
                        ({filteredAndSortedInvoices().length}件 / 全{squareInvoices.length}件)
                      </span>
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedInvoiceIds.length === squareInvoices.length ? '全選択解除' : '全選択'}
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedInvoiceIds.length}件選択中
                      </span>
                      <button
                        onClick={() => setShowInvoiceList(!showInvoiceList)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {showInvoiceList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 検索・フィルターUI */}
                  <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                    {/* キーワード検索 */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="請求書番号、顧客名、メールで検索..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* ステータスフィルター */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">全てのステータス</option>
                        <option value="DRAFT">下書き</option>
                        <option value="UNPAID">未払い</option>
                        <option value="SCHEDULED">予定</option>
                        <option value="PAID">支払済</option>
                        <option value="PARTIALLY_PAID">一部支払済</option>
                        <option value="CANCELED">キャンセル</option>
                        <option value="REFUNDED">返金済</option>
                      </select>
                    </div>

                    {/* 検索リセット */}
                    {(searchQuery || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg"
                      >
                        リセット
                      </button>
                    )}

                    {/* 高さ切り替え */}
                    <div className="flex items-center gap-1 ml-auto border-l pl-3">
                      <span className="text-xs text-gray-500 mr-1">表示:</span>
                      <button
                        onClick={() => setListHeight('compact')}
                        className={`px-2 py-1 text-xs rounded ${
                          listHeight === 'compact'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="コンパクト（6行）"
                      >
                        小
                      </button>
                      <button
                        onClick={() => setListHeight('normal')}
                        className={`px-2 py-1 text-xs rounded ${
                          listHeight === 'normal'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="標準（10行）"
                      >
                        中
                      </button>
                      <button
                        onClick={() => setListHeight('expanded')}
                        className={`px-2 py-1 text-xs rounded ${
                          listHeight === 'expanded'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                        title="拡大（15行以上）"
                      >
                        大
                      </button>
                    </div>
                  </div>

                  <div className={`border rounded-lg overflow-hidden ${getListHeightClass()} overflow-y-auto`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.length === filteredAndSortedInvoices().length && filteredAndSortedInvoices().length > 0}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('invoiceNumber')}
                          >
                            <div className="flex items-center gap-1">
                              請求書番号
                              <SortIcon field="invoiceNumber" />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">顧客</th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('amount')}
                          >
                            <div className="flex items-center gap-1">
                              金額
                              <SortIcon field="amount" />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center gap-1">
                              ステータス
                              <SortIcon field="status" />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('createdAt')}
                          >
                            <div className="flex items-center gap-1">
                              作成日
                              <SortIcon field="createdAt" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndSortedInvoices().length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              {squareInvoices.length === 0
                                ? '請求書が見つかりません'
                                : '検索条件に一致する請求書がありません'}
                            </td>
                          </tr>
                        ) : (
                          filteredAndSortedInvoices().map((invoice) => (
                            <tr
                              key={invoice.id}
                              className={`hover:bg-gray-50 cursor-pointer ${
                                selectedInvoiceIds.includes(invoice.id) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => toggleInvoiceSelection(invoice.id)}
                            >
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedInvoiceIds.includes(invoice.id)}
                                  onChange={() => toggleInvoiceSelection(invoice.id)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {invoice.invoiceNumber || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {invoice.primaryRecipient?.company_name ||
                                  (invoice.primaryRecipient?.given_name && invoice.primaryRecipient?.family_name
                                    ? `${invoice.primaryRecipient.family_name} ${invoice.primaryRecipient.given_name}`
                                    : invoice.primaryRecipient?.email_address || '-')}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {invoice.paymentRequests?.[0]?.computedAmountMoney
                                  ? formatMoney(
                                      invoice.paymentRequests[0].computedAmountMoney.amount,
                                      invoice.paymentRequests[0].computedAmountMoney.currency
                                    )
                                  : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                  invoice.status === 'UNPAID' ? 'bg-yellow-100 text-yellow-700' :
                                  invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                                  invoice.status === 'CANCELED' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {getInvoiceStatusLabel(invoice.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(invoice.createdAt).toLocaleDateString('ja-JP')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 同期実行ボタン */}
              <div className="flex justify-end">
                <button
                  onClick={handleSync}
                  disabled={syncing || !settings.locationId || (syncMode === 'selected' && selectedInvoiceIds.length === 0)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="w-4 h-4" />
                  )}
                  {syncMode === 'all' && '全データを同期'}
                  {syncMode === 'dateRange' && '日付範囲で同期'}
                  {syncMode === 'selected' && `${selectedInvoiceIds.length}件をインポート`}
                </button>
              </div>
            </div>

            {/* 同期統計 */}
            {syncStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    請求書
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{syncStats.invoices.total}</p>
                      <p className="text-sm text-gray-600">合計</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{syncStats.invoices.synced}</p>
                      <p className="text-sm text-gray-600">同期済み</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{syncStats.invoices.failed}</p>
                      <p className="text-sm text-gray-600">失敗</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{syncStats.invoices.pending}</p>
                      <p className="text-sm text-gray-600">保留中</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    顧客
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{syncStats.customers.total}</p>
                      <p className="text-sm text-gray-600">合計</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{syncStats.customers.synced}</p>
                      <p className="text-sm text-gray-600">同期済み</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{syncStats.customers.failed}</p>
                      <p className="text-sm text-gray-600">失敗</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{syncStats.customers.pending}</p>
                      <p className="text-sm text-gray-600">保留中</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 同期履歴 */}
            {invoiceMappings.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">請求書同期履歴</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Square ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">システムID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終同期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceMappings.slice(0, 10).map((mapping, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-mono">
                            {mapping.squareInvoiceId?.substring(0, 12)}...
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {mapping.systemInvoiceId?.substring(0, 12) || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(mapping.syncStatus)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(mapping.lastSyncedAt).toLocaleString('ja-JP')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {customerMappings.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">顧客同期履歴</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Square ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">システムID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終同期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customerMappings.slice(0, 10).map((mapping, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm font-mono">
                            {mapping.squareCustomerId?.substring(0, 12)}...
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">
                            {mapping.systemCustomerId?.substring(0, 12) || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(mapping.syncStatus)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(mapping.lastSyncedAt).toLocaleString('ja-JP')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
