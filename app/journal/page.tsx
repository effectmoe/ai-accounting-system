'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/journals/ViewToggle';
import { JournalTimeline } from '@/components/journals/JournalTimeline';
import { JournalTable } from '@/components/journals/JournalTable';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { PlusIcon, RefreshCwIcon, BookOpenCheck, Home } from 'lucide-react';
import { JournalEntry } from '@/types/collections';
import { JOURNAL_ERROR_MESSAGES } from '@/lib/journal-utils';

/**
 * 仕訳帳ページコンポーネント
 * 仕訳の一覧表示とタイムライン表示を切り替え可能
 */
export default function JournalPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  /**
   * 表示モードを変更する
   */
  const handleViewChange = useCallback((mode: 'timeline' | 'table') => {
    setViewMode(mode);
  }, []);

  /**
   * 仕訳データを取得する
   */
  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * pageSize;
      const response = await fetch(`/api/journals?limit=${pageSize}&skip=${skip}`);
      
      if (!response.ok) {
        throw new Error(JOURNAL_ERROR_MESSAGES.LOAD_FAILED);
      }

      const data = await response.json();
      
      if (data.success) {
        setJournals(data.journals || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        throw new Error(data.error || JOURNAL_ERROR_MESSAGES.LOAD_FAILED);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // 初回マウント時とページ変更時にデータを取得
  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  /**
   * 仕訳を作成する
   */
  const handleCreate = useCallback(() => {
    router.push('/journal/new');
  }, [router]);

  /**
   * データを更新する
   */
  const handleRefresh = useCallback(() => {
    fetchJournals();
  }, [fetchJournals]);

  /**
   * 仕訳を編集する
   */
  const handleEdit = useCallback((id: string) => {
    router.push(`/journal/${id}/edit`);
  }, [router]);

  /**
   * 仕訳を表示する
   */
  const handleView = useCallback((id: string) => {
    router.push(`/journal/${id}`);
  }, [router]);

  /**
   * 仕訳を削除する
   */
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('この仕訳を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/journals/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(JOURNAL_ERROR_MESSAGES.DELETE_FAILED);
      }

      // 削除成功後、データを再取得
      await fetchJournals();
    } catch (error) {
      console.error('Error deleting journal:', error);
      alert(JOURNAL_ERROR_MESSAGES.DELETE_FAILED);
    }
  }, [fetchJournals]);

  // Loading state
  if (loading && journals.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="py-8">
            <LoadingState message="仕訳データを読み込んでいます..." />
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
            <EmptyState
              variant="error"
              title="エラーが発生しました"
              message={error.message}
              action={{
                label: '再試行',
                onClick: handleRefresh,
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!loading && journals.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Home className="w-4 h-4" />
            <span>/</span>
            <span>仕訳帳</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpenCheck className="w-8 h-8 text-violet-600" />
            仕訳帳
          </h1>
          <p className="text-gray-600 mt-2">会計仕訳の記録と管理</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <EmptyState
              variant="no-data"
              title="仕訳がありません"
              message="最初の仕訳を作成してください"
              action={{
                label: '仕訳を作成',
                onClick: handleCreate,
              }}
            />
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
            <ViewToggle
              defaultView={viewMode}
              onViewChange={handleViewChange}
            />
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
          <div className="flex items-center justify-between">
            <CardTitle>仕訳一覧</CardTitle>
            <div className="text-sm text-gray-600">
              合計 {totalCount} 件
              {totalPages > 1 && (
                <span className="ml-2">（ページ {page} / {totalPages}）</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Content based on view mode */}
          {viewMode === 'timeline' ? (
            <JournalTimeline journals={journals} />
          ) : (
            <JournalTable
              journals={journals}
              loading={loading}
              error={error}
              onEdit={(journal) => handleEdit(journal._id?.toString() || '')}
              onView={(journal) => handleView(journal._id?.toString() || '')}
              onDelete={(journal) => handleDelete(journal._id?.toString() || '')}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                前へ
              </Button>
              <span className="flex items-center px-4 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}