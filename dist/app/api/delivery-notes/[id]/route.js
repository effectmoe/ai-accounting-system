"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const mongodb_2 = require("@/lib/mongodb");
const logger_1 = require("@/lib/logger");
// GET - 個別納品書取得
async function GET(request, { params }) {
    try {
        const db = await (0, mongodb_2.getDatabase)();
        const collection = db.collection('deliveryNotes');
        const deliveryNote = await collection
            .aggregate([
            { $match: { _id: new mongodb_1.ObjectId(params.id) } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
        ])
            .toArray();
        if (!deliveryNote || deliveryNote.length === 0) {
            return server_1.NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
        }
        // 会社情報を取得してcompanySnapshotを追加（なければ）
        const companyInfoCollection = db.collection('companyInfo');
        const companyInfo = await companyInfoCollection.findOne({ isDefault: true });
        const result = deliveryNote[0];
        // companySnapshotがない場合は追加
        if (!result.companySnapshot && companyInfo) {
            result.companySnapshot = {
                companyName: companyInfo.companyName || '会社名未設定',
                address: [
                    companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
                    companyInfo.prefecture || '',
                    companyInfo.city || '',
                    companyInfo.address1 || '',
                    companyInfo.address2 || ''
                ].filter(Boolean).join(' '),
                phone: companyInfo.phone,
                email: companyInfo.email,
                invoiceRegistrationNumber: companyInfo.registrationNumber || '',
                stampImage: companyInfo.sealUrl
            };
        }
        // ステータスを明示的に含める
        result.status = result.status || 'draft';
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error fetching delivery note:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch delivery note' }, { status: 500 });
    }
}
// PUT - 納品書更新
async function PUT(request, { params }) {
    try {
        const body = await request.json();
        const db = await (0, mongodb_2.getDatabase)();
        const collection = db.collection('deliveryNotes');
        // 更新データの準備
        const updateData = {
            ...body,
            updatedAt: new Date()
        };
        // ObjectIdフィールドの変換
        if (body.customerId) {
            updateData.customerId = new mongodb_1.ObjectId(body.customerId);
        }
        if (body.convertedFromQuoteId) {
            updateData.convertedFromQuoteId = new mongodb_1.ObjectId(body.convertedFromQuoteId);
        }
        if (body.convertedToInvoiceId) {
            updateData.convertedToInvoiceId = new mongodb_1.ObjectId(body.convertedToInvoiceId);
        }
        // 日付フィールドの変換
        if (body.issueDate) {
            updateData.issueDate = new Date(body.issueDate);
        }
        if (body.deliveryDate) {
            updateData.deliveryDate = new Date(body.deliveryDate);
        }
        if (body.receivedDate) {
            updateData.receivedDate = new Date(body.receivedDate);
        }
        if (body.convertedFromQuoteDate) {
            updateData.convertedFromQuoteDate = new Date(body.convertedFromQuoteDate);
        }
        if (body.convertedToInvoiceDate) {
            updateData.convertedToInvoiceDate = new Date(body.convertedToInvoiceDate);
        }
        // ステータス更新に伴う自動設定
        if (body.status === 'received' && !updateData.receivedDate) {
            updateData.receivedDate = new Date();
        }
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(params.id) }, { $set: updateData });
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
        }
        // 更新後のデータを取得
        const updatedDeliveryNote = await collection
            .aggregate([
            { $match: { _id: new mongodb_1.ObjectId(params.id) } },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
        ])
            .toArray();
        return server_1.NextResponse.json(updatedDeliveryNote[0]);
    }
    catch (error) {
        logger_1.logger.error('Error updating delivery note:', error);
        return server_1.NextResponse.json({ error: 'Failed to update delivery note' }, { status: 500 });
    }
}
// DELETE - 納品書削除（キャンセル）
async function DELETE(request, { params }) {
    try {
        const db = await (0, mongodb_2.getDatabase)();
        const collection = db.collection('deliveryNotes');
        // 削除ではなくキャンセル状態に更新
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(params.id) }, {
            $set: {
                status: 'cancelled',
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({ error: 'Delivery note not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ message: 'Delivery note cancelled successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error cancelling delivery note:', error);
        return server_1.NextResponse.json({ error: 'Failed to cancel delivery note' }, { status: 500 });
    }
}
