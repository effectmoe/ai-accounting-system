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
  representativeName: string;  // 代表者名
  representativeTitle: string;  // 代表者肩書き
  storeName: string;
  storeNameKana: string;
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
  // メール送信先設定
  emailRecipientPreference: 'representative' | 'contact' | 'both' | null;
  primaryContactIndex: number;
  tags: string;
  notes: string;
  isActive: boolean;
}

export default function NewCustomerPage() {
  console.log('🚀 NewCustomerPage コンポーネント初期化');
  
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerForm>({
    customerId: '',
    companyName: '',
    companyNameKana: '',
    representativeName: '',  // 代表者名
    representativeTitle: '',  // 代表者肩書き
    storeName: '',
    storeNameKana: '',
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
    emailRecipientPreference: null, // デフォルトはnull（メール送信しない）
    primaryContactIndex: 0,
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

    // 電話番号の緩やかなバリデーション（より多くの形式を許可）
    if (formData.phone && formData.phone.trim()) {
      // 基本的な文字チェック（数字、ハイフン、プラス、スペース、括弧、ピリオド、#、ext などを許可）
      const phonePattern = /^[\d\-+\s().\#]*(?:ext\.?\s*\d+)?$/i;
      // 最低限の文字数チェック（3文字以上、30文字以下）
      const minLength = 3;
      const maxLength = 30;
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, ''); // スペース、ハイフン、括弧を除去して文字数をチェック
      
      if (!phonePattern.test(formData.phone)) {
        newErrors.phone = '電話番号に使用できない文字が含まれています';
      } else if (cleanPhone.length < minLength || cleanPhone.length > maxLength) {
        newErrors.phone = `電話番号は${minLength}〜${maxLength}文字で入力してください`;
      }
    }

    if (formData.paymentTerms && !/^\d+$/.test(formData.paymentTerms)) {
      newErrors.paymentTerms = '支払いサイトは数値で入力してください';
    }

    // メール送信先設定のバリデーション（メールアドレスは任意）
    // メールアドレスがない場合は、emailRecipientPreferenceをnullに設定
    if (formData.emailRecipientPreference) {
      if (formData.emailRecipientPreference === 'contact' || formData.emailRecipientPreference === 'both') {
        const primaryContact = formData.contacts[formData.primaryContactIndex];
        if (!primaryContact?.email) {
          console.log('注意: 選択した担当者にメールアドレスが設定されていません');
          // メールアドレスがない場合は設定をクリア
          formData.emailRecipientPreference = null;
        }
      }
      
      if (formData.emailRecipientPreference === 'representative' || formData.emailRecipientPreference === 'both') {
        if (!formData.email) {
          console.log('注意: 代表者メールアドレスが設定されていません');
          // メールアドレスがない場合は設定をクリア
          formData.emailRecipientPreference = null;
        }
      }
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

      // デバッグ: 送信前のフォームデータを詳細確認
      console.log('🚀 フォーム送信データ詳細:', {
        phone: submitData.phone,
        fax: submitData.fax,
        email: submitData.email,
        website: submitData.website,
        phoneInputValue: (document.getElementById('phone') as HTMLInputElement)?.value,
        faxInputValue: (document.getElementById('fax') as HTMLInputElement)?.value,
        emailInputValue: (document.getElementById('email') as HTMLInputElement)?.value,
        websiteInputValue: (document.getElementById('website') as HTMLInputElement)?.value,
        formDataState: {
          phone: formData.phone,
          fax: formData.fax,
          email: formData.email,
          website: formData.website
        }
      });
      
      // 重要: 住所データも確認
      console.log('🏠 送信時の住所データ:', {
        prefecture: submitData.prefecture,
        city: submitData.city,
        address1: submitData.address1,
        address2: submitData.address2,
        postalCode: submitData.postalCode
      });
      
      // JSON文字列化してデータ構造を確認
      console.log('📋 完全なsubmitData:', JSON.stringify(submitData, null, 2));

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
    
    // デバッグ: 連絡先情報フィールドの変更を監視
    if (['phone', 'fax', 'email', 'website'].includes(name)) {
      console.log('📝 連絡先フィールド変更:', {
        field: name,
        oldValue: formData[name as keyof CustomerForm],
        newValue: finalValue,
        placeholderValue: (e.target as HTMLInputElement).placeholder
      });
    }
    
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
    console.log('🎯 handleDataExtracted 関数呼び出し開始');
    console.log('📊 受信データ詳細:', JSON.stringify(data, null, 2));
    
    // APIから返されたデータの検証
    console.log('🔍 データ検証:', {
      hasAddress: !!data.address,
      hasPrefecture: !!data.prefecture,
      hasCity: !!data.city,
      hasAddress1: !!data.address1,
      hasAddress2: !!data.address2,
      hasFax: !!data.fax,
      hasWebsite: !!data.website,
      hasPostalCode: !!data.postalCode
    });
    
    // 重要: データが正しく存在することを確認
    console.log('📌 重要フィールド確認:', {
      prefecture_value: data.prefecture,
      city_value: data.city,
      address1_value: data.address1,
      fax_value: data.fax,
      website_value: data.website
    });
    
    setFormData(prev => {
      const newFormData = { ...prev };

      // 基本情報の処理
      if (data.companyName) newFormData.companyName = data.companyName;
      if (data.companyNameKana) newFormData.companyNameKana = data.companyNameKana;
      if (data.department) newFormData.department = data.department;

      // デバッグ: 受信した住所データを確認
      console.log('🏠 住所データ確認:', {
        postalCode: data.postalCode,
        prefecture: data.prefecture,
        city: data.city,
        address1: data.address1,
        address2: data.address2,
        address: data.address
      });

      // 住所情報の処理（APIからの分割済みデータを優先）
      // 重要: データの存在を確認してから設定
      if (data.postalCode !== undefined && data.postalCode !== null) {
        newFormData.postalCode = data.postalCode;
        console.log('✅ 郵便番号設定:', data.postalCode);
      }
      if (data.prefecture !== undefined && data.prefecture !== null) {
        newFormData.prefecture = data.prefecture;
        console.log('✅ 都道府県設定:', data.prefecture);  
      }
      if (data.city !== undefined && data.city !== null) {
        newFormData.city = data.city;
        console.log('✅ 市区町村設定:', data.city);
      }
      if (data.address1 !== undefined && data.address1 !== null) {
        newFormData.address1 = data.address1;
        console.log('✅ 住所1設定:', data.address1);
      }
      if (data.address2 !== undefined && data.address2 !== null) {
        newFormData.address2 = data.address2;
        console.log('✅ 住所2設定:', data.address2);
      }
      
      // addressフィールドがある場合の処理（分割済みデータがない場合のみ）
      // 重要: APIが prefecture, city, address1, address2 を提供している場合は、address フィールドは無視する
      const hasAllSplitData = data.prefecture && data.city && (data.address1 || data.address2);
      console.log('🔍 分割済みデータチェック:', { 
        hasAllSplitData, 
        willSkipAddressParsing: hasAllSplitData,
        providedFields: {
          prefecture: data.prefecture,
          city: data.city,
          address1: data.address1,
          address2: data.address2
        }
      });
      
      if (data.address && !hasAllSplitData) {
        // 住所が完全に分割されていない場合のみ処理
        console.log('⚠️ 完全な分割データがないため、addressフィールドから分割を試行:', data.address);
        
        // 郵便番号を除去
        let cleanAddress = data.address.replace(/〒?\d{3}-?\d{4}\s*/, '');
        
        // 都道府県の抽出（既にある場合はスキップ）
        if (!data.prefecture) {
          const prefectureMatch = cleanAddress.match(/(東京都|大阪府|京都府|北海道|.+?県)/);
          if (prefectureMatch) {
            newFormData.prefecture = prefectureMatch[1];
            cleanAddress = cleanAddress.replace(prefectureMatch[1], '');
          }
        }
        
        // 市区町村の抽出（既にある場合はスキップ）
        if (!data.city) {
          const cityMatch = cleanAddress.match(/^(.+?[市区町村])/);
          if (cityMatch) {
            newFormData.city = cityMatch[1];
            cleanAddress = cleanAddress.replace(cityMatch[1], '');
          }
        }
        
        // 住所1の設定（既にある場合はスキップ）
        if (!data.address1 && cleanAddress.trim()) {
          newFormData.address1 = cleanAddress.trim();
        }
        
        console.log('Address split result:', {
          prefecture: newFormData.prefecture,
          city: newFormData.city,
          address1: newFormData.address1
        });
      }

      // 担当者情報の処理を先に行う
      if (data.name) {
        newFormData.contacts = [{
          name: data.name,
          nameKana: data.nameKana || '',
          title: data.title || data.department || '', // 役職がない場合は部署を使用
          email: data.contactEmail || data.email || '', // 担当者専用メールがあれば優先
          phone: data.mobile || data.contactPhone || '', // 携帯または担当者専用電話
          isPrimary: true
        }];
        
        // 担当者の部署情報を会社の部署欄にも設定
        if (data.department && !newFormData.department) {
          newFormData.department = data.department;
        }
      }

      // 会社の連絡先情報（担当者情報の後に処理して会社情報を優先）
      // 重要: 空文字列も有効な値として扱う
      if (data.phone !== undefined && data.phone !== null) {
        newFormData.phone = data.phone;
        console.log('✅ 電話番号設定:', data.phone);
      }
      if (data.fax !== undefined && data.fax !== null) {
        newFormData.fax = data.fax;
        console.log('✅ FAX設定:', data.fax);
      }
      if (data.email !== undefined && data.email !== null) {
        newFormData.email = data.email;
        console.log('✅ メール設定:', data.email);
      }
      if (data.website !== undefined && data.website !== null) {
        newFormData.website = data.website;
        console.log('✅ ウェブサイト設定:', data.website);
      }
      if (data.notes !== undefined && data.notes !== null) {
        newFormData.notes = data.notes;
        console.log('✅ 備考設定:', data.notes);
      }

      console.log('Final form data:', newFormData);
      console.log('Company contact info check:', {
        phone: newFormData.phone,
        fax: newFormData.fax,
        email: newFormData.email,
        website: newFormData.website
      });
      
      // フォーム状態更新後の確認（次回render時）
      setTimeout(() => {
        console.log('⏰ 状態更新後の確認:', {
          formDataState: {
            phone: newFormData.phone,
            fax: newFormData.fax,
            email: newFormData.email,
            website: newFormData.website
          },
          actualInputValues: {
            phone: (document.getElementById('phone') as HTMLInputElement)?.value,
            fax: (document.getElementById('fax') as HTMLInputElement)?.value,
            email: (document.getElementById('email') as HTMLInputElement)?.value,
            website: (document.getElementById('website') as HTMLInputElement)?.value
          },
          placeholderValues: {
            phone: (document.getElementById('phone') as HTMLInputElement)?.placeholder,
            fax: (document.getElementById('fax') as HTMLInputElement)?.placeholder,
            email: (document.getElementById('email') as HTMLInputElement)?.placeholder,
            website: (document.getElementById('website') as HTMLInputElement)?.placeholder
          }
        });
      }, 100);
      
      return newFormData;
    });
    
    // エラーをクリア
    setErrors({});
  };

  return (
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

              {/* 代表者情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700 mb-1">
                    代表者名
                  </label>
                  <input
                    type="text"
                    id="representativeName"
                    name="representativeName"
                    value={formData.representativeName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="山田 太郎"
                  />
                </div>

                <div>
                  <label htmlFor="representativeTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    代表者肩書き
                  </label>
                  <input
                    type="text"
                    id="representativeTitle"
                    name="representativeTitle"
                    value={formData.representativeTitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="代表取締役社長"
                  />
                </div>
              </div>

              {/* 屋号・店舗名 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                    屋号・店舗名
                  </label>
                  <input
                    type="text"
                    id="storeName"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="○○ストア"
                  />
                </div>

                <div>
                  <label htmlFor="storeNameKana" className="block text-sm font-medium text-gray-700 mb-1">
                    屋号・店舗名カナ
                  </label>
                  <input
                    type="text"
                    id="storeNameKana"
                    name="storeNameKana"
                    value={formData.storeNameKana}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="○○ストア"
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
                  {/* デバッグ情報 */}
                  {process.env.NODE_ENV === 'development' && formData.fax && (
                    <p className="text-xs text-gray-500 mt-1">Debug: {formData.fax}</p>
                  )}
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

            {/* メール送信先設定 */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">メール送信先設定</h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  請求書や見積書を送信する際のメールアドレスを選択してください。<br />
                  <span className="text-gray-500">※ メールアドレスが設定されていない場合は選択不要です</span>
                </p>
                
                <div className="space-y-3">
                  {/* なし（メール送信しない） */}
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="emailRecipientPreference"
                      value="none"
                      checked={!formData.emailRecipientPreference}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailRecipientPreference: null }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">メール送信しない</span>
                      <p className="text-sm text-gray-600 mt-1">メールアドレスが設定されていない場合はこちらを選択してください</p>
                    </div>
                  </label>

                  {/* 代表者メールアドレスに送信 */}
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="emailRecipientPreference"
                      value="representative"
                      checked={formData.emailRecipientPreference === 'representative'}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailRecipientPreference: e.target.value as 'representative' | 'contact' | 'both' | null }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">代表者メールアドレスに送信</span>
                      {formData.email && (
                        <p className="text-sm text-gray-600 mt-1">送信先: {formData.email}</p>
                      )}
                      {!formData.email && (
                        <p className="text-sm text-red-500 mt-1">※ 代表者メールアドレスが設定されていません</p>
                      )}
                    </div>
                  </label>

                  {/* 担当者メールアドレスに送信 */}
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="emailRecipientPreference"
                      value="contact"
                      checked={formData.emailRecipientPreference === 'contact'}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailRecipientPreference: e.target.value as 'representative' | 'contact' | 'both' | null }))}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium">担当者メールアドレスに送信</span>
                      {formData.contacts.length > 0 && (
                        <div className="mt-2">
                          <select
                            value={formData.primaryContactIndex}
                            onChange={(e) => setFormData(prev => ({ ...prev, primaryContactIndex: parseInt(e.target.value) }))}
                            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={formData.emailRecipientPreference !== 'contact' && formData.emailRecipientPreference !== 'both'}
                          >
                            {formData.contacts.map((contact, index) => (
                              <option key={index} value={index}>
                                {contact.name || `担当者 ${index + 1}`}
                                {contact.email ? ` (${contact.email})` : ' (メールアドレス未設定)'}
                              </option>
                            ))}
                          </select>
                          {formData.contacts[formData.primaryContactIndex]?.email && (
                            <p className="text-sm text-gray-600 mt-1">
                              送信先: {formData.contacts[formData.primaryContactIndex].email}
                            </p>
                          )}
                          {!formData.contacts[formData.primaryContactIndex]?.email && (
                            <p className="text-sm text-red-500 mt-1">
                              ※ 選択した担当者にメールアドレスが設定されていません
                            </p>
                          )}
                        </div>
                      )}
                      {formData.contacts.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">※ 担当者が登録されていません</p>
                      )}
                    </div>
                  </label>

                  {/* 両方に送信 */}
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="emailRecipientPreference"
                      value="both"
                      checked={formData.emailRecipientPreference === 'both'}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailRecipientPreference: e.target.value as 'representative' | 'contact' | 'both' | null }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <span className="font-medium">両方に送信</span>
                      <p className="text-sm text-gray-600 mt-1">
                        代表者メールアドレスと担当者メールアドレスの両方に送信します
                      </p>
                      {formData.email && formData.contacts[formData.primaryContactIndex]?.email && (
                        <div className="text-sm text-gray-600 mt-1">
                          <p>代表者: {formData.email}</p>
                          <p>担当者: {formData.contacts[formData.primaryContactIndex].email}</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {errors.emailRecipientPreference && (
                  <p className="text-sm text-red-500">{errors.emailRecipientPreference}</p>
                )}
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
          <div className="w-full max-w-2xl">
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