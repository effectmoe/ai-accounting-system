'use client';

import { useState } from 'react';
import { Brain, Search, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AccountCategoryEditorProps {
  documentId: string;
  vendorName: string;
  currentCategory?: string;
  amount?: number;
  fileName?: string;
  extractedText?: string;
  documentType?: string;
  onCategoryUpdate?: (newCategory: string) => void;
}

const accountCategories = [
  { value: '旅費交通費', label: '旅費交通費' },
  { value: '会議費', label: '会議費' },
  { value: '接待交際費', label: '接待交際費' },
  { value: '消耗品費', label: '消耗品費' },
  { value: '車両費', label: '車両費' },
  { value: '新聞図書費', label: '新聞図書費' },
  { value: '通信費', label: '通信費' },
  { value: '水道光熱費', label: '水道光熱費' },
  { value: '地代家賃', label: '地代家賃' },
  { value: '雑費', label: '雑費' },
];

export default function AccountCategoryEditor({
  documentId,
  vendorName,
  currentCategory = '未分類',
  amount,
  fileName,
  extractedText,
  documentType,
  onCategoryUpdate
}: AccountCategoryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 勘定科目を学習
  const handleLearnCategory = async () => {
    try {
      // まずドキュメントのカテゴリを更新
      const updateResponse = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory
        })
      });

      if (!updateResponse.ok) {
        throw new Error('ドキュメントの更新に失敗しました');
      }

      // 次に学習システムに保存
      const response = await fetch('/api/accounts/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111', // デフォルトcompanyId
          vendorName,
          accountCategory: selectedCategory,
          amount,
          documentType: documentType || 'receipt'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('勘定科目を更新し、学習しました');
        setIsEditing(false);
        
        if (onCategoryUpdate) {
          onCategoryUpdate(selectedCategory);
        }
      } else {
        console.error('Learning failed:', data);
        toast.error(`学習に失敗しました: ${data.error || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Learning error:', error);
      toast.error('学習中にエラーが発生しました');
    }
  };

  // 勘定科目を精査
  const handleAnalyzeCategory = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null); // 前回の結果をクリア
    
    try {
      // 最低でも2秒は処理中表示を維持（実際に処理していることを示すため）
      const startTime = Date.now();
      
      const response = await fetch('/api/accounts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: '11111111-1111-1111-1111-111111111111',
          vendorName,
          amount,
          documentType: documentType || 'receipt',
          fileName,
          extractedText,
          currentCategory: selectedCategory
        })
      });

      const data = await response.json();
      
      // 最低2秒は待つ
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 2000 - elapsedTime));
      }
      
      if (data.success) {
        setAnalysisResult(data.analysis);
        
        // 主要な提案を自動選択
        if (data.analysis.primarySuggestion) {
          setSelectedCategory(data.analysis.primarySuggestion.category);
        }
        
        toast.success('精査が完了しました');
      } else {
        toast.error('精査に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('精査中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          {currentCategory}
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-gray-500 hover:text-gray-700"
          title="勘定科目を編集"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">勘定科目の設定</h4>
        <button
          onClick={() => {
            setIsEditing(false);
            setSelectedCategory(currentCategory);
            setAnalysisResult(null);
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {accountCategories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {analysisResult && (
          <div className="text-xs space-y-1 p-2 bg-blue-50 rounded">
            <div className="font-medium">精査結果:</div>
            <div>
              推奨: {analysisResult.primarySuggestion.category} 
              (信頼度: {Math.round(analysisResult.primarySuggestion.confidence * 100)}%)
            </div>
            <div className="text-gray-600">{analysisResult.primarySuggestion.reason}</div>
            
            {analysisResult.alternatives.length > 0 && (
              <div className="mt-2">
                <div className="font-medium">代替案:</div>
                {analysisResult.alternatives.map((alt: any, idx: number) => (
                  <div key={idx} className="text-gray-600">
                    • {alt.category} ({Math.round(alt.confidence * 100)}%)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAnalyzeCategory}
          disabled={isAnalyzing}
          className="flex-1 bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Search className="w-4 h-4" />
          {isAnalyzing ? '精査中...' : '精査する'}
        </button>
        
        <button
          onClick={handleLearnCategory}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center justify-center gap-1"
        >
          <Brain className="w-4 h-4" />
          学習する
        </button>
      </div>

      {analysisResult?.recommendations && analysisResult.recommendations.length > 0 && (
        <div className="text-xs p-2 bg-yellow-50 rounded">
          <div className="font-medium text-yellow-800">推奨事項:</div>
          {analysisResult.recommendations.map((rec: string, idx: number) => (
            <div key={idx} className="text-yellow-700">• {rec}</div>
          ))}
        </div>
      )}
    </div>
  );
}