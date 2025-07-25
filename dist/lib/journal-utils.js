"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOURNAL_ERROR_MESSAGES = void 0;
exports.calculateDebitTotal = calculateDebitTotal;
exports.calculateCreditTotal = calculateCreditTotal;
exports.isJournalBalanced = isJournalBalanced;
exports.calculateBalanceDifference = calculateBalanceDifference;
exports.formatCurrency = formatCurrency;
exports.getSourceTypeLabel = getSourceTypeLabel;
exports.getStatusLabel = getStatusLabel;
exports.getStatusClassName = getStatusClassName;
/**
 * 仕訳明細の借方合計を計算する
 * @param lines 仕訳明細の配列
 * @returns 借方合計金額
 */
function calculateDebitTotal(lines) {
    return lines.reduce((sum, line) => sum + line.debitAmount, 0);
}
/**
 * 仕訳明細の貸方合計を計算する
 * @param lines 仕訳明細の配列
 * @returns 貸方合計金額
 */
function calculateCreditTotal(lines) {
    return lines.reduce((sum, line) => sum + line.creditAmount, 0);
}
/**
 * 仕訳の貸借が一致しているかチェックする
 * @param journal 仕訳エントリー
 * @returns 貸借が一致している場合はtrue
 */
function isJournalBalanced(journal) {
    const debitTotal = calculateDebitTotal(journal.lines);
    const creditTotal = calculateCreditTotal(journal.lines);
    return debitTotal === creditTotal;
}
/**
 * 仕訳の貸借差額を計算する
 * @param journal 仕訳エントリー
 * @returns 貸借差額の絶対値
 */
function calculateBalanceDifference(journal) {
    const debitTotal = calculateDebitTotal(journal.lines);
    const creditTotal = calculateCreditTotal(journal.lines);
    return Math.abs(debitTotal - creditTotal);
}
/**
 * 金額を日本円形式でフォーマットする
 * @param amount 金額
 * @returns フォーマットされた金額文字列（例: ¥1,234）
 */
function formatCurrency(amount) {
    return `¥${amount.toLocaleString()}`;
}
/**
 * 入力方法の表示名を取得する
 * @param sourceType 入力方法のタイプ
 * @returns 表示用の文字列
 */
function getSourceTypeLabel(sourceType) {
    switch (sourceType) {
        case 'manual':
            return '手動入力';
        case 'ocr':
            return 'OCR';
        case 'import':
            return 'インポート';
        default:
            return sourceType || '-';
    }
}
/**
 * ステータスの表示名を取得する
 * @param status ステータス
 * @returns 表示用の文字列
 */
function getStatusLabel(status) {
    switch (status) {
        case 'confirmed':
            return '確定';
        case 'draft':
            return '下書き';
        case 'posted':
            return '転記済';
        default:
            return status;
    }
}
/**
 * ステータスに応じたCSSクラス名を取得する
 * @param status ステータス
 * @returns Tailwind CSSクラス名
 */
function getStatusClassName(status) {
    switch (status) {
        case 'confirmed':
            return 'bg-green-100 text-green-700';
        case 'draft':
            return 'bg-yellow-100 text-yellow-700';
        case 'posted':
            return 'bg-blue-100 text-blue-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}
// エラーメッセージの定数
exports.JOURNAL_ERROR_MESSAGES = {
    LOAD_FAILED: '仕訳データの読み込みに失敗しました',
    SAVE_FAILED: '仕訳の保存に失敗しました',
    DELETE_FAILED: '仕訳の削除に失敗しました',
    INVALID_DATA: '無効な仕訳データです',
    BALANCE_ERROR: '貸借が一致していません',
};
