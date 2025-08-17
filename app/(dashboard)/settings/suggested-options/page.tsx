'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { formatPrice } from '@/components/common/format-utils';
import {
  SuggestedOption,
  CreateSuggestedOptionRequest,
  UpdateSuggestedOptionRequest
} from '@/types/suggested-option';
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

interface SuggestedOptionFormData {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  isActive: boolean;
  minAmount: string;
  maxAmount: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  features?: string;
  ctaText?: string;
  ctaUrl?: string;
  minAmount?: string;
  maxAmount?: string;
}

// ソート可能なアイテムコンポーネント
interface SortableItemProps {
  option: SuggestedOption;
  index: number;
  onToggleActive: (id: string) => void;
  onEdit: (option: SuggestedOption) => void;
  onDelete: (id: string) => void;
}

function SortableItem({ option, index, onToggleActive, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option._id?.toString() || '' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg shadow p-6 ${
        !option.isActive ? 'opacity-60' : ''
      } ${isDragging ? 'z-50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div 
            className="flex items-center gap-2 text-sm text-gray-500 cursor-move"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
            #{index + 1}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{option.title}</h3>
              <span className="text-lg font-bold text-blue-600">{formatPrice(option.price)}</span>
              {!option.isActive && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                  無効
                </span>
              )}
            </div>
            
            <p className="text-gray-600 mb-3 whitespace-pre-wrap">{option.description}</p>
            
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">特徴:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {option.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">CTAテキスト:</span>
                <span className="ml-2">{option.ctaText || '未設定'}</span>
              </div>
              <div>
                <span className="text-gray-600">最小金額:</span>
                <span className="ml-2">
                  {option.minAmount ? `¥${option.minAmount.toLocaleString()}` : '制限なし'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">最大金額:</span>
                <span className="ml-2">
                  {option.maxAmount ? `¥${option.maxAmount.toLocaleString()}` : '制限なし'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onToggleActive(option._id!.toString())}
            className={`p-2 ${
              option.isActive 
                ? 'text-green-600 hover:text-green-800' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={option.isActive ? '無効にする' : '有効にする'}
          >
            {option.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(option)}
            className="text-gray-600 hover:text-gray-800 p-2"
            title="編集"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(option._id!.toString())}
            className="text-red-600 hover:text-red-800 p-2"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuggestedOptionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestedOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOption, setEditingOption] = useState<SuggestedOption | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isReordering, setIsReordering] = useState(false);
  
  const [formData, setFormData] = useState<SuggestedOptionFormData>({
    title: '',
    description: '',
    price: '',
    features: [''],
    ctaText: '',
    ctaUrl: '',
    isActive: true,
    minAmount: '',
    maxAmount: ''
  });

  // ドラッグ&ドロップ用のセンサー設定
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

  // 初期データ取得
  useEffect(() => {
    fetchSuggestedOptions();
  }, []);

  // おすすめオプション一覧取得
  const fetchSuggestedOptions = async () => {
    try {
      const response = await fetch('/api/suggested-options?sortBy=displayOrder&sortOrder=asc');
      if (!response.ok) throw new Error('Failed to fetch suggested options');
      
      const data = await response.json();
      setSuggestedOptions(data.suggestedOptions);
    } catch (error) {
      logger.error('Error fetching suggested options:', error);
      toast.error('おすすめオプションの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // フォームバリデーション
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タイトルは必須です';
    }
    
    // 説明はオプショナルに変更
    // if (!formData.description.trim()) {
    //   newErrors.description = '説明は必須です';
    // }
    
    if (!formData.price.trim()) {
      newErrors.price = '価格は必須です';
    }
    
    // CTAフィールドはオプショナルだが、一方が入力されている場合は両方必要
    const hasCtaText = formData.ctaText.trim() !== '';
    const hasCtaUrl = formData.ctaUrl.trim() !== '';
    
    if (hasCtaText && !hasCtaUrl) {
      newErrors.ctaUrl = 'CTAテキストが入力されている場合、CTAリンクも必要です';
    }
    
    if (hasCtaUrl && !hasCtaText) {
      newErrors.ctaText = 'CTAリンクが入力されている場合、CTAテキストも必要です';
    }
    
    if (hasCtaUrl && !formData.ctaUrl.startsWith('http')) {
      newErrors.ctaUrl = 'CTAリンクは http:// または https:// で始まる必要があります';
    }

    // 特徴はオプショナルに変更
    // const validFeatures = formData.features.filter(f => f.trim() !== '');
    // if (validFeatures.length === 0) {
    //   newErrors.features = '特徴は最低1つ入力してください';
    // }

    // 金額範囲の検証
    if (formData.minAmount && formData.maxAmount) {
      const min = parseInt(formData.minAmount);
      const max = parseInt(formData.maxAmount);
      if (min > max) {
        newErrors.minAmount = '最小金額は最大金額より小さくしてください';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // モーダルを開く
  const openModal = (option?: SuggestedOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        title: option.title,
        description: option.description,
        price: option.price,
        features: option.features.length > 0 ? option.features : [''],
        ctaText: option.ctaText || '',
        ctaUrl: option.ctaUrl || '',
        isActive: option.isActive,
        minAmount: option.minAmount?.toString() || '',
        maxAmount: option.maxAmount?.toString() || ''
      });
    } else {
      setEditingOption(null);
      setFormData({
        title: '',
        description: '',
        price: '',
        features: [''],
        ctaText: '',
        ctaUrl: '',
        isActive: true,
        minAmount: '',
        maxAmount: ''
      });
    }
    setErrors({});
    setShowModal(true);
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowModal(false);
    setEditingOption(null);
    setErrors({});
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaving(true);

    try {
      const requestData: CreateSuggestedOptionRequest | UpdateSuggestedOptionRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price.trim(),
        features: formData.features.filter(f => f.trim() !== ''),
        ...(formData.ctaText.trim() && { ctaText: formData.ctaText.trim() }),
        ...(formData.ctaUrl.trim() && { ctaUrl: formData.ctaUrl.trim() }),
        isActive: formData.isActive,
        ...(formData.minAmount && { minAmount: parseInt(formData.minAmount) }),
        ...(formData.maxAmount && { maxAmount: parseInt(formData.maxAmount) })
      };

      const url = editingOption
        ? `/api/suggested-options/${editingOption._id}`
        : '/api/suggested-options';
      
      const method = editingOption ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save suggested option');
      }

      toast.success(editingOption ? 'おすすめオプションを更新しました' : 'おすすめオプションを作成しました');
      closeModal();
      fetchSuggestedOptions();
    } catch (error) {
      logger.error('Error saving suggested option:', error);
      toast.error(error instanceof Error ? error.message : 'おすすめオプションの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!confirm('このおすすめオプションを削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/suggested-options/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete suggested option');

      toast.success('おすすめオプションを削除しました');
      fetchSuggestedOptions();
    } catch (error) {
      logger.error('Error deleting suggested option:', error);
      toast.error('おすすめオプションの削除に失敗しました');
    }
  };

  // アクティブ状態切り替え
  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(`/api/suggested-options/${id}/toggle`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to toggle active status');

      const data = await response.json();
      toast.success(data.message);
      fetchSuggestedOptions();
    } catch (error) {
      logger.error('Error toggling active status:', error);
      toast.error('ステータスの変更に失敗しました');
    }
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = suggestedOptions.findIndex(option => option._id?.toString() === active.id);
      const newIndex = suggestedOptions.findIndex(option => option._id?.toString() === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // UIを即座に更新
        const newOptions = arrayMove(suggestedOptions, oldIndex, newIndex);
        setSuggestedOptions(newOptions);
        
        try {
          // 新しい順序をAPIに送信
          const updatePromises = newOptions.map((option, index) => 
            fetch(`/api/suggested-options/${option._id}/order`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ displayOrder: index }),
            })
          );
          
          await Promise.all(updatePromises);
          toast.success('並び順を更新しました');
        } catch (error) {
          logger.error('Error updating display order:', error);
          toast.error('並び順の更新に失敗しました');
          // エラー時は元の順序に戻す
          fetchSuggestedOptions();
        }
      }
    }
    
    setIsReordering(false);
  };

  // フォーム入力値更新
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // 特徴リストの管理
  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      setFormData(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }));
    }
  };

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }));
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold">おすすめオプション管理</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新規追加
          </button>
        </div>

        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">おすすめオプションについて</h3>
              <p className="text-sm text-gray-600 mt-1">
                見積書メールに自動で追加されるおすすめ商品・サービスです。見積金額に応じて表示条件を設定できます。
              </p>
            </div>
          </div>
        </div>

        {/* オプション一覧 */}
        <div className="space-y-4">
          {suggestedOptions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              おすすめオプションが登録されていません
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => setIsReordering(true)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={suggestedOptions.map(option => option._id?.toString() || '')}
                strategy={verticalListSortingStrategy}
              >
                {suggestedOptions.map((option, index) => (
                  <SortableItem
                    key={option._id?.toString()}
                    option={option}
                    index={index}
                    onToggleActive={handleToggleActive}
                    onEdit={openModal}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingOption ? 'おすすめオプション編集' : 'おすすめオプション新規作成'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* タイトル */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="🚀 プレミアムサポートプラン"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* 説明 */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="優先サポートと拡張保証でビジネスを加速"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>

                {/* 価格 */}
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    価格 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="月額 ¥20,000"
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                  )}
                </div>

                {/* 特徴リスト */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    特徴
                  </label>
                  <div className="space-y-2">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="24時間以内の優先対応"
                        />
                        {formData.features.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="text-red-600 hover:text-red-800 p-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFeature}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      特徴を追加
                    </button>
                  </div>
                  {errors.features && (
                    <p className="mt-1 text-sm text-red-500">{errors.features}</p>
                  )}
                </div>

                {/* CTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ctaText" className="block text-sm font-medium text-gray-700 mb-1">
                      CTAテキスト
                    </label>
                    <input
                      type="text"
                      id="ctaText"
                      name="ctaText"
                      value={formData.ctaText}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.ctaText ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="詳細を見る"
                    />
                    {errors.ctaText && (
                      <p className="mt-1 text-sm text-red-500">{errors.ctaText}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      オプショナル：入力する場合はCTAリンクも必要です
                    </p>
                  </div>

                  <div>
                    <label htmlFor="ctaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      CTAリンク
                    </label>
                    <input
                      type="url"
                      id="ctaUrl"
                      name="ctaUrl"
                      value={formData.ctaUrl}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.ctaUrl ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="https://example.com/plans/premium"
                    />
                    {errors.ctaUrl && (
                      <p className="mt-1 text-sm text-red-500">{errors.ctaUrl}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      オプショナル：入力する場合はCTAテキストも必要です
                    </p>
                  </div>
                </div>

                {/* 表示条件 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      最小見積金額
                    </label>
                    <input
                      type="number"
                      id="minAmount"
                      name="minAmount"
                      value={formData.minAmount}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.minAmount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="300000"
                    />
                    {errors.minAmount && (
                      <p className="mt-1 text-sm text-red-500">{errors.minAmount}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      この金額以上の見積でのみ表示されます
                    </p>
                  </div>

                  <div>
                    <label htmlFor="maxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      最大見積金額
                    </label>
                    <input
                      type="number"
                      id="maxAmount"
                      name="maxAmount"
                      value={formData.maxAmount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1000000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      この金額以下の見積でのみ表示されます
                    </p>
                  </div>
                </div>

                {/* アクティブ状態 */}
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
                    このオプションを有効にする
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
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
                    className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                      saving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save className="w-4 h-4" />
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