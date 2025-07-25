"use strict";
// 共通定数定義ファイル
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusColors = exports.statusLabels = exports.documentTypeLabels = void 0;
exports.getDocumentTypeLabel = getDocumentTypeLabel;
exports.getStatusLabel = getStatusLabel;
exports.getStatusColor = getStatusColor;
exports.documentTypeLabels = {
    estimate: '見積書',
    quotation: '見積書',
    quote: '見積書',
    invoice: '請求書',
    delivery_note: '納品書',
    receipt: '領収書',
    purchase_order: '発注書',
    purchase_invoice: '購入請求書',
    supplier_quote: '仕入先見積書',
    journal_entry: '仕訳伝票',
    general: '一般文書'
};
exports.statusLabels = {
    draft: '下書き',
    confirmed: '確定済み',
    viewed: '閲覧済み',
    accepted: '承認済み',
    paid: '支払済み',
    cancelled: 'キャンセル',
    pending: '処理中',
    completed: '完了',
    active: 'アクティブ',
    processing: '処理中',
    error: 'エラー'
};
exports.statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    viewed: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    paid: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
};
// ヘルパー関数
function getDocumentTypeLabel(type) {
    return exports.documentTypeLabels[type] || type;
}
function getStatusLabel(status) {
    return exports.statusLabels[status] || status;
}
function getStatusColor(status) {
    return exports.statusColors[status] || 'bg-gray-100 text-gray-800';
}
