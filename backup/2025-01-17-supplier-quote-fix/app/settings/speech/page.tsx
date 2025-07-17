'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Mic, Save, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SpeechDictionaryEntry {
  id: string;
  incorrect: string;
  correct: string;
  category?: string;
  description?: string;
}

interface SpeechSettings {
  aiPromptEnhancement?: {
    enabled: boolean;
    customPromptInstructions?: string;
    contextAwareHomophoneCorrection: boolean;
    businessContextInstructions?: string;
  };
  dictionaryCorrection?: {
    enabled: boolean;
    customDictionary: SpeechDictionaryEntry[];
  };
}

export default function SpeechSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>({
    aiPromptEnhancement: {
      enabled: true,
      customPromptInstructions: '',
      contextAwareHomophoneCorrection: true,
      businessContextInstructions: '',
    },
    dictionaryCorrection: {
      enabled: true,
      customDictionary: [
        {
          id: '1',
          incorrect: '明日漬け',
          correct: '明日着け',
          category: '配送',
          description: '配送・納期の文脈での修正'
        }
      ],
    },
  });

  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SpeechDictionaryEntry | null>(null);
  const [dictionaryForm, setDictionaryForm] = useState({
    incorrect: '',
    correct: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    fetchSpeechSettings();
  }, []);

  const fetchSpeechSettings = async () => {
    try {
      const response = await fetch('/api/company-info');
      if (!response.ok) throw new Error('Failed to fetch speech settings');
      
      const data = await response.json();
      if (data.success && data.companyInfo?.speech_settings) {
        setSpeechSettings({
          aiPromptEnhancement: {
            enabled: data.companyInfo.speech_settings.ai_prompt_enhancement?.enabled ?? true,
            customPromptInstructions: data.companyInfo.speech_settings.ai_prompt_enhancement?.custom_prompt_instructions ?? '',
            contextAwareHomophoneCorrection: data.companyInfo.speech_settings.ai_prompt_enhancement?.context_aware_homophone_correction ?? true,
            businessContextInstructions: data.companyInfo.speech_settings.ai_prompt_enhancement?.business_context_instructions ?? '',
          },
          dictionaryCorrection: {
            enabled: data.companyInfo.speech_settings.dictionary_correction?.enabled ?? true,
            customDictionary: data.companyInfo.speech_settings.dictionary_correction?.custom_dictionary ?? [],
          },
        });
      }
    } catch (error) {
      console.error('Error fetching speech settings:', error);
      toast.error('音声認識設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speech_settings: {
            ai_prompt_enhancement: {
              enabled: speechSettings.aiPromptEnhancement?.enabled,
              custom_prompt_instructions: speechSettings.aiPromptEnhancement?.customPromptInstructions,
              context_aware_homophone_correction: speechSettings.aiPromptEnhancement?.contextAwareHomophoneCorrection,
              business_context_instructions: speechSettings.aiPromptEnhancement?.businessContextInstructions,
            },
            dictionary_correction: {
              enabled: speechSettings.dictionaryCorrection?.enabled,
              custom_dictionary: speechSettings.dictionaryCorrection?.customDictionary,
            },
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to update speech settings');

      const data = await response.json();
      if (data.success) {
        toast.success('音声認識設定を更新しました');
      } else {
        throw new Error(data.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating speech settings:', error);
      toast.error('音声認識設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDictionaryEntry = () => {
    setEditingEntry(null);
    setDictionaryForm({
      incorrect: '',
      correct: '',
      category: '',
      description: '',
    });
    setShowDictionaryModal(true);
  };

  const handleEditDictionaryEntry = (entry: SpeechDictionaryEntry) => {
    setEditingEntry(entry);
    setDictionaryForm({
      incorrect: entry.incorrect,
      correct: entry.correct,
      category: entry.category || '',
      description: entry.description || '',
    });
    setShowDictionaryModal(true);
  };

  const handleSaveDictionaryEntry = () => {
    if (!dictionaryForm.incorrect || !dictionaryForm.correct) {
      toast.error('誤字と正しい表記は必須です');
      return;
    }

    const newEntry: SpeechDictionaryEntry = {
      id: editingEntry?.id || Date.now().toString(),
      incorrect: dictionaryForm.incorrect,
      correct: dictionaryForm.correct,
      category: dictionaryForm.category,
      description: dictionaryForm.description,
    };

    setSpeechSettings(prev => ({
      ...prev,
      dictionaryCorrection: {
        ...prev.dictionaryCorrection!,
        customDictionary: editingEntry
          ? prev.dictionaryCorrection!.customDictionary.map(entry =>
              entry.id === editingEntry.id ? newEntry : entry
            )
          : [...prev.dictionaryCorrection!.customDictionary, newEntry],
      },
    }));

    setShowDictionaryModal(false);
    toast.success(editingEntry ? '辞書エントリーを更新しました' : '辞書エントリーを追加しました');
  };

  const handleDeleteDictionaryEntry = (id: string) => {
    setSpeechSettings(prev => ({
      ...prev,
      dictionaryCorrection: {
        ...prev.dictionaryCorrection!,
        customDictionary: prev.dictionaryCorrection!.customDictionary.filter(entry => entry.id !== id),
      },
    }));
    toast.success('辞書エントリーを削除しました');
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
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Mic className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">音声認識設定</h1>
        </div>

        <div className="space-y-6">
          {/* AI プロンプト強化設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">AI プロンプト強化</h2>
              <button
                onClick={() => setSpeechSettings(prev => ({
                  ...prev,
                  aiPromptEnhancement: {
                    ...prev.aiPromptEnhancement!,
                    enabled: !prev.aiPromptEnhancement!.enabled,
                  },
                }))}
                className="flex items-center gap-2"
              >
                {speechSettings.aiPromptEnhancement?.enabled ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            {speechSettings.aiPromptEnhancement?.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カスタムプロンプト指示
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="音声認識エラーの修正に関する追加指示を入力..."
                    value={speechSettings.aiPromptEnhancement?.customPromptInstructions || ''}
                    onChange={(e) => setSpeechSettings(prev => ({
                      ...prev,
                      aiPromptEnhancement: {
                        ...prev.aiPromptEnhancement!,
                        customPromptInstructions: e.target.value,
                      },
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">文脈考慮同音異義語修正</h3>
                    <p className="text-sm text-gray-600">業務文脈に基づいて同音異義語を自動修正</p>
                  </div>
                  <button
                    onClick={() => setSpeechSettings(prev => ({
                      ...prev,
                      aiPromptEnhancement: {
                        ...prev.aiPromptEnhancement!,
                        contextAwareHomophoneCorrection: !prev.aiPromptEnhancement!.contextAwareHomophoneCorrection,
                      },
                    }))}
                  >
                    {speechSettings.aiPromptEnhancement?.contextAwareHomophoneCorrection ? (
                      <ToggleRight className="w-6 h-6 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    業務文脈指示
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="業務特有の用語や文脈に関する指示..."
                    value={speechSettings.aiPromptEnhancement?.businessContextInstructions || ''}
                    onChange={(e) => setSpeechSettings(prev => ({
                      ...prev,
                      aiPromptEnhancement: {
                        ...prev.aiPromptEnhancement!,
                        businessContextInstructions: e.target.value,
                      },
                    }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 辞書修正設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">辞書ベース修正</h2>
              <button
                onClick={() => setSpeechSettings(prev => ({
                  ...prev,
                  dictionaryCorrection: {
                    ...prev.dictionaryCorrection!,
                    enabled: !prev.dictionaryCorrection!.enabled,
                  },
                }))}
                className="flex items-center gap-2"
              >
                {speechSettings.dictionaryCorrection?.enabled ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            {speechSettings.dictionaryCorrection?.enabled && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    よくある音声認識エラーを自動修正するための辞書
                  </p>
                  <button
                    onClick={handleAddDictionaryEntry}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    追加
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">誤字</th>
                        <th className="px-4 py-2 text-left">正しい表記</th>
                        <th className="px-4 py-2 text-left">カテゴリ</th>
                        <th className="px-4 py-2 text-left">説明</th>
                        <th className="px-4 py-2 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {speechSettings.dictionaryCorrection?.customDictionary.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <td className="px-4 py-2">{entry.incorrect}</td>
                          <td className="px-4 py-2">{entry.correct}</td>
                          <td className="px-4 py-2">{entry.category || '-'}</td>
                          <td className="px-4 py-2">{entry.description || '-'}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditDictionaryEntry(entry)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDictionaryEntry(entry.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
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
        </div>
      </div>

      {/* 辞書エントリー編集モーダル */}
      {showDictionaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingEntry ? '辞書エントリー編集' : '辞書エントリー追加'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  誤字 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dictionaryForm.incorrect}
                  onChange={(e) => setDictionaryForm(prev => ({ ...prev, incorrect: e.target.value }))}
                  placeholder="音声認識で誤って認識される文字"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  正しい表記 *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dictionaryForm.correct}
                  onChange={(e) => setDictionaryForm(prev => ({ ...prev, correct: e.target.value }))}
                  placeholder="正しい文字"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリ
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dictionaryForm.category}
                  onChange={(e) => setDictionaryForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="配送、金額など"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dictionaryForm.description}
                  onChange={(e) => setDictionaryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="修正の説明"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveDictionaryEntry}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}