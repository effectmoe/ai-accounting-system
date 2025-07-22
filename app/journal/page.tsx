'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, RefreshCwIcon, BookOpenCheck, Home, ActivityIcon, TableIcon } from 'lucide-react';

interface JournalLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  taxRate?: number;
  taxAmount?: number;
  isTaxIncluded?: boolean;
}

interface JournalEntry {
  _id?: any;
  journalNumber: string;
  entryDate: string;
  description: string;
  status: string;
  lines: JournalLine[];
}

export default function JournalPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJournals = async () => {
    console.log('[Journal Page] Starting to fetch journals...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Journal Page] Calling /api/journals...');
      const response = await fetch('/api/journals?limit=50&skip=0');
      console.log('[Journal Page] Response status:', response.status);
      console.log('[Journal Page] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('[Journal Page] Response data:', data);
      
      if (data.success && data.journals) {
        console.log('[Journal Page] Journals loaded successfully:', data.journals.length);
        setJournals(data.journals);
      } else {
        console.error('[Journal Page] API returned error:', data.error);
        setError(data.error || '仕訳データの読み込みに失敗しました');
      }
    } catch (err) {
      console.error('[Journal Page] Network error:', err);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const handleCreate = () => {
    router.push('/journal/new');
  };

  const handleRefresh = () => {
    fetchJournals();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600">仕訳データを読み込んでいます...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh}>再試行</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Home className="w-4 h-4" />
          <span>/</span>
          <span>仕訳帳</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpenCheck className="w-8 h-8 text-violet-600" />
              仕訳帳
            </h1>
            <p className="text-gray-600 mt-2">会計仕訳の記録と管理</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ActivityIcon className="h-4 w-4" />
                タイムライン
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TableIcon className="h-4 w-4" />
                テーブル
              </button>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              更新
            </Button>
            <Button onClick={handleCreate}>
              <PlusIcon className="mr-2 h-4 w-4" />
              仕訳を作成
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>仕訳一覧 ({journals.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {journals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">仕訳がありません</p>
              <Button onClick={handleCreate}>最初の仕訳を作成</Button>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                タイムライン表示 - 時系列で仕訳を確認できます
              </p>
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                <div className="space-y-6">
                  {journals.map((journal, index) => {
                    const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
                    const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);
                    const isBalanced = debitTotal === creditTotal;
                    
                    return (
                      <div key={journal._id || index} className="relative flex items-start">
                        <div className={`absolute left-6 w-4 h-4 rounded-full border-2 ${
                          isBalanced ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500'
                        }`}></div>
                        
                        <div className="ml-16 flex-1 bg-white border rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium text-lg">{journal.journalNumber}</span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {journal.status === 'confirmed' ? '確定' : 
                                 journal.status === 'draft' ? '下書き' : journal.status}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {new Date(journal.entryDate).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-3">{journal.description}</p>
                          <div className="text-sm text-gray-600">
                            <span className="mr-4">借方: <span className="text-blue-600 font-medium">¥{debitTotal.toLocaleString()}</span></span>
                            <span>貸方: <span className="text-red-600 font-medium">¥{creditTotal.toLocaleString()}</span></span>
                            {!isBalanced && <span className="ml-4 text-red-600">⚠️ 貸借不一致</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                テーブル表示 - 一覧形式で仕訳を確認できます
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        仕訳番号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日付
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        摘要
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        借方合計
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        貸方合計
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {journals.map((journal, index) => {
                      const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
                      const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);
                      
                      return (
                        <tr key={journal._id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {journal.journalNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(journal.entryDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {journal.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                            ¥{debitTotal.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                            ¥{creditTotal.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {journal.status === 'confirmed' ? '確定' : 
                               journal.status === 'draft' ? '下書き' : journal.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}