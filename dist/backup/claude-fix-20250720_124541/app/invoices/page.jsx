"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvoicesPage;
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
const logger_1 = require("@/lib/logger");
const statusLabels = {
    draft: '下書き',
    sent: '送信済み',
    viewed: '開封済み',
    paid: '支払済み',
    partially_paid: '一部支払済み',
    overdue: '期限超過',
    cancelled: 'キャンセル',
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    paid: 'bg-green-100 text-green-800',
    partially_paid: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
};
function InvoicesPage() {
    const router = (0, navigation_1.useRouter)();
    const [invoices, setInvoices] = (0, react_1.useState)([]);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [aiOnlyFilter, setAiOnlyFilter] = (0, react_1.useState)(false);
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const itemsPerPage = 20;
    (0, react_1.useEffect)(() => {
        fetchInvoices();
    }, [statusFilter, aiOnlyFilter, currentPage]);
    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                limit: itemsPerPage.toString(),
                skip: ((currentPage - 1) * itemsPerPage).toString(),
            });
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (aiOnlyFilter) {
                params.append('isGeneratedByAI', 'true');
            }
            const response = await fetch(`/api/invoices?${params}`);
            const data = await response.json();
            if (response.ok) {
                setInvoices(data.invoices || []);
                setTotalCount(data.total || 0);
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching invoices:', error);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSearch = () => {
        // TODO: 検索機能の実装
        logger_1.logger.debug('Search:', searchQuery);
    };
    const getStatusBadge = (status) => {
        return (<badge_1.Badge className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0`}>
        {statusLabels[status] || status}
      </badge_1.Badge>);
    };
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    return (<div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">請求書一覧</h1>
      </div>

      {/* 請求書作成オプション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <card_1.Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push('/invoices/new?mode=ai')}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-blue-700">
              <lucide_react_1.Sparkles className="h-5 w-5"/>
              AIアシスタントで作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600 mb-3">
              会話形式で簡単に請求書を作成できます。
              顧客名、金額、内容を伝えるだけ。
            </p>
            <div className="flex items-center text-blue-600">
              <span className="text-sm font-medium">始める</span>
              <lucide_react_1.Plus className="ml-1 h-4 w-4"/>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => router.push('/invoices/new?mode=manual')}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-gray-700">
              <lucide_react_1.FileText className="h-5 w-5"/>
              手動で作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600 mb-3">
              フォームに直接入力して請求書を作成します。
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
              <input_1.Input placeholder="請求書番号、顧客名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()}/>
            </div>
            <select_1.Select value={statusFilter} onValueChange={setStatusFilter}>
              <select_1.SelectTrigger className="w-[180px]">
                <select_1.SelectValue placeholder="ステータス"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">すべて</select_1.SelectItem>
                <select_1.SelectItem value="draft">下書き</select_1.SelectItem>
                <select_1.SelectItem value="sent">送信済み</select_1.SelectItem>
                <select_1.SelectItem value="viewed">開封済み</select_1.SelectItem>
                <select_1.SelectItem value="paid">支払済み</select_1.SelectItem>
                <select_1.SelectItem value="partially_paid">一部支払済み</select_1.SelectItem>
                <select_1.SelectItem value="overdue">期限超過</select_1.SelectItem>
                <select_1.SelectItem value="cancelled">キャンセル</select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
            <button_1.Button variant={aiOnlyFilter ? 'default' : 'outline'} onClick={() => setAiOnlyFilter(!aiOnlyFilter)}>
              <lucide_react_1.Sparkles className="mr-2 h-4 w-4"/>
              AI作成のみ
            </button_1.Button>
            <button_1.Button onClick={handleSearch}>
              <lucide_react_1.Search className="mr-2 h-4 w-4"/>
              検索
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 請求書リスト */}
      <card_1.Card>
        <card_1.CardContent className="p-0">
          {isLoading ? (<div className="flex justify-center items-center h-64">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
            </div>) : invoices.length === 0 ? (<div className="text-center py-12">
              <lucide_react_1.FileText className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
              <p className="text-gray-500">請求書がありません</p>
              <button_1.Button className="mt-4" onClick={() => router.push('/invoices/new')}>
                最初の請求書を作成
              </button_1.Button>
            </div>) : (<>
              <table_1.Table>
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead>請求書番号</table_1.TableHead>
                    <table_1.TableHead>顧客名</table_1.TableHead>
                    <table_1.TableHead>発行日</table_1.TableHead>
                    <table_1.TableHead>支払期限</table_1.TableHead>
                    <table_1.TableHead className="text-right">金額</table_1.TableHead>
                    <table_1.TableHead>ステータス</table_1.TableHead>
                    <table_1.TableHead>作成方法</table_1.TableHead>
                    <table_1.TableHead>アクション</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {invoices
                .filter(invoice => invoice && invoice._id)
                .map((invoice) => (<table_1.TableRow key={invoice._id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/invoices/${invoice._id}`)}>
                      <table_1.TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {invoice.customer?.companyName ||
                    invoice.customer?.name ||
                    invoice.customer?.company ||
                    invoice.customerSnapshot?.companyName ||
                    '顧客名未設定'}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {(0, date_utils_1.safeFormatDate)(invoice.issueDate || invoice.invoiceDate)}
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {(0, date_utils_1.safeFormatDate)(invoice.dueDate)}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        ¥{(invoice.totalAmount || 0).toLocaleString()}
                      </table_1.TableCell>
                      <table_1.TableCell>{getStatusBadge(invoice.status)}</table_1.TableCell>
                      <table_1.TableCell>
                        {invoice.isGeneratedByAI ? (<badge_1.Badge variant="secondary" className="bg-purple-100 text-purple-800 border-0">
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
                    window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                }} title="PDFダウンロード">
                            <lucide_react_1.FileDown className="h-4 w-4"/>
                          </button_1.Button>
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
