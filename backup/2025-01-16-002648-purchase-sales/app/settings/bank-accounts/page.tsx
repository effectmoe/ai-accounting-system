'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Check, X, CreditCard } from 'lucide-react';

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

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<BankAccountForm>({
    bank_name: '',
    branch_name: '',
    account_type: '普通',
    account_number: '',
    account_holder: '',
    is_default: false,
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<BankAccountForm>>({});

  // 銀行口座一覧を取得
  useEffect(() => {
    fetchBankAccounts();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: Partial<BankAccountForm> = {};

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = '銀行名は必須です';
    }
    if (!formData.branch_name.trim()) {
      newErrors.branch_name = '支店名は必須です';
    }
    if (!formData.account_number.trim()) {
      newErrors.account_number = '口座番号は必須です';
    } else if (!/^\d+$/.test(formData.account_number)) {
      newErrors.account_number = '口座番号は数字のみで入力してください';
    }
    if (!formData.account_holder.trim()) {
      newErrors.account_holder = '口座名義は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // モーダルを開く
  const openModal = (account?: BankAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
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
      setFormData({
        bank_name: '',
        branch_name: '',
        account_type: '普通',
        account_number: '',
        account_holder: '',
        is_default: accounts.length === 0,
        notes: '',
      });
    }
    setErrors({});
    setShowModal(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      bank_name: '',
      branch_name: '',
      account_type: '普通',
      account_number: '',
      account_holder: '',
      is_default: false,
      notes: '',
    });
    setErrors({});
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);

    try {
      const url = editingAccount
        ? `/api/bank-accounts/${editingAccount.id}`
        : '/api/bank-accounts';
      
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save bank account');

      const data = await response.json();
      if (data.success) {
        toast.success(editingAccount ? '銀行口座を更新しました' : '銀行口座を追加しました');
        closeModal();
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
  const handleDelete = async (accountId: string) => {
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
  const handleSetDefault = async (accountId: string) => {
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

  // 入力値の更新
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name as keyof BankAccountForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">銀行口座管理</h1>
          </div>
          <button
            onClick={() => openModal()}
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
                        onClick={() => handleSetDefault(account.id)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="デフォルトに設定"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openModal(account)}
                      className="text-gray-600 hover:text-gray-800 p-2"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
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

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingAccount ? '銀行口座編集' : '新規銀行口座'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                    銀行名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bank_name"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.bank_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="みずほ銀行"
                  />
                  {errors.bank_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.bank_name}</p>
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
                    value={formData.branch_name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.branch_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="東京支店"
                  />
                  {errors.branch_name && (
                    <p className="mt-1 text-sm text-red-500">{errors.branch_name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="account_type" className="block text-sm font-medium text-gray-700 mb-1">
                    口座種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="account_type"
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
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
                    value={formData.account_number}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.account_number ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1234567"
                  />
                  {errors.account_number && (
                    <p className="mt-1 text-sm text-red-500">{errors.account_number}</p>
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
                    value={formData.account_holder}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.account_holder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="カブシキガイシャ〇〇"
                  />
                  {errors.account_holder && (
                    <p className="mt-1 text-sm text-red-500">{errors.account_holder}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    備考
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
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
                    checked={formData.is_default}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                    デフォルトの口座として設定
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
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