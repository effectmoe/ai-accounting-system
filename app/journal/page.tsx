'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageLayout, PageSection } from '@/components/common/PageLayout/PageLayout';
import { ViewToggle } from '@/components/journals/ViewToggle';
import { ViewMode } from '@/types/journal';
import { JournalTimeline } from '@/components/journals/JournalTimeline';
import { JournalTable } from '@/components/journals/JournalTable';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { PlusIcon, RefreshCwIcon } from 'lucide-react';
import { JournalEntry } from '@/types/collections';
import { JOURNAL_ERROR_MESSAGES } from '@/lib/journal-utils';

/**
 * 仕訳帳ページコンポーネント
 * 仕訳の一覧表示とタイムライン表示を切り替え可能
 */
export default function JournalPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

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
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      } else {
        throw new Error(data.error || '予期しないエラーが発生しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setJournals([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  /**
   * データを再読み込み
   */
  const handleRefresh = useCallback(() => {
    fetchJournals();
  }, [fetchJournals]);

  /**
   * 新規仕訳作成画面へ遷移
   */
  const handleCreate = useCallback(() => {
    router.push('/journal/new');
  }, [router]);

  /**
   * 仕訳編集画面へ遷移
   */
  const handleEdit = useCallback((journal: JournalEntry) => {
    router.push(`/journal/${journal._id}/edit`);
  }, [router]);

  /**
   * 仕訳詳細画面へ遷移
   */
  const handleView = useCallback((journal: JournalEntry) => {
    router.push(`/journal/${journal._id}`);
  }, [router]);

  /**
   * 仕訳を削除
   */
  const handleDelete = useCallback(async (journal: JournalEntry) => {
    if (!confirm('この仕訳を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/journals/${journal._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(JOURNAL_ERROR_MESSAGES.DELETE_FAILED);
      }

      await fetchJournals();
    } catch (err) {
      alert(JOURNAL_ERROR_MESSAGES.DELETE_FAILED);
    }
  }, [fetchJournals]);

  // Loading state
  if (loading && journals.length === 0) {
    return (
      <PageLayout
        title="仕訳帳"
        description="会計仕訳の記録と管理"
        breadcrumbs={[
          { label: 'ホーム', href: '/' },
          { label: '仕訳帳' },
        ]}
      >
        <PageSection>
          <LoadingState message="仕訳データを読み込んでいます..." />
        </PageSection>
      </PageLayout>
    );
  }

  // Error state
  if (error && journals.length === 0) {
    return (
      <PageLayout
        title="仕訳帳"
        description="会計仕訳の記録と管理"
        breadcrumbs={[
          { label: 'ホーム', href: '/' },
          { label: '仕訳帳' },
        ]}
      >
        <PageSection>
          <EmptyState
            variant="error"
            title="エラーが発生しました"
            message={error.message}
            action={{
              label: '再読み込み',
              onClick: handleRefresh,
            }}
          />
        </PageSection>
      </PageLayout>
    );
  }

  // Empty state
  if (!loading && journals.length === 0) {
    return (
      <PageLayout
        title="仕訳帳"
        description="会計仕訳の記録と管理"
        breadcrumbs={[
          { label: 'ホーム', href: '/' },
          { label: '仕訳帳' },
        ]}
        actions={
          <Button onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            仕訳を作成
          </Button>
        }
      >
        <PageSection>
          <EmptyState
            variant="no-data"
            title="仕訳がありません"
            message="最初の仕訳を作成してください"
            action={{
              label: '仕訳を作成',
              onClick: handleCreate,
            }}
          />
        </PageSection>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="仕訳帳"
      description="会計仕訳の記録と管理"
      breadcrumbs={[
        { label: 'ホーム', href: '/' },
        { label: '仕訳帳' },
      ]}
      actions={
        <div className="flex items-center gap-3">
          <ViewToggle
            defaultView={viewMode}
            onViewChange={setViewMode}
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
      }
    >
      <PageSection>
        {/* Summary info */}
        <div className="mb-6 flex items-center justify-between text-sm text-gray-600">
          <span>合計 {totalCount} 件の仕訳</span>
          {totalPages > 1 && (
            <span>ページ {page} / {totalPages}</span>
          )}
        </div>

        {/* Content based on view mode */}
        {viewMode === 'timeline' ? (
          <JournalTimeline journals={journals} />
        ) : (
          <JournalTable
            journals={journals}
            loading={loading}
            error={error}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
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
      </PageSection>
    </PageLayout>
  );
}