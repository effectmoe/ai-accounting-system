"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QuotesPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const table_1 = require("@/components/ui/table");
const select_1 = require("@/components/ui/select");
const lucide_react_1 = require("lucide-react");
const date_utils_1 = require("@/lib/date-utils");
const cache_1 = require("@/lib/cache");
const logger_1 = require("@/lib/logger");
const statusLabels = {
    draft: '下書き',
    sent: '送信済み',
    accepted: '承認済み',
    rejected: '拒否',
    expired: '期限切れ',
    converted: '請求書変換済み',
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
    converted: 'bg-purple-100 text-purple-800',
};
function QuotesPageContent() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [quotes, setQuotes] = (0, react_1.useState)([]);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [aiOnlyFilter, setAiOnlyFilter] = (0, react_1.useState)(false);
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [convertingQuotes, setConvertingQuotes] = (0, react_1.useState)(new Set());
    const itemsPerPage = 20;
    const [error, setError] = (0, react_1.useState)(null);
    // URLパラメータから初期値を設定
    (0, react_1.useEffect)(() => {
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
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setCurrentPage(1); // 検索時はページを1に戻す
        }, 500); // 500ms後に検索実行
        return () => clearTimeout(timer);
    }, [searchQuery]);
    // フィルター変更時もページを1に戻す
    (0, react_1.useEffect)(() => {
        setCurrentPage(1);
    }, [statusFilter, aiOnlyFilter]);
    (0, react_1.useEffect)(() => {
        fetchQuotes();
    }, [statusFilter, aiOnlyFilter, currentPage, debouncedSearchQuery]);
    // URLパラメータを更新
    (0, react_1.useEffect)(() => {
        const params = new URLSearchParams();
        if (debouncedSearchQuery)
            params.set('search', debouncedSearchQuery);
        if (statusFilter !== 'all')
            params.set('status', statusFilter);
        if (aiOnlyFilter)
            params.set('aiOnly', 'true');
        if (currentPage > 1)
            params.set('page', currentPage.toString());
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
            const cacheKey = cache_1.SimpleCache.createKey('quotes', params);
            // キャッシュをチェック
            const cachedData = cache_1.cache.get(cacheKey);
            if (cachedData) {
                logger_1.logger.debug('[Quotes] Using cached data');
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
                cache_1.cache.set(cacheKey, data, 5 * 60 * 1000); // 5分間キャッシュ
            }
            else {
                throw new Error(data.error || 'データの取得に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching quotes:', error);
            setError(error instanceof Error ? error.message : 'データの取得に失敗しました。再度お試しください。');
            if (typeof window !== 'undefined' && window.Sentry) {
                window.Sentry.captureException(error);
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    const getStatusBadge = (status) => {
        return (<badge_1.Badge className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0`}>
        {statusLabels[status] || status}
      </badge_1.Badge>);
    };
    const handleConvertToInvoice = async (quoteId, e) => {
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
                cache_1.cache.invalidate('quotes');
                fetchQuotes(); // リストを再読み込み
                // 作成された請求書ページに遷移するかオプションで確認
                if (confirm('作成された請求書を確認しますか？')) {
                    router.push(`/invoices/${data._id}`);
                }
            }
            else {
                throw new Error(data.details || data.error || '変換に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error converting quote to invoice:', error);
            alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
            // Sentryでエラーをキャプチャ
            if (typeof window !== 'undefined' && window.Sentry) {
                window.Sentry.captureException(error, {
                    tags: {
                        operation: 'quote_to_invoice_conversion',
                        quoteId: quoteId,
                    },
                    extra: {
                        errorMessage: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        }
        finally {
            setConvertingQuotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(quoteId);
                return newSet;
            });
        }
    };
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    return (<div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">見積書一覧</h1>
      </div>

      {/* 見積書作成オプション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <card_1.Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push('/quotes/new?mode=ai')}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-blue-700">
              <lucide_react_1.Sparkles className="h-5 w-5"/>
              AIアシスタントで作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600 mb-3">
              会話形式で簡単に見積書を作成できます。
              顧客名、金額、内容を伝えるだけ。
            </p>
            <div className="flex items-center text-blue-600">
              <span className="text-sm font-medium">始める</span>
              <lucide_react_1.Plus className="ml-1 h-4 w-4"/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push('/quotes/new?mode=manual')}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-gray-700">
              <lucide_react_1.FileText className="h-5 w-5"/>
              手動で作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600 mb-3">
              フォームに直接入力して見積書を作成します。
              詳細な設定が可能です。
            </p>
            <div className="flex items-center text-gray-600">
              <span className="text-sm font-medium">フォームを開く</span>
              <lucide_react_1.Plus className="ml-1 h-4 w-4"/>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* フィルター */}
      <card_1.Card className="mb-6">
        <card_1.CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input_1.Input placeholder="見積書番号、顧客名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="見積書検索" aria-describedby="quote-search-help"/>
            </div>
            <select_1.Select value={statusFilter} onValueChange={setStatusFilter}>
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="ステータス"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">すべて</select_1.SelectItem>
                <select_1.SelectItem value="draft">下書き</select_1.SelectItem>
                <select_1.SelectItem value="sent">送信済み</select_1.SelectItem>
                <select_1.SelectItem value="accepted">承認済み</select_1.SelectItem>
                <select_1.SelectItem value="rejected">拒否</select_1.SelectItem>
                <select_1.SelectItem value="expired">期限切れ</select_1.SelectItem>
                <select_1.SelectItem value="converted">請求書変換済み</select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
            <button_1.Button variant={aiOnlyFilter ? 'default' : 'outline'} onClick={() => setAiOnlyFilter(!aiOnlyFilter)}>
              <lucide_react_1.Sparkles className="mr-2 h-4 w-4"/>
              AI作成のみ
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
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
        </div>)}

      <span className="sr-only" id="quote-search-help">見積書を検索するための入力フィールドです。見積書番号や顧客名で検索できます。</span>

      {/* 見積書リスト */}
      <card_1.Card>
        <card_1.CardContent className="p-0">
          {isLoading ? (<div className="flex justify-center items-center h-64">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
            </div>) : quotes.length === 0 ? (<div className="text-center py-12">
              <lucide_react_1.FileText className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
              <p className="text-gray-500">見積書がありません</p>
              <button_1.Button className="mt-4" onClick={() => router.push('/quotes/new')}>
                最初の見積書を作成
              </button_1.Button>
            </div>) : (<>
              <table_1.Table>
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead>見積書番号</table_1.TableHead>
                    <table_1.TableHead>顧客名</table_1.TableHead>
                    <table_1.TableHead>発行日</table_1.TableHead>
                    <table_1.TableHead>有効期限</table_1.TableHead>
                    <table_1.TableHead className="text-right">金額</table_1.TableHead>
                    <table_1.TableHead>ステータス</table_1.TableHead>
                    <table_1.TableHead>作成方法</table_1.TableHead>
                    <table_1.TableHead>アクション</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {quotes
                .filter(quote => quote && quote._id)
                .map((quote) => (<table_1.TableRow key={quote._id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/quotes/${quote._id}`)}>
                      <table_1.TableCell className="font-medium">
                        {quote.quoteNumber}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {quote.customer?.companyName ||
                    quote.customer?.name ||
                    quote.customer?.company ||
                    quote.customerSnapshot?.companyName ||
                    '顧客名未設定'}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {(0, date_utils_1.safeFormatDate)(quote.issueDate)}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {(0, date_utils_1.safeFormatDate)(quote.validityDate)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        ¥{(quote.totalAmount || 0).toLocaleString()}
                      </table_1.TableCell>
                      <table_1.TableCell>{getStatusBadge(quote.status)}</table_1.TableCell>
                      <table_1.TableCell>
                        {quote.isGeneratedByAI ? (<badge_1.Badge variant="secondary" className="bg-purple-100 text-purple-800 border-0">
                            <lucide_react_1.Sparkles className="mr-1 h-3 w-3"/>
                            AI
                          </badge_1.Badge>) : (<badge_1.Badge variant="secondary" className="border-0">
                            手動
                          </badge_1.Badge>)}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div className="flex gap-1">
                          <button_1.Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/api/quotes/${quote._id}/pdf`, '_blank');
                }} title="PDFダウンロード">
                            <lucide_react_1.FileDown className="h-4 w-4"/>
                          </button_1.Button>
                          {quote.status === 'accepted' && !quote.convertedToInvoiceId && (<button_1.Button variant="ghost" size="sm" onClick={(e) => handleConvertToInvoice(quote._id, e)} disabled={convertingQuotes.has(quote._id)} title="請求書に変換">
                              {convertingQuotes.has(quote._id) ? (<lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>) : (<lucide_react_1.Calculator className="h-4 w-4"/>)}
                            </button_1.Button>)}
                          {quote.convertedToInvoiceId && (<button_1.Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/invoices/${quote.convertedToInvoiceId}`);
                    }} title="変換された請求書を表示">
                              <lucide_react_1.CheckCircle className="h-4 w-4"/>
                            </button_1.Button>)}
                        </div>
                      </table_1.TableCell>
                    </table_1.TableRow>))}
                </table_1.TableBody>
              </table_1.Table>

              {/* ページネーション */}
              {totalPages > 1 && (<div className="flex justify-center items-center gap-2 p-4 border-t">
                  <button_1.Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                    前へ
                  </button_1.Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button_1.Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
                    次へ
                  </button_1.Button>
                </div>)}
            </>)}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
function QuotesPage() {
    return (<react_1.Suspense fallback={<div className="container mx-auto p-6"><div className="flex justify-center items-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"/></div></div>}>
      <QuotesPageContent />
    </react_1.Suspense>);
}
