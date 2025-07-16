'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Building, Upload, Stamp, Save } from 'lucide-react';

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
  capital?: number;
  fiscal_year_end?: string;
  tax_number?: string;
  logo_image?: string;
  stamp_image?: string;
  invoice_prefix?: string;
  invoice_notes?: string;
  payment_terms?: string;
  quote_validity_days?: number;
}

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    postal_code: '',
    address: '',
    phone_number: '',
    email: '',
    representative: '',
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // 自社情報を取得
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/company-info');
      if (!response.ok) throw new Error('Failed to fetch company info');
      
      const data = await response.json();
      if (data.success && data.companyInfo) {
        setCompanyInfo(data.companyInfo);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      toast.error('自社情報の取得に失敗しました');
    } finally {
      setLoading(false);
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

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyInfo),
      });

      if (!response.ok) throw new Error('Failed to update company info');

      const data = await response.json();
      if (data.success) {
        toast.success('自社情報を更新しました');
      } else {
        throw new Error(data.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating company info:', error);
      toast.error('自社情報の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 入力値の更新
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({ ...prev, [name]: value }));
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
          <Building className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">自社情報設定</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  placeholder="10000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-gray-700 mb-1">
                  決算期
                </label>
                <input
                  type="text"
                  id="fiscal_year_end"
                  name="fiscal_year_end"
                  value={companyInfo.fiscal_year_end || ''}
                  onChange={handleChange}
                  placeholder="3月31日"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  onChange={handleChange}
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
                  onChange={handleChange}
                  rows={2}
                  placeholder="お振込みは請求書発行日より30日以内にお願いいたします。"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="quote_validity_days" className="block text-sm font-medium text-gray-700 mb-1">
                  見積書のデフォルト有効期限（日数）
                </label>
                <input
                  type="number"
                  id="quote_validity_days"
                  name="quote_validity_days"
                  value={companyInfo.quote_validity_days || 30}
                  onChange={handleChange}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  見積書作成時のデフォルト有効期限日数（1〜365日）
                </p>
              </div>

              <div>
                <label htmlFor="invoice_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  請求書備考（デフォルト）
                </label>
                <textarea
                  id="invoice_notes"
                  name="invoice_notes"
                  value={companyInfo.invoice_notes || ''}
                  onChange={handleChange}
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
      </div>
    </div>
  );
}