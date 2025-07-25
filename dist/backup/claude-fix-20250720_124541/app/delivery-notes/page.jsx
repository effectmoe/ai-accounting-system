"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DeliveryNotesPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const input_1 = require("@/components/ui/input");
const select_1 = require("@/components/ui/select");
const table_1 = require("@/components/ui/table");
const alert_1 = require("@/components/ui/alert");
const logger_1 = require("@/lib/logger");
const lucide_react_1 = require("lucide-react");
const date_utils_1 = require("@/lib/date-utils");
const statusLabels = {
    draft: '下書き',
    saved: '保存済み',
    delivered: '納品済み',
    received: '受領済み',
    cancelled: 'キャンセル',
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    saved: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    received: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
};
const statusIcons = {
    draft: lucide_react_1.FileText,
    saved: lucide_react_1.Clock,
    delivered: lucide_react_1.Package,
    received: lucide_react_1.CheckCircle,
    cancelled: lucide_react_1.XCircle,
};
function DeliveryNotesPage() {
    const router = (0, navigation_1.useRouter)();
    const [deliveryNotes, setDeliveryNotes] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [totalPages, setTotalPages] = (0, react_1.useState)(1);
    const [totalCount, setTotalCount] = (0, react_1.useState)(0);
    const itemsPerPage = 10;
    (0, react_1.useEffect)(() => {
        fetchDeliveryNotes();
    }, [currentPage, statusFilter]);
    const fetchDeliveryNotes = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
            });
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            const response = await fetch(`/api/delivery-notes?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch delivery notes');
            }
            const data = await response.json();
            setDeliveryNotes(data.deliveryNotes);
            setTotalPages(data.pagination.totalPages);
            setTotalCount(data.pagination.total);
        }
        catch (error) {
            logger_1.logger.error('Error fetching delivery notes:', error);
            setError('納品書の取得に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSearch = () => {
        setCurrentPage(1);
        fetchDeliveryNotes();
    };
    const filteredDeliveryNotes = deliveryNotes.filter(deliveryNote => {
        if (!searchTerm)
            return true;
        const term = searchTerm.toLowerCase();
        return (deliveryNote.deliveryNoteNumber?.toLowerCase().includes(term) ||
            deliveryNote.customer?.companyName?.toLowerCase().includes(term) ||
            deliveryNote.customerSnapshot?.companyName?.toLowerCase().includes(term));
    });
    const getStatusIcon = (status) => {
        const IconComponent = statusIcons[status];
        return <IconComponent className="h-4 w-4"/>;
    };
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };
    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            pages.push(<button_1.Button key={i} variant={i === currentPage ? "default" : "outline"} size="sm" onClick={() => handlePageChange(i)}>
          {i}
        </button_1.Button>);
        }
        return (<div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {totalCount}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-{Math.min(currentPage * itemsPerPage, totalCount)}件を表示
        </div>
        <div className="flex items-center space-x-2">
          <button_1.Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            前へ
          </button_1.Button>
          {pages}
          <button_1.Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            次へ
          </button_1.Button>
        </div>
      </div>);
    };
    if (error) {
        return (<div className="container mx-auto p-6">
        <alert_1.Alert variant="destructive">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
        </alert_1.Alert>
      </div>);
    }
    return (<div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">納品書管理</h1>
          <p className="text-gray-600 mt-2">納品書の作成・管理・送信を行います</p>
        </div>
        <button_1.Button onClick={() => router.push('/delivery-notes/create')}>
          <lucide_react_1.Plus className="mr-2 h-4 w-4"/>
          新規作成
        </button_1.Button>
      </div>

      {/* フィルター・検索エリア */}
      <card_1.Card className="mb-6">
        <card_1.CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <lucide_react_1.Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                <input_1.Input placeholder="納品書番号、顧客名で検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" onKeyPress={(e) => e.key === 'Enter' && handleSearch()}/>
              </div>
            </div>
            <div className="w-full md:w-48">
              <select_1.Select value={statusFilter} onValueChange={setStatusFilter}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="ステータス"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="all">すべて</select_1.SelectItem>
                  <select_1.SelectItem value="draft">下書き</select_1.SelectItem>
                  <select_1.SelectItem value="saved">保存済み</select_1.SelectItem>
                  <select_1.SelectItem value="delivered">納品済み</select_1.SelectItem>
                  <select_1.SelectItem value="received">受領済み</select_1.SelectItem>
                  <select_1.SelectItem value="cancelled">キャンセル</select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>
            <button_1.Button onClick={handleSearch}>
              <lucide_react_1.Search className="mr-2 h-4 w-4"/>
              検索
            </button_1.Button>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 納品書一覧 */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center">
            <lucide_react_1.FileText className="mr-2 h-5 w-5"/>
            納品書一覧
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {isLoading ? (<div className="flex justify-center items-center h-32">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
            </div>) : filteredDeliveryNotes.length === 0 ? (<div className="text-center py-8">
              <lucide_react_1.FileText className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
              <p className="text-gray-500">納品書がありません</p>
            </div>) : (<>
              <div className="overflow-x-auto">
                <table_1.Table>
                  <table_1.TableHeader>
                    <table_1.TableRow>
                      <table_1.TableHead>納品書番号</table_1.TableHead>
                      <table_1.TableHead>顧客名</table_1.TableHead>
                      <table_1.TableHead>発行日</table_1.TableHead>
                      <table_1.TableHead>納品日</table_1.TableHead>
                      <table_1.TableHead>金額</table_1.TableHead>
                      <table_1.TableHead>ステータス</table_1.TableHead>
                      <table_1.TableHead>操作</table_1.TableHead>
                    </table_1.TableRow>
                  </table_1.TableHeader>
                  <table_1.TableBody>
                    {filteredDeliveryNotes.map((deliveryNote) => (<table_1.TableRow key={deliveryNote._id?.toString()} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/delivery-notes/${deliveryNote._id}`)}>
                        <table_1.TableCell className="font-medium">
                          {deliveryNote.deliveryNoteNumber}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center">
                            <lucide_react_1.Building2 className="mr-2 h-4 w-4 text-gray-400"/>
                            {deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName || '顧客情報なし'}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center">
                            <lucide_react_1.Calendar className="mr-2 h-4 w-4 text-gray-400"/>
                            {(0, date_utils_1.safeFormatDate)(deliveryNote.issueDate, 'yyyy/MM/dd')}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center">
                            <lucide_react_1.Package className="mr-2 h-4 w-4 text-gray-400"/>
                            {(0, date_utils_1.safeFormatDate)(deliveryNote.deliveryDate, 'yyyy/MM/dd')}
                          </div>
                        </table_1.TableCell>
                        <table_1.TableCell className="font-mono">
                          ¥{(deliveryNote.totalAmount || 0).toLocaleString()}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <badge_1.Badge className={`${statusColors[deliveryNote.status]} border-0`}>
                            <span className="flex items-center">
                              {getStatusIcon(deliveryNote.status)}
                              <span className="ml-1">{statusLabels[deliveryNote.status]}</span>
                            </span>
                          </badge_1.Badge>
                        </table_1.TableCell>
                        <table_1.TableCell>
                          <div className="flex items-center space-x-2">
                            <button_1.Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/delivery-notes/${deliveryNote._id}`);
                }}>
                              <lucide_react_1.Eye className="h-4 w-4"/>
                            </button_1.Button>
                            {deliveryNote.status !== 'received' && deliveryNote.status !== 'cancelled' && (<button_1.Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/delivery-notes/${deliveryNote._id}/edit`);
                    }}>
                                <lucide_react_1.Edit className="h-4 w-4"/>
                              </button_1.Button>)}
                          </div>
                        </table_1.TableCell>
                      </table_1.TableRow>))}
                  </table_1.TableBody>
                </table_1.Table>
              </div>
              {renderPagination()}
            </>)}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
