'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Loader2, Sparkles, FileDown, CheckCircle, Calculator } from 'lucide-react';
import { safeFormatDate } from '@/lib/date-utils';
import { cache, SimpleCache } from '@/lib/cache';

interface Quote {
  _id: string;
  quoteNumber: string;
  issueDate: string;
  validityDate: string;
  customer?: {
    companyName?: string;
    name?: string;
    company?: string;
  };
  customerSnapshot?: {
    companyName?: string;
  };
  totalAmount: number;
  status: string;
  isGeneratedByAI?: boolean;
  convertedToInvoiceId?: string;
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  sent: '送信済み',
  accepted: '承認済み',
  rejected: '拒否',
  expired: '期限切れ',
  converted: '請求書変換済み',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  converted: 'bg-purple-100 text-purple-800',
};

function QuotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [convertingQuotes, setConvertingQuotes] = useState<Set<string>>(new Set());
  const itemsPerPage = 20;
  const [error, setError] = useState<string | null>(null);

  // URLパラメータから初期値を設定
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const aiOnly = searchParams.get('aiOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);

    setSearchQuery(search);
    setDebouncedSearchQuery(search);
    setStatusFilter(status);
    setAiOnlyFilter(aiOnly);
    setCurrentPage(page);
  }, [searchParams]);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // 検索時はページを1に戻す
    }, 500); // 500ms後に検索実行

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // フィルター変更時もページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, aiOnlyFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter, aiOnlyFilter, currentPage, debouncedSearchQuery]);

  // URLパラメータを更新
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set('search', debouncedSearchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (aiOnlyFilter) params.set('aiOnly', 'true');
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    // URLが変わる場合のみ更新
    if (window.location.search !== (queryString ? `?${queryString}` : '')) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearchQuery, statusFilter, aiOnlyFilter, currentPage, router]);

  const fetchQuotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(aiOnlyFilter && { isGeneratedByAI: 'true' }),
      };

      // キャッシュキーを生成
      const cacheKey = SimpleCache.createKey('quotes', params);
      
      // キャッシュをチェック
      const cachedData = cache.get<any>(cacheKey);
      if (cachedData) {
        console.log('[Quotes] Using cached data');
        setQuotes(cachedData.quotes || []);
        setTotalCount(cachedData.total || 0);
        setIsLoading(false);
        return;
      }

      const queryParams = new URLSearchParams(params);
      const response = await fetch(`/api/quotes?${queryParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuotes(data.quotes || []);
        setTotalCount(data.total || 0);
        // キャッシュに保存
        cache.set(cacheKey, data, 5 * 60 * 1000); // 5分間キャッシュ
      } else {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setError(error instanceof Error ? error.message : 'データの取得に失敗しました。再度お試しください。');
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0`}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const handleConvertToInvoice = async (quoteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('この見積書を請求書に変換しますか？')) {
      return;
    }

    setConvertingQuotes(prev => new Set(prev).add(quoteId));
    
    try {
      const response = await fetch(`/api/quotes/${quoteId}/convert-to-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        alert('請求書への変換が完了しました！');
        // キャッシュを無効化
        cache.invalidate('quotes');
        fetchQuotes(); // リストを再読み込み
        // 作成された請求書ページに遷移するかオプションで確認
        if (confirm('作成された請求書を確認しますか？')) {
          router.push(`/invoices/${data._id}`);
        }
      } else {
        throw new Error(data.details || data.error || '変換に失敗しました');
      }
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      // Sentryでエラーをキャプチャ
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            operation: 'quote_to_invoice_conversion',
            quoteId: quoteId,
          },
          extra: {
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });
      }
    } finally {
      setConvertingQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(quoteId);
        return newSet;
      });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">見積書一覧</h1>
      </div>

      {/* 見積書作成オプション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push('/quotes/new?mode=ai')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              AIアシスタントで作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              会話形式で簡単に見積書を作成できます。
              顧客名、金額、内容を伝えるだけ。
            </p>
            <div className="flex items-center text-blue-600">
              <span className="text-sm font-medium">始める</span>
              <Plus className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push('/quotes/new?mode=manual')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <FileText className="h-5 w-5" />
              手動で作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              フォームに直接入力して見積書を作成します。
              詳細な設定が可能です。
            </p>
            <div className="flex items-center text-gray-600">
              <span className="text-sm font-medium">フォームを開く</span>
              <Plus className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="見積書番号、顧客名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="見積書検索"
                aria-describedby="quote-search-help"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="accepted">承認済み</SelectItem>
                <SelectItem value="rejected">拒否</SelectItem>
                <SelectItem value="expired">期限切れ</SelectItem>
                <SelectItem value="converted">請求書変換済み</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={aiOnlyFilter ? 'default' : 'outline'}
              onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI作成のみ
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          <div className="flex">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold">エラー</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <span className="sr-only" id="quote-search-help">見積書を検索するための入力フィールドです。見積書番号や顧客名で検索できます。</span>

      {/* 見積書リスト */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">見積書がありません</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/quotes/new')}
              >
                最初の見積書を作成
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>見積書番号</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成方法</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes
                    .filter(quote => quote && quote._id)
                    .map((quote) => (
                    <TableRow
                      key={quote._id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/quotes/${quote._id}`)}
                    >
                      <TableCell className="font-medium">
                        {quote.quoteNumber}
                      </TableCell>
                      <TableCell>
                        {quote.customer?.companyName || 
                         quote.customer?.name || 
                         quote.customer?.company || 
                         quote.customerSnapshot?.companyName || 
                         '顧客名未設定'}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(quote.issueDate)}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(quote.validityDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{(quote.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell>
                        {quote.isGeneratedByAI ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-0">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border-0">
                            手動
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/api/quotes/${quote._id}/pdf`, '_blank');
                            }}
                            title="PDFダウンロード"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          {quote.status === 'accepted' && !quote.convertedToInvoiceId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleConvertToInvoice(quote._id, e)}
                              disabled={convertingQuotes.has(quote._id)}
                              title="請求書に変換"
                            >
                              {convertingQuotes.has(quote._id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Calculator className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {quote.convertedToInvoiceId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/invoices/${quote.convertedToInvoiceId}`);
                              }}
                              title="変換された請求書を表示"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6"><div className="flex justify-center items-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" /></div></div>}>
      <QuotesPageContent />
    </Suspense>
  );
}