'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon, RefreshCwIcon, BookOpenCheck, Home } from 'lucide-react';
import { JournalEntry } from '@/types/collections';

export default function JournalPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/journals?limit=50&skip=0');
      
      if (!response.ok) {
        throw new Error('仕訳データの読み込みに失敗しました');
      }

      const data = await response.json();
      
      if (data.success) {
        setJournals(data.journals || []);
      } else {
        throw new Error(data.error || '仕訳データの読み込みに失敗しました');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    router.push('/journal/new');
  };

  const handleRefresh = () => {
    fetchJournals();
  };

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh}>
                再試行
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
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

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>仕訳一覧 ({journals.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {journals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">仕訳がありません</p>
              <Button onClick={handleCreate}>
                最初の仕訳を作成
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                現在、{viewMode === 'timeline' ? 'タイムライン' : 'テーブル'}表示です。
              </p>
              <p className="text-sm text-gray-500">
                仕訳の詳細表示機能は現在開発中です。
              </p>
              {/* 仕訳の簡易リスト */}
              <div className="space-y-2">
                {journals.slice(0, 10).map((journal, index) => (
                  <div key={journal._id?.toString() || index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{journal.journalNumber}</span>
                      <span className="text-sm text-gray-600">{new Date(journal.entryDate).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{journal.description}</p>
                  </div>
                ))}
                {journals.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    他 {journals.length - 10} 件の仕訳があります
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}