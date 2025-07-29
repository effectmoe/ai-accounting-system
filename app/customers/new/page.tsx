'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Customer, Contact } from '@/types/collections';
import CustomerChatModal from '@/components/CustomerChatModal';

import { logger } from '@/lib/logger';
interface CustomerForm {
  customerId: string;
  companyName: string;
  companyNameKana: string;
  department: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  paymentTerms: string;
  contacts: Contact[];
  tags: string;
  notes: string;
  isActive: boolean;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerForm>({
    customerId: '',
    companyName: '',
    companyNameKana: '',
    department: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    paymentTerms: '',
    contacts: [],
    tags: '',
    notes: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Partial<CustomerForm>>({});

  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerForm> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = '会社名は必須です';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (formData.phone && !/^[\d-+\s()]*$/.test(formData.phone)) {
      newErrors.phone = '有効な電話番号を入力してください';
    }

    if (formData.paymentTerms && !/^\d+$/.test(formData.paymentTerms)) {
      newErrors.paymentTerms = '支払いサイトは数値で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // タグの配列化処理
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('顧客の登録に失敗しました');
      }

      const data = await response.json();

      if (data.success) {
        toast.success('顧客を登録しました');
        router.push('/customers');
      } else {
        throw new Error(data.error || '顧客の登録に失敗しました');
      }
    } catch (error) {
      logger.error('Error creating customer:', error);
      toast.error(error instanceof Error ? error.message : '顧客の登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 入力値の更新
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    // エラーをクリア
    if (errors[name as keyof CustomerForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // 担当者の追加
  const addContact = () => {
    const newContact: Contact = {
      name: '',
      nameKana: '',
      title: '',
      email: '',
      phone: '',
      isPrimary: formData.contacts.length === 0,
    };
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, newContact]
    }));
  };

  // 担当者の削除
  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  // 担当者情報の更新
  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  // チャットから抽出されたデータを処理
  const handleDataExtracted = (data: any) => {
    console.log('Extracted data received:', data);
    
    setFormData(prev => {
      const newFormData = { ...prev };

      // 基本情報の処理
      if (data.companyName) newFormData.companyName = data.companyName;
      if (data.companyNameKana) newFormData.companyNameKana = data.companyNameKana;
      if (data.department) newFormData.department = data.department;

      // 住所情報の処理（APIからの分割済みデータを優先）
      if (data.postalCode) newFormData.postalCode = data.postalCode;
      if (data.prefecture) newFormData.prefecture = data.prefecture;  
      if (data.city) newFormData.city = data.city;
      if (data.address1) newFormData.address1 = data.address1;
      if (data.address2) newFormData.address2 = data.address2;
      
      // addressフィールドがある場合の処理（分割済みデータがない場合のみ）
      if (data.address && !data.address1) {
        // 住所が分割されていない場合のみ処理
        console.log('Processing unsplit address:', data.address);
        
        // 郵便番号を除去
        let cleanAddress = data.address.replace(/〒?\d{3}-?\d{4}\s*/, '');
        
        // 都道府県の抽出
        const prefectureMatch = cleanAddress.match(/(東京都|大阪府|京都府|北海道|.+?県)/);
        if (prefectureMatch) {
          newFormData.prefecture = prefectureMatch[1];
          cleanAddress = cleanAddress.replace(prefectureMatch[1], '');
        }
        
        // 市区町村の抽出
        const cityMatch = cleanAddress.match(/^(.+?[市区町村])/);
        if (cityMatch) {
          newFormData.city = cityMatch[1];
          cleanAddress = cleanAddress.replace(cityMatch[1], '');
        }
        
        // 残りを住所1に設定
        if (cleanAddress.trim()) {
          newFormData.address1 = cleanAddress.trim();
        }
        
        console.log('Address split result:', {
          prefecture: newFormData.prefecture,
          city: newFormData.city,
          address1: newFormData.address1
        });
      }

      // 電話番号、FAX、メール
      if (data.phone) newFormData.phone = data.phone;
      if (data.fax) newFormData.fax = data.fax;
      if (data.email) newFormData.email = data.email;
      if (data.website) newFormData.website = data.website;
      if (data.notes) newFormData.notes = data.notes;

      // 担当者情報
      if (data.name) {
        newFormData.contacts = [{
          name: data.name,
          nameKana: data.nameKana || '',
          title: data.title || data.department || '', // 役職がない場合は部署を使用
          email: data.email || '',
          phone: data.mobile || data.phone || '', // 携帯があれば優先
          isPrimary: true
        }];
        
        // 担当者の部署情報を会社の部署欄にも設定
        if (data.department && !newFormData.department) {
          newFormData.department = data.department;
        }
      }

      console.log('Updated form data:', newFormData);
      return newFormData;
    });
    
    // エラーをクリア
    setErrors({});
  };

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center gap-4">
            <Link
              href="/customers"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              戻る
            </Link>
            <h1 className="text-2xl font-bold">新規顧客登録</h1>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
            {/* 基本情報 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">基本情報</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 顧客コード */}
                <div>
                  <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">
                    顧客コード
                  </label>
                  <input
                    type="text"
                    id="customerId"
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CUST001"
                  />
                </div>

                {/* 支払いサイト */}
                <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-1">
                    支払いサイト（日数）
                  </label>
                  <input
                    type="number"
                    id="paymentTerms"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.paymentTerms ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="30"
                    min="0"
                  />
                  {errors.paymentTerms && (
                    <p className="mt-1 text-sm text-red-500">{errors.paymentTerms}</p>
                  )}
                </div>
              </div>

              {/* 会社名 */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.companyName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="株式会社○○"
                  required
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-500">{errors.companyName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 会社名カナ */}
                <div>
                  <label htmlFor="companyNameKana" className="block text-sm font-medium text-gray-700 mb-1">
                    会社名カナ
                  </label>
                  <input
                    type="text"
                    id="companyNameKana"
                    name="companyNameKana"
                    value={formData.companyNameKana}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="カブシキガイシャ○○"
                  />
                </div>

                {/* 部署 */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    部署
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="営業部"
                  />
                </div>
              </div>
            </div>

            {/* 住所情報 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">住所情報</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 郵便番号 */}
                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    郵便番号
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100-0001"
                  />
                </div>

                {/* 都道府県 */}
                <div>
                  <label htmlFor="prefecture" className="block text-sm font-medium text-gray-700 mb-1">
                    都道府県
                  </label>
                  <input
                    type="text"
                    id="prefecture"
                    name="prefecture"
                    value={formData.prefecture}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="東京都"
                  />
                </div>

                {/* 市区町村 */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    市区町村
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="千代田区"
                  />
                </div>
              </div>

              {/* 住所1 */}
              <div>
                <label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-1">
                  住所1
                </label>
                <input
                  type="text"
                  id="address1"
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="大手町1-1-1"
                />
              </div>

              {/* 住所2 */}
              <div>
                <label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-1">
                  住所2（建物名など）
                </label>
                <input
                  type="text"
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="○○ビル 5F"
                />
              </div>
            </div>

            {/* 連絡先情報 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">連絡先情報</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 電話番号 */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="03-1234-5678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

                {/* FAX */}
                <div>
                  <label htmlFor="fax" className="block text-sm font-medium text-gray-700 mb-1">
                    FAX
                  </label>
                  <input
                    type="tel"
                    id="fax"
                    name="fax"
                    value={formData.fax}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="03-1234-5679"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* メールアドレス */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="info@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* ウェブサイト */}
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    ウェブサイト
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* 担当者情報 */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-medium text-gray-900">担当者情報</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  担当者追加
                </button>
              </div>

              {formData.contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-800">担当者 {index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        氏名
                      </label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="山田 太郎"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        氏名カナ
                      </label>
                      <input
                        type="text"
                        value={contact.nameKana || ''}
                        onChange={(e) => updateContact(index, 'nameKana', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ヤマダ タロウ"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        役職
                      </label>
                      <input
                        type="text"
                        value={contact.title || ''}
                        onChange={(e) => updateContact(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="営業部長"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={contact.email || ''}
                        onChange={(e) => updateContact(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="yamada@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        電話番号
                      </label>
                      <input
                        type="tel"
                        value={contact.phone || ''}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="03-1234-5678"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary || false}
                        onChange={(e) => updateContact(index, 'isPrimary', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        主担当者
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              {formData.contacts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  担当者が登録されていません。上記の「担当者追加」ボタンから追加してください。
                </div>
              )}
            </div>

            {/* その他の情報 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">その他の情報</h3>
              
              {/* タグ */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="重要顧客, IT業界, 東京"
                />
              </div>

              {/* 備考 */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="その他の情報や特記事項..."
                />
              </div>

              {/* 有効/無効 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  有効な顧客として登録
                </label>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 justify-end pt-6 border-t">
              <Link
                href="/customers"
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 text-white rounded-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            </div>
          </form>
        </div>

        {/* 埋め込み型チャット機能 - 中央下部に配置 */}
        <div className="mt-8 flex justify-center">
          <CustomerChatModal
            isOpen={true}
            onClose={() => {}}
            onDataExtracted={handleDataExtracted}
            formData={formData}
          />
        </div>
      </div>
      </div>
    </div>
  );
}