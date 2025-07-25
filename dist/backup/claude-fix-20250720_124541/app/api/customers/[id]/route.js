"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
// GET: 顧客詳細取得
async function GET(request, { params }) {
    try {
        const { id } = params;
        // ObjectIdの形式チェック
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ success: false, error: '無効な顧客IDです' }, { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // 顧客データを取得
        const customer = await collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!customer) {
            return server_1.NextResponse.json({ success: false, error: '顧客が見つかりません' }, { status: 404 });
        }
        // MongoDBの_idをidに変換
        const formattedCustomer = {
            ...customer,
            _id: customer._id.toString(),
            id: customer._id.toString(),
        };
        return server_1.NextResponse.json({
            success: true,
            customer: formattedCustomer,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching customer:', error);
        return server_1.NextResponse.json({ success: false, error: '顧客データの取得に失敗しました' }, { status: 500 });
    }
}
// PUT: 顧客情報更新
async function PUT(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        // ObjectIdの形式チェック
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ success: false, error: '無効な顧客IDです' }, { status: 400 });
        }
        // 必須フィールドのチェック
        if (!body.companyName) {
            return server_1.NextResponse.json({ success: false, error: '会社名は必須です' }, { status: 400 });
        }
        // メールアドレスの形式チェック（メールアドレスが提供された場合のみ）
        if (body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.email)) {
                return server_1.NextResponse.json({ success: false, error: '有効なメールアドレスを入力してください' }, { status: 400 });
            }
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // メールアドレスの重複チェック（自分以外、メールアドレスが提供された場合のみ）
        if (body.email) {
            const existingCustomer = await collection.findOne({
                email: body.email,
                _id: { $ne: new mongodb_1.ObjectId(id) },
            });
            if (existingCustomer) {
                return server_1.NextResponse.json({ success: false, error: 'このメールアドレスは既に登録されています' }, { status: 400 });
            }
        }
        // 顧客IDの重複チェック（自分以外、顧客IDが提供された場合のみ）
        if (body.customerId) {
            const existingCustomer = await collection.findOne({
                customerId: body.customerId,
                _id: { $ne: new mongodb_1.ObjectId(id) },
            });
            if (existingCustomer) {
                return server_1.NextResponse.json({ success: false, error: 'この顧客コードは既に登録されています' }, { status: 400 });
            }
        }
        // 顧客データの更新
        const updateData = {
            customerId: body.customerId,
            companyName: body.companyName,
            companyNameKana: body.companyNameKana,
            department: body.department,
            postalCode: body.postalCode,
            prefecture: body.prefecture,
            city: body.city,
            address1: body.address1,
            address2: body.address2,
            phone: body.phone,
            fax: body.fax,
            email: body.email,
            website: body.website,
            paymentTerms: body.paymentTerms ? parseInt(body.paymentTerms) : undefined,
            contacts: body.contacts || [],
            tags: body.tags || [],
            notes: body.notes,
            isActive: body.isActive !== undefined ? body.isActive : true,
            updatedAt: new Date(),
        };
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: updateData });
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({ success: false, error: '顧客が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            customer: {
                _id: id,
                id,
                ...updateData,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating customer:', error);
        return server_1.NextResponse.json({ success: false, error: '顧客情報の更新に失敗しました' }, { status: 500 });
    }
}
// DELETE: 顧客削除
async function DELETE(request, { params }) {
    try {
        const { id } = params;
        // ObjectIdの形式チェック
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ success: false, error: '無効な顧客IDです' }, { status: 400 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const collection = db.collection('customers');
        // 顧客の削除
        const result = await collection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
        if (result.deletedCount === 0) {
            return server_1.NextResponse.json({ success: false, error: '顧客が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: '顧客を削除しました',
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting customer:', error);
        return server_1.NextResponse.json({ success: false, error: '顧客の削除に失敗しました' }, { status: 500 });
    }
}
