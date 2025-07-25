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
exports.JournalTimeline = JournalTimeline;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const BalanceCheck_1 = require("./BalanceCheck");
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const journal_utils_1 = require("@/lib/journal-utils");
function JournalTimeline({ journals, className }) {
    /**
     * 仕訳を日付でグループ化する
     * 最新の日付が上に来るようにソート
     */
    const groupedJournals = (0, react_1.useMemo)(() => {
        const groups = {};
        journals.forEach((journal) => {
            const dateKey = (0, date_fns_1.format)(new Date(journal.entryDate), 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(journal);
        });
        // 日付を降順でソート（最新日付が最初）
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    }, [journals]);
    /**
     * 日付を日本語形式でフォーマット
     */
    const formatDateWithDay = (0, react_1.useCallback)((date) => {
        return (0, date_fns_1.format)(new Date(date), 'yyyy年MM月dd日(E)', { locale: locale_1.ja });
    }, []);
    return (<div className={`space-y-8 ${className || ''}`}>
      {groupedJournals.map(([date, dayJournals]) => {
            const formattedDate = formatDateWithDay(date);
            return (<div key={date} className="relative">
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <lucide_react_1.CalendarIcon className="h-4 w-4 text-gray-500"/>
                <h3 className="text-sm font-medium text-gray-900">{formattedDate}</h3>
                <span className="text-sm text-gray-500">({dayJournals.length}件)</span>
              </div>
            </div>

            {/* Timeline for the day */}
            <div className="mt-4 space-y-4 pl-8 relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"/>

              {dayJournals.map((journal, index) => {
                    // 貸借合計を計算
                    const debitTotal = (0, journal_utils_1.calculateDebitTotal)(journal.lines);
                    const creditTotal = (0, journal_utils_1.calculateCreditTotal)(journal.lines);
                    const isBalanced = debitTotal === creditTotal;
                    return (<div key={journal._id?.toString() || index} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 bg-white ${isBalanced
                            ? 'border-green-500'
                            : 'border-red-500'}`}/>

                    {/* Journal card */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <lucide_react_1.FileTextIcon className="h-4 w-4 text-gray-500"/>
                            <span className="text-sm font-medium text-gray-900">
                              {journal.journalNumber}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${(0, journal_utils_1.getStatusClassName)(journal.status)}`}>
                              {(0, journal_utils_1.getStatusLabel)(journal.status)}
                            </span>
                          </div>
                          <BalanceCheck_1.BalanceCheck debitTotal={debitTotal} creditTotal={creditTotal} className="ml-4"/>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{journal.description}</p>
                      </div>

                      {/* Journal lines */}
                      <div className="divide-y divide-gray-200">
                        {journal.lines.map((line, lineIndex) => (<div key={lineIndex} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {line.accountName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({line.accountCode})
                                </span>
                              </div>
                              {line.description && (<p className="text-xs text-gray-500 mt-0.5">{line.description}</p>)}
                            </div>
                            
                            <div className="flex gap-8 text-sm">
                              {/* Debit */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">借方</div>
                                <div className={`font-medium ${line.debitAmount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                  {line.debitAmount > 0
                                ? (0, journal_utils_1.formatCurrency)(line.debitAmount)
                                : '-'}
                                </div>
                              </div>
                              
                              {/* Credit */}
                              <div className="text-right">
                                <div className="text-xs text-gray-500 mb-0.5">貸方</div>
                                <div className={`font-medium ${line.creditAmount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                  {line.creditAmount > 0
                                ? (0, journal_utils_1.formatCurrency)(line.creditAmount)
                                : '-'}
                                </div>
                              </div>
                            </div>
                          </div>))}
                      </div>

                      {/* Footer with metadata */}
                      {(journal.notes || journal.sourceType) && (<div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {journal.sourceType && (<span>
                                入力方法: {(0, journal_utils_1.getSourceTypeLabel)(journal.sourceType)}
                              </span>)}
                            {journal.notes && (<span className="truncate">備考: {journal.notes}</span>)}
                          </div>
                        </div>)}
                    </div>
                  </div>);
                })}
            </div>
          </div>);
        })}
    </div>);
}
