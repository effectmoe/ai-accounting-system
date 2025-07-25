"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
// GET: アカウント一覧取得
async function GET(request) {
    try {
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('accounts');
        // アカウントデータを取得（codeでソート）
        const accounts = await collection
            .find({})
            .sort({ code: 1 })
            .toArray();
        // MongoDBの_idをidに変換し、必要なフィールドをマッピング
        const formattedAccounts = accounts.map(account => ({
            id: account._id.toString(),
            code: account.code || '',
            name: account.name || '',
            name_kana: account.name_kana || null,
            account_type: account.account_type || 'asset',
            display_name: account.display_name || null,
            tax_category: account.tax_category || null,
            balance: account.balance || 0,
            is_active: account.is_active !== false, // デフォルトはtrue
        }));
        return server_1.NextResponse.json({
            success: true,
            accounts: formattedAccounts,
        });
    }
    catch (error) {
        console.error('Error fetching accounts:', error);
        return server_1.NextResponse.json({ success: false, error: '勘定科目データの取得に失敗しました' }, { status: 500 });
    }
}
