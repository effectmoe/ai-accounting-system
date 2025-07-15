'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Building, Upload, Stamp, Save, CreditCard, Plus, Edit2, Trash2, Check, X, Settings, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CompanyInfo {
  id?: string;
  name: string;
  postal_code: string;
  address: string;
  phone_number: string;
  fax_number?: string;
  email: string;
  website?: string;
  representative: string;
  established_date?: string;
  capital?: number | string;
  fiscal_year_end?: string;
  tax_number?: string;
  logo_image?: string;
  stamp_image?: string;
  invoice_prefix?: string;
  invoice_notes?: string;
  payment_terms?: string;
  speech_settings?: {
    ai_prompt_enhancement?: {
      enabled: boolean;
      custom_prompt_instructions?: string;
      context_aware_homophone_correction: boolean;
      business_context_instructions?: string;
    };
    dictionary_correction?: {
      enabled: boolean;
      custom_dictionary: Array<{
        id: string;
        incorrect: string;
        correct: string;
        category?: string;
        description?: string;
      }>;
    };
  };
}

interface SpeechDictionaryEntry {
  id: string;
  incorrect: string;
  correct: string;
  category?: string;
  description?: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  branch_name: string;
  account_type: '普通' | '当座' | '貯蓄';
  account_number: string;
  account_holder: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface BankAccountForm {
  bank_name: string;
  branch_name: string;
  account_type: '普通' | '当座' | '貯蓄';
  account_number: string;
  account_holder: string;
  is_default: boolean;
  notes: string;
}

type TabType = 'company' | 'bank' | 'speech';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 自社情報
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    postal_code: '',
    address: '',
    phone_number: '',
    email: '',
    representative: '',
  });
  
  // 銀行口座
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [bankFormData, setBankFormData] = useState<BankAccountForm>({
    bank_name: '',
    branch_name: '',
    account_type: '普通',
    account_number: '',
    account_holder: '',
    is_default: false,
    notes: '',
  });
  const [bankErrors, setBankErrors] = useState<Partial<BankAccountForm>>({});
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // 初期データ取得
  useEffect(() => {
    fetchCompanyInfo();
    fetchBankAccounts();
  }, []);

  // 自社情報を取得
  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/company-info');
      if (!response.ok) throw new Error('Failed to fetch company info');
      
      const data = await response.json();
      if (data.success && data.companyInfo) {
        // 資本金が数値の場合は文字列に変換（入力フィールド用）
        const formattedInfo = {
          ...data.companyInfo,
          capital: data.companyInfo.capital ? String(data.companyInfo.capital) : ''
        };
        setCompanyInfo(formattedInfo);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      toast.error('自社情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 銀行口座一覧を取得
  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts');
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.error('銀行口座の取得に失敗しました');
    }
  };

  // 画像をBase64に変換
  const handleImageUpload = async (file: File, type: 'logo' | 'stamp') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyInfo(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_image' : 'stamp_image']: base64String
      }));
    };
    reader.readAsDataURL(file);
  };

  // 自社情報の保存
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 資本金を数値に変換してから送信
      const capitalValue = companyInfo.capital ? 
        (typeof companyInfo.capital === 'string' ? 
          (companyInfo.capital.trim() === '' ? null : Number(companyInfo.capital)) : 
          companyInfo.capital
        ) : null;
      
      const dataToSubmit = {
        ...companyInfo,
        capital: capitalValue
      };
      
      // デバッグログ
      console.log('Submitting company info:', {
        ...dataToSubmit,
        logo_image: dataToSubmit.logo_image ? '[BASE64_IMAGE]' : null,
        stamp_image: dataToSubmit.stamp_image ? '[BASE64_IMAGE]' : null,
      });
      
      const response = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const responseData = await response.json();
      console.log('Response from server:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to update company info');
      }

      if (responseData.success) {
        toast.success('自社情報を更新しました');
        // 保存成功後、データを再取得して最新の状態を反映
        await fetchCompanyInfo();
      } else {
        throw new Error(responseData.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating company info:', error);
      toast.error(error instanceof Error ? error.message : '自社情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 自社情報の入力値更新
  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({ ...prev, [name]: value }));
  };

  // 銀行口座フォームバリデーション
  const validateBankForm = (): boolean => {
    const newErrors: Partial<BankAccountForm> = {};

    if (!bankFormData.bank_name.trim()) {
      newErrors.bank_name = '銀行名は必須です';
    }
    if (!bankFormData.branch_name.trim()) {
      newErrors.branch_name = '支店名は必須です';
    }
    if (!bankFormData.account_number.trim()) {
      newErrors.account_number = '口座番号は必須です';
    } else if (!/^\d+$/.test(bankFormData.account_number)) {
      newErrors.account_number = '口座番号は数字のみで入力してください';
    }
    if (!bankFormData.account_holder.trim()) {
      newErrors.account_holder = '口座名義は必須です';
    }

    setBankErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 銀行口座モーダルを開く
  const openBankModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setBankFormData({
        bank_name: account.bank_name,
        branch_name: account.branch_name,
        account_type: account.account_type,
        account_number: account.account_number,
        account_holder: account.account_holder,
        is_default: account.is_default,
        notes: account.notes || '',
      });
    } else {
      setEditingAccount(null);
      setBankFormData({
        bank_name: '',
        branch_name: '',
        account_type: '普通',
        account_number: '',
        account_holder: '',
        is_default: accounts.length === 0,
        notes: '',
      });
    }
    setBankErrors({});
    setShowBankModal(true);
  };

  // 銀行口座モーダルを閉じる
  const closeBankModal = () => {
    setShowBankModal(false);
    setEditingAccount(null);
    setBankFormData({
      bank_name: '',
      branch_name: '',
      account_type: '普通',
      account_number: '',
      account_holder: '',
      is_default: false,
      notes: '',
    });
    setBankErrors({});
  };

  // 銀行口座フォーム送信
  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateBankForm()) return;
    
    setSaving(true);

    try {
      const url = editingAccount
        ? `/api/bank-accounts/${editingAccount.id}`
        : '/api/bank-accounts';
      
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankFormData),
      });

      if (!response.ok) throw new Error('Failed to save bank account');

      const data = await response.json();
      if (data.success) {
        toast.success(editingAccount ? '銀行口座を更新しました' : '銀行口座を追加しました');
        closeBankModal();
        fetchBankAccounts();
      } else {
        throw new Error(data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast.error('銀行口座の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 銀行口座削除
  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('この銀行口座を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete bank account');

      toast.success('銀行口座を削除しました');
      fetchBankAccounts();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast.error('銀行口座の削除に失敗しました');
    }
  };

  // デフォルト口座設定
  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (!response.ok) throw new Error('Failed to set default account');

      toast.success('デフォルト口座を設定しました');
      fetchBankAccounts();
    } catch (error) {
      console.error('Error setting default account:', error);
      toast.error('デフォルト口座の設定に失敗しました');
    }
  };

  // 銀行口座フォームの入力値更新
  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setBankFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (bankErrors[name as keyof BankAccountForm]) {
      setBankErrors(prev => ({ ...prev, [name]: undefined }));
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
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">設定</h1>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                自社情報
              </div>
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bank'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                銀行口座
              </div>
            </button>
            <button
              onClick={() => router.push('/settings/speech')}
              className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
            >
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                音声認識設定
              </div>
            </button>
          </nav>
        </div>

        {/* 自社情報タブ */}
        {activeTab === 'company' && (
          <form onSubmit={handleCompanySubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">基本情報</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    会社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={companyInfo.name}
                    onChange={handleCompanyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="representative" className="block text-sm font-medium text-gray-700 mb-1">
                    代表者名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="representative"
                    name="representative"
                    value={companyInfo.representative}
                    onChange={handleCompanyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                    郵便番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    value={companyInfo.postal_code}
                    onChange={handleCompanyChange}
                    required
                    placeholder="123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    住所 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={companyInfo.address}
                    onChange={handleCompanyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={companyInfo.phone_number}
                    onChange={handleCompanyChange}
                    required
                    placeholder="03-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="fax_number" className="block text-sm font-medium text-gray-700 mb-1">
                    FAX番号
                  </label>
                  <input
                    type="tel"
                    id="fax_number"
                    name="fax_number"
                    value={companyInfo.fax_number || ''}
                    onChange={handleCompanyChange}
                    placeholder="03-1234-5679"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={companyInfo.email}
                    onChange={handleCompanyChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    ウェブサイト
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={companyInfo.website || ''}
                    onChange={handleCompanyChange}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="tax_number" className="block text-sm font-medium text-gray-700 mb-1">
                    法人番号
                  </label>
                  <input
                    type="text"
                    id="tax_number"
                    name="tax_number"
                    value={companyInfo.tax_number || ''}
                    onChange={handleCompanyChange}
                    placeholder="1234567890123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="established_date" className="block text-sm font-medium text-gray-700 mb-1">
                    設立年月日
                  </label>
                  <input
                    type="date"
                    id="established_date"
                    name="established_date"
                    value={companyInfo.established_date || ''}
                    onChange={handleCompanyChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="capital" className="block text-sm font-medium text-gray-700 mb-1">
                    資本金
                  </label>
                  <input
                    type="number"
                    id="capital"
                    name="capital"
                    value={companyInfo.capital || ''}
                    onChange={handleCompanyChange}
                    placeholder="10000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    決算期
                  </label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={companyInfo.fiscal_year_end ? parseInt(companyInfo.fiscal_year_end.match(/(\d+)月/)?.[1] || '3') : ''}
                      onChange={(e) => {
                        const month = e.target.value;
                        const currentFiscalYearEnd = companyInfo.fiscal_year_end || '3月31日';
                        const day = currentFiscalYearEnd.match(/(\d+)日/)?.[1] || '31';
                        const formattedDate = `${month}月${day}日`;
                        setCompanyInfo(prev => ({ ...prev, fiscal_year_end: formattedDate }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">月を選択</option>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}月
                        </option>
                      ))}
                    </select>
                    <select
                      value={companyInfo.fiscal_year_end ? parseInt(companyInfo.fiscal_year_end.match(/(\d+)日/)?.[1] || '31') : ''}
                      onChange={(e) => {
                        const day = e.target.value;
                        const currentFiscalYearEnd = companyInfo.fiscal_year_end || '3月31日';
                        const month = currentFiscalYearEnd.match(/(\d+)月/)?.[1] || '3';
                        const formattedDate = `${month}月${day}日`;
                        setCompanyInfo(prev => ({ ...prev, fiscal_year_end: formattedDate }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">日を選択</option>
                      {[...Array(31)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}日
                        </option>
                      ))}
                    </select>
                  </div>
                  {companyInfo.fiscal_year_end && (
                    <p className="mt-1 text-sm text-gray-600">
                      決算期: {companyInfo.fiscal_year_end}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 画像設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">画像設定</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ロゴ画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会社ロゴ
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {companyInfo.logo_image ? (
                      <div className="space-y-3">
                        <img
                          src={companyInfo.logo_image}
                          alt="Company Logo"
                          className="max-h-32 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full text-sm text-blue-600 hover:text-blue-800"
                        >
                          画像を変更
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700"
                      >
                        <Upload className="w-8 h-8" />
                        <span className="text-sm">ロゴをアップロード</span>
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'logo');
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* 印鑑画像 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    会社印
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {companyInfo.stamp_image ? (
                      <div className="space-y-3">
                        <img
                          src={companyInfo.stamp_image}
                          alt="Company Stamp"
                          className="max-h-32 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={() => stampInputRef.current?.click()}
                          className="w-full text-sm text-blue-600 hover:text-blue-800"
                        >
                          画像を変更
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => stampInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700"
                      >
                        <Stamp className="w-8 h-8" />
                        <span className="text-sm">印鑑をアップロード</span>
                      </button>
                    )}
                    <input
                      ref={stampInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'stamp');
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 請求書設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">請求書設定</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="invoice_prefix" className="block text-sm font-medium text-gray-700 mb-1">
                    請求書番号プレフィックス
                  </label>
                  <input
                    type="text"
                    id="invoice_prefix"
                    name="invoice_prefix"
                    value={companyInfo.invoice_prefix || ''}
                    onChange={handleCompanyChange}
                    placeholder="INV-"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-1">
                    支払い条件（デフォルト）
                  </label>
                  <textarea
                    id="payment_terms"
                    name="payment_terms"
                    value={companyInfo.payment_terms || ''}
                    onChange={handleCompanyChange}
                    rows={2}
                    placeholder="お振込みは請求書発行日より30日以内にお願いいたします。"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="invoice_notes" className="block text-sm font-medium text-gray-700 mb-1">
                    請求書備考（デフォルト）
                  </label>
                  <textarea
                    id="invoice_notes"
                    name="invoice_notes"
                    value={companyInfo.invoice_notes || ''}
                    onChange={handleCompanyChange}
                    rows={3}
                    placeholder="備考欄に表示するデフォルトテキスト"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 保存ボタン */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save className="w-5 h-5" />
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </form>
        )}

        {/* 銀行口座タブ */}
        {activeTab === 'bank' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                請求書作成時にデフォルト口座の情報が自動的に備考欄に反映されます。
              </p>
              <button
                onClick={() => openBankModal()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新規追加
              </button>
            </div>

            {/* 口座一覧 */}
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  銀行口座が登録されていません
                </div>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`bg-white rounded-lg shadow p-6 ${
                      account.is_default ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{account.bank_name}</h3>
                          {account.is_default && (
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              デフォルト
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">支店名:</span>
                            <span className="ml-2">{account.branch_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">口座種別:</span>
                            <span className="ml-2">{account.account_type}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">口座番号:</span>
                            <span className="ml-2">{account.account_number}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">口座名義:</span>
                            <span className="ml-2">{account.account_holder}</span>
                          </div>
                        </div>
                        
                        {account.notes && (
                          <div className="mt-3 text-sm text-gray-600">
                            <span className="block">備考:</span>
                            <span className="block mt-1">{account.notes}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {!account.is_default && (
                          <button
                            onClick={() => handleSetDefaultAccount(account.id)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="デフォルトに設定"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openBankModal(account)}
                          className="text-gray-600 hover:text-gray-800 p-2"
                          title="編集"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 銀行口座モーダル */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingAccount ? '銀行口座編集' : '新規銀行口座'}
                </h2>
                <button
                  onClick={closeBankModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div>
                  <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                    銀行名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bank_name"
                    name="bank_name"
                    value={bankFormData.bank_name}
                    onChange={handleBankChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      bankErrors.bank_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="みずほ銀行"
                  />
                  {bankErrors.bank_name && (
                    <p className="mt-1 text-sm text-red-500">{bankErrors.bank_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                    支店名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="branch_name"
                    name="branch_name"
                    value={bankFormData.branch_name}
                    onChange={handleBankChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      bankErrors.branch_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="東京支店"
                  />
                  {bankErrors.branch_name && (
                    <p className="mt-1 text-sm text-red-500">{bankErrors.branch_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-1">
                    口座種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="account_type"
                    name="account_type"
                    value={bankFormData.account_type}
                    onChange={handleBankChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                    <option value="貯蓄">貯蓄</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-1">
                    口座番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="account_number"
                    name="account_number"
                    value={bankFormData.account_number}
                    onChange={handleBankChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      bankErrors.account_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567"
                  />
                  {bankErrors.account_number && (
                    <p className="mt-1 text-sm text-red-500">{bankErrors.account_number}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="account_holder" className="block text-sm font-medium text-gray-700 mb-1">
                    口座名義 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="account_holder"
                    name="account_holder"
                    value={bankFormData.account_holder}
                    onChange={handleBankChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      bankErrors.account_holder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="カブシキガイシャ〇〇"
                  />
                  {bankErrors.account_holder && (
                    <p className="mt-1 text-sm text-red-500">{bankErrors.account_holder}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    備考
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={bankFormData.notes}
                    onChange={handleBankChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="その他の情報..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    name="is_default"
                    checked={bankFormData.is_default}
                    onChange={handleBankChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                    デフォルトの口座として設定
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={closeBankModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-4 py-2 text-white rounded-lg ${
                      saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {saving ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}