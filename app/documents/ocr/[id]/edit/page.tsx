'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import toast from 'react-hot-toast';

interface OcrData {
  id: string;
  file_name: string;
  vendor_name: string;
  receipt_date: string;
  subtotal_amount?: number;  // 小計（税抜き）
  tax_amount: number;       // 消費税
  total_amount: number;     // 合計（税込み）
  payment_amount?: number;   // お預かり金額
  change_amount?: number;    // お釣り
  receipt_number?: string;  // 領収書番号
  store_name?: string;      // 店舗名
  store_phone?: string;     // 店舗電話番号
  company_name?: string;    // 会社名
  notes?: string;           // 備考
  extracted_text: string;
  extracted_data: any;
  file_url?: string;
}

export default function OcrEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OcrData | null>(null);
  
  useEffect(() => {
    loadOcrData();
  }, [params.id]);

  const loadOcrData = async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      
      setData(data);
    } catch (error) {
      console.error('Error loading OCR data:', error);
      toast.error('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    
    setSaving(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('ocr_results')
        .update({
          vendor_name: data.vendor_name,
          receipt_date: data.receipt_date,
          subtotal_amount: data.subtotal_amount || 0,
          tax_amount: data.tax_amount || 0,
          total_amount: data.total_amount || 0,
          payment_amount: data.payment_amount || 0,
          change_amount: data.change_amount || 0,
          receipt_number: data.receipt_number,
          store_name: data.store_name,
          store_phone: data.store_phone,
          company_name: data.company_name,
          notes: data.notes
        })
        .eq('id', params.id);

      if (error) throw error;
      
      toast.success('保存しました');
      router.push('/documents');
    } catch (error) {
      console.error('Error saving OCR data:', error);
      toast.error('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!data) return;
    
    setSaving(true);
    try {
      // 領収書データを作成
      const response = await fetch('/api/documents/create-from-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ocrResultId: data.id,
          vendor_name: data.vendor_name,
          receipt_date: data.receipt_date,
          subtotal_amount: data.subtotal_amount || 0,
          tax_amount: data.tax_amount || 0,
          total_amount: data.total_amount || 0,
          payment_amount: data.payment_amount || 0,
          change_amount: data.change_amount || 0,
          receipt_number: data.receipt_number,
          store_name: data.store_name,
          store_phone: data.store_phone,
          company_name: data.company_name,
          notes: data.notes,
          file_name: data.file_name
        })
      });

      if (!response.ok) {
        throw new Error('文書の作成に失敗しました');
      }

      const result = await response.json();
      toast.success('領収書を作成しました');
      router.push(`/documents/${result.id}`);
    } catch (error) {
      console.error('Create document error:', error);
      toast.error('文書の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">データが見つかりません</p>
          <button
            onClick={() => router.push('/documents')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            書類一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">OCR結果の編集</h1>
          <p className="mt-1 text-sm text-gray-600">{data.file_name}</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左側：編集フォーム */}
            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">基本情報</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ベンダー名</label>
                    <input
                      type="text"
                      value={data.vendor_name || ''}
                      onChange={(e) => setData({ ...data, vendor_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">日付</label>
                      <input
                        type="date"
                        value={data.receipt_date || ''}
                        onChange={(e) => setData({ ...data, receipt_date: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">領収書番号</label>
                      <input
                        type="text"
                        value={data.receipt_number || ''}
                        onChange={(e) => setData({ ...data, receipt_number: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 金額情報 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">金額情報</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">小計（税抜き）</label>
                      <input
                        type="number"
                        value={data.subtotal_amount || 0}
                        onChange={(e) => setData({ ...data, subtotal_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">消費税</label>
                      <input
                        type="number"
                        value={data.tax_amount || 0}
                        onChange={(e) => setData({ ...data, tax_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">合計（税込み）</label>
                      <input
                        type="number"
                        value={data.total_amount || 0}
                        onChange={(e) => setData({ ...data, total_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">お預かり金額</label>
                      <input
                        type="number"
                        value={data.payment_amount || 0}
                        onChange={(e) => setData({ ...data, payment_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">お釣り</label>
                      <input
                        type="number"
                        value={data.change_amount || 0}
                        onChange={(e) => setData({ ...data, change_amount: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 店舗情報 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">店舗情報</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">店舗名</label>
                    <input
                      type="text"
                      value={data.store_name || ''}
                      onChange={(e) => setData({ ...data, store_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">電話番号</label>
                      <input
                        type="text"
                        value={data.store_phone || ''}
                        onChange={(e) => setData({ ...data, store_phone: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">会社名</label>
                      <input
                        type="text"
                        value={data.company_name || ''}
                        onChange={(e) => setData({ ...data, company_name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 備考 */}
              <div>
                <label className="block text-sm font-medium text-gray-700">備考</label>
                <textarea
                  value={data.notes || ''}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="その他の情報を入力してください"
                />
              </div>
            </div>

            {/* 右側：OCR抽出テキスト */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                OCR抽出テキスト
              </h3>
              <div className="bg-gray-50 rounded p-4 h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {data.extracted_text || 'テキストなし'}
                </pre>
              </div>
              {data.file_url?.startsWith('gdrive://') && (
                <div className="mt-4">
                  <a
                    href={`/api/gdrive/proxy?fileId=${data.file_url.replace('gdrive://', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    元画像を表示
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => router.push('/documents')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              キャンセル
            </button>
            
            <div className="space-x-3">
              <button
                onClick={handleCreateDocument}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? '作成中...' : '領収書を作成'}
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}