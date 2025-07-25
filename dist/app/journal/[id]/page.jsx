"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = JournalDetailPage;
const react_1 = __importStar(require("react"));
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const lucide_react_1 = require("lucide-react");
const BalanceCheck_1 = require("@/components/journals/BalanceCheck");
const journal_utils_1 = require("@/lib/journal-utils");
const dynamic_1 = __importDefault(require("next/dynamic"));
// 動的インポートでJournalAIChatをクライアントサイドでのみ読み込む
const JournalAIChat = (0, dynamic_1.default)(() => Promise.resolve().then(() => __importStar(require('@/components/journals/JournalAIChat'))), {
    ssr: false,
    loading: () => null
});
function JournalDetailPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const id = params.id;
    const [journal, setJournal] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchJournalDetail = async () => {
            if (!id)
                return;
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/journals/${id}`);
                const data = await response.json();
                if (data.success && data.journal) {
                    setJournal(data.journal);
                }
                else {
                    setError(data.error || '仕訳データの取得に失敗しました');
                }
            }
            catch (err) {
                console.error('Error fetching journal detail:', err);
                setError('ネットワークエラーが発生しました');
            }
            finally {
                setLoading(false);
            }
        };
        fetchJournalDetail();
    }, [id]);
    const handleEdit = () => {
        // TODO: 編集ページへの遷移
        console.log('Edit journal:', id);
    };
    const handleDelete = () => {
        // TODO: 削除確認ダイアログと削除処理
        console.log('Delete journal:', id);
    };
    const handlePrint = () => {
        // TODO: 印刷処理
        window.print();
    };
    if (loading) {
        return (<div className="container mx-auto p-8">
        <card_1.Card>
          <card_1.CardContent className="py-8">
            <div className="text-center">
              <p className="text-gray-600">仕訳データを読み込んでいます...</p>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    if (error || !journal) {
        return (<div className="container mx-auto p-8">
        <card_1.Card>
          <card_1.CardContent className="py-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || '仕訳が見つかりませんでした'}</p>
              <button_1.Button onClick={() => router.push('/journal')}>仕訳一覧に戻る</button_1.Button>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>);
    }
    const debitTotal = journal.lines.reduce((sum, line) => sum + line.debitAmount, 0);
    const creditTotal = journal.lines.reduce((sum, line) => sum + line.creditAmount, 0);
    return (<div className="container mx-auto p-8 max-w-5xl">
      {/* パンくずリスト */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <lucide_react_1.Home className="w-4 h-4"/>
        <span>/</span>
        <button onClick={() => router.push('/journal')} className="hover:text-gray-900 transition-colors">
          仕訳帳
        </button>
        <span>/</span>
        <span>{journal.journalNumber}</span>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button_1.Button variant="outline" size="sm" onClick={() => router.push('/journal')}>
            <lucide_react_1.ArrowLeftIcon className="mr-2 h-4 w-4"/>
            戻る
          </button_1.Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <lucide_react_1.BookOpenCheck className="w-8 h-8 text-violet-600"/>
            仕訳詳細
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {journal.sourceDocumentId && (<button_1.Button variant="outline" size="sm" onClick={() => router.push(`/documents/${journal.sourceDocumentId}`)} className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300">
              <lucide_react_1.FileText className="mr-2 h-4 w-4"/>
              元の領収書を表示
            </button_1.Button>)}
          <button_1.Button variant="outline" size="sm" onClick={handleEdit}>
            <lucide_react_1.EditIcon className="mr-2 h-4 w-4"/>
            編集
          </button_1.Button>
          <button_1.Button variant="outline" size="sm" onClick={handleDelete}>
            <lucide_react_1.TrashIcon className="mr-2 h-4 w-4"/>
            削除
          </button_1.Button>
          <button_1.Button variant="outline" size="sm" onClick={handlePrint}>
            <lucide_react_1.PrinterIcon className="mr-2 h-4 w-4"/>
            印刷
          </button_1.Button>
        </div>
      </div>

      {/* 基本情報カード */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center justify-between">
            <span>基本情報</span>
            <span className={`text-sm px-3 py-1 rounded-full font-normal ${journal.status === 'confirmed' ? 'bg-green-100 text-green-700' :
            journal.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'}`}>
              {journal.status === 'confirmed' ? '確定' :
            journal.status === 'draft' ? '下書き' : journal.status}
            </span>
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <lucide_react_1.Hash className="w-5 h-5 text-gray-500"/>
                <div>
                  <p className="text-sm text-gray-600">仕訳番号</p>
                  <p className="font-medium">{journal.journalNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <lucide_react_1.Calendar className="w-5 h-5 text-gray-500"/>
                <div>
                  <p className="text-sm text-gray-600">取引日</p>
                  <p className="font-medium">
                    {new Date(journal.entryDate).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-3">
                <lucide_react_1.FileText className="w-5 h-5 text-gray-500 mt-0.5"/>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">摘要</p>
                  <p className="font-medium">{journal.description}</p>
                </div>
              </div>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 貸借バランス */}
      <div className="mb-6">
        <BalanceCheck_1.BalanceCheck debitTotal={debitTotal} creditTotal={creditTotal} className="shadow-sm"/>
      </div>

      {/* 明細行 */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>仕訳明細</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    勘定科目
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    借方金額
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    貸方金額
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税率
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税額
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {journal.lines.map((line, index) => (<tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {line.accountName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {line.accountCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {line.debitAmount > 0 ? (<span className="text-blue-600 font-medium">
                          {(0, journal_utils_1.formatCurrency)(line.debitAmount)}
                        </span>) : (<span className="text-gray-400">-</span>)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {line.creditAmount > 0 ? (<span className="text-red-600 font-medium">
                          {(0, journal_utils_1.formatCurrency)(line.creditAmount)}
                        </span>) : (<span className="text-gray-400">-</span>)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                      {line.taxRate !== undefined ? (<span className="text-gray-700">
                          {line.taxRate}%
                          {line.isTaxIncluded && (<span className="text-xs text-gray-500 ml-1">(内税)</span>)}
                        </span>) : (<span className="text-gray-400">-</span>)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      {line.taxAmount ? (<span className="text-gray-700">
                          {(0, journal_utils_1.formatCurrency)(line.taxAmount)}
                        </span>) : (<span className="text-gray-400">-</span>)}
                    </td>
                  </tr>))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    合計
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-blue-600 font-bold">
                      {(0, journal_utils_1.formatCurrency)(debitTotal)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-red-600 font-bold">
                      {(0, journal_utils_1.formatCurrency)(creditTotal)}
                    </span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </card_1.CardContent>
      </card_1.Card>
      
      {/* AI チャットコンポーネント */}
      {journal && (<JournalAIChat journal={journal} journalId={id}/>)}

      {/* タイムスタンプ */}
      {(journal.createdAt || journal.updatedAt) && (<div className="mt-6 text-sm text-gray-500 text-right">
          {journal.createdAt && (<p>作成日時: {new Date(journal.createdAt).toLocaleString('ja-JP')}</p>)}
          {journal.updatedAt && (<p>更新日時: {new Date(journal.updatedAt).toLocaleString('ja-JP')}</p>)}
        </div>)}
    </div>);
}
