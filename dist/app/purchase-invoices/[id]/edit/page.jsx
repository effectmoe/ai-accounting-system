"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PurchaseInvoiceEditPage;
const navigation_1 = require("next/navigation");
function PurchaseInvoiceEditPage({ params }) {
    // 現時点では編集機能は未実装のため、詳細画面にリダイレクト
    (0, navigation_1.redirect)(`/purchase-invoices/${params.id}`);
}
