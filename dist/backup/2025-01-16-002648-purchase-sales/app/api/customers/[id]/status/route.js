"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const mongodb_client_1 = require("@/lib/mongodb-client");
async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const { isActive } = body;
        // バリデーション
        if (typeof isActive !== 'boolean') {
            return server_1.NextResponse.json({ success: false, error: 'isActiveはboolean型である必要があります' }, { status: 400 });
        }
        // MongoDB接続
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // ObjectId検証
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ success: false, error: '無効な顧客IDです' }, { status: 400 });
        }
        // 顧客の存在確認
        const existingCustomer = await collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!existingCustomer) {
            return server_1.NextResponse.json({ success: false, error: '顧客が見つかりません' }, { status: 404 });
        }
        // ステータス更新
        const updateResult = await collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, {
            $set: {
                isActive: isActive,
                updatedAt: new Date()
            }
        });
        if (updateResult.modifiedCount === 0) {
            return server_1.NextResponse.json({ success: false, error: 'ステータスの更新に失敗しました' }, { status: 500 });
        }
        // 更新後の顧客データを取得
        const updatedCustomer = await collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        return server_1.NextResponse.json({
            success: true,
            customer: {
                ...updatedCustomer,
                id: updatedCustomer?._id?.toString(),
            },
            message: `顧客のステータスを${isActive ? 'アクティブ' : '非アクティブ'}に更新しました`
        });
    }
    catch (error) {
        console.error('顧客ステータス更新エラー:', error);
        return server_1.NextResponse.json({ success: false, error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
