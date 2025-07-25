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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalTable = JournalTable;
const react_1 = __importStar(require("react"));
const DataTable_1 = require("@/components/common/DataTable/DataTable");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const lucide_react_1 = require("lucide-react");
const journal_utils_1 = require("@/lib/journal-utils");
/**
 * 仕訳テーブルコンポーネント
 * DataTableを使用して仕訳の一覧を表示する
 */
function JournalTable({ journals, loading = false, error = null, onEdit, onDelete, onView, className }) {
    /**
     * DataTable用にID付きのデータに変換
     */
    const tableData = (0, react_1.useMemo)(() => {
        return journals.map(journal => ({
            ...journal,
            id: journal._id?.toString() || journal.journalNumber
        }));
    }, [journals]);
    const columns = (0, react_1.useMemo)(() => [
        {
            id: 'journalNumber',
            header: '仕訳番号',
            cell: (item) => (<span className="font-medium text-gray-900">{item.journalNumber}</span>),
            sortable: true,
        },
        {
            id: 'entryDate',
            header: '日付',
            cell: (item) => (<span className="text-sm text-gray-600">
          {(0, date_fns_1.format)(new Date(item.entryDate), 'yyyy/MM/dd', { locale: locale_1.ja })}
        </span>),
            sortable: true,
        },
        {
            id: 'description',
            header: '摘要',
            cell: (item) => (<div>
          <p className="text-sm text-gray-900 line-clamp-2">{item.description}</p>
          {item.notes && (<p className="text-xs text-gray-500 mt-0.5 line-clamp-1">備考: {item.notes}</p>)}
        </div>),
        },
        {
            id: 'debitTotal',
            header: '借方合計',
            cell: (item) => {
                const total = (0, journal_utils_1.calculateDebitTotal)(item.lines);
                return (<span className="text-sm font-medium text-blue-600">
            {(0, journal_utils_1.formatCurrency)(total)}
          </span>);
            },
            align: 'right',
            sortable: true,
        },
        {
            id: 'creditTotal',
            header: '貸方合計',
            cell: (item) => {
                const total = (0, journal_utils_1.calculateCreditTotal)(item.lines);
                return (<span className="text-sm font-medium text-red-600">
            {(0, journal_utils_1.formatCurrency)(total)}
          </span>);
            },
            align: 'right',
            sortable: true,
        },
        {
            id: 'balance',
            header: '貸借差額',
            cell: (item) => {
                const debitTotal = (0, journal_utils_1.calculateDebitTotal)(item.lines);
                const creditTotal = (0, journal_utils_1.calculateCreditTotal)(item.lines);
                const difference = debitTotal - creditTotal;
                const isBalanced = difference === 0;
                return (<div className="text-sm text-right">
            <span className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {isBalanced ? '一致' : (0, journal_utils_1.formatCurrency)(Math.abs(difference))}
            </span>
          </div>);
            },
            align: 'right',
        },
        {
            id: 'status',
            header: 'ステータス',
            cell: (item) => (<span className={`inline-flex text-xs px-2 py-1 rounded-full font-medium ${(0, journal_utils_1.getStatusClassName)(item.status)}`}>
          {(0, journal_utils_1.getStatusLabel)(item.status)}
        </span>),
            sortable: true,
        },
        {
            id: 'sourceType',
            header: '入力方法',
            cell: (item) => {
                if (!item.sourceType)
                    return <span className="text-gray-400">-</span>;
                return (<span className="text-xs text-gray-500">
            {(0, journal_utils_1.getSourceTypeLabel)(item.sourceType)}
          </span>);
            },
        },
    ], []);
    /**
     * アクションボタンの設定
     * onView, onEdit, onDelete が渡されている場合のみ表示
     */
    const actions = (0, react_1.useMemo)(() => {
        const actionItems = [];
        if (onView) {
            actionItems.push({
                label: '詳細',
                icon: <lucide_react_1.FileTextIcon className="h-4 w-4"/>,
                onClick: (item) => onView(item),
            });
        }
        if (onEdit) {
            actionItems.push({
                label: '編集',
                icon: <lucide_react_1.EditIcon className="h-4 w-4"/>,
                onClick: (item) => onEdit(item),
            });
        }
        if (onDelete) {
            actionItems.push({
                label: '削除',
                icon: <lucide_react_1.TrashIcon className="h-4 w-4"/>,
                onClick: (item) => onDelete(item),
                variant: 'destructive',
            });
        }
        return actionItems.length > 0 ? actionItems : undefined;
    }, [onView, onEdit, onDelete]);
    return (<DataTable_1.DataTable data={tableData} columns={columns} loading={loading} error={error} actions={actions} className={className} striped hoverable emptyMessage="仕訳データがありません"/>);
}
