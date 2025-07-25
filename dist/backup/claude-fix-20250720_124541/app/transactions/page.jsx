"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TransactionsPage;
const navigation_1 = require("next/navigation");
function TransactionsPage() {
    // 仕訳帳ページにリダイレクト
    (0, navigation_1.redirect)('/journal');
}
