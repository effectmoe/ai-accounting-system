"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBadge = StatusBadge;
exports.InvoiceStatusBadge = InvoiceStatusBadge;
exports.OrderStatusBadge = OrderStatusBadge;
exports.PaymentStatusBadge = PaymentStatusBadge;
const react_1 = __importDefault(require("react"));
const utils_1 = require("@/lib/utils");
const constants_1 = require("./constants");
const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
};
const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
};
function StatusBadge({ status, label, variant, size = 'md', className, }) {
    // 既知のステータスの設定を取得
    const config = status in constants_1.statusConfig ? constants_1.statusConfig[status] : null;
    // 表示するラベルを決定
    const displayLabel = label || config?.label || status;
    // バリアントを決定
    const displayVariant = variant || config?.variant || 'default';
    // クラス名を決定
    const badgeClassName = config?.className || variantClasses[displayVariant];
    return (<span className={(0, utils_1.cn)('inline-flex items-center font-medium rounded-full', sizeClasses[size], badgeClassName, className)}>
      {displayLabel}
    </span>);
}
// 便利なヘルパーコンポーネント
function InvoiceStatusBadge({ status }) {
    return <StatusBadge status={status} size="sm"/>;
}
function OrderStatusBadge({ status }) {
    return <StatusBadge status={status} size="sm"/>;
}
function PaymentStatusBadge({ status }) {
    const paymentStatusMap = {
        'paid': 'paid',
        'pending': 'pending',
        'failed': 'error',
        'refunded': 'cancelled',
    };
    return <StatusBadge status={paymentStatusMap[status] || status} size="sm"/>;
}
