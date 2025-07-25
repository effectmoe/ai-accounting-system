"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const mongodb_2 = require("@/lib/mongodb");
// POST - 納品書から請求書への変換
async function POST(request, { params }) {
    try {
        const db = await (0, mongodb_2.getDatabase)();
        const deliveryNotesCollection = db.collection('deliveryNotes');
        const invoicesCollection = db.collection('invoices');
        // 納品書を取得
        const deliveryNote = await deliveryNotesCollection
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
        const deliveryNoteData = deliveryNote[0];
        // 請求書番号の生成
        const invoiceNumber = await generateInvoiceNumber(db);
        // 請求書データの作成
        const invoice = {
            invoiceNumber,
            customerId: deliveryNoteData.customerId,
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後をデフォルト
            items: deliveryNoteData.items.map((item) => ({
                itemName: item.itemName,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount,
                taxRate: item.taxRate || 10,
                taxAmount: item.taxAmount || Math.floor(item.amount * 0.1),
            })),
            subtotal: deliveryNoteData.subtotal,
            taxAmount: deliveryNoteData.taxAmount,
            taxRate: deliveryNoteData.taxRate || 10,
            totalAmount: deliveryNoteData.totalAmount,
            status: 'draft',
            notes: deliveryNoteData.notes || '',
            convertedFromDeliveryNoteId: new mongodb_1.ObjectId(params.id),
            convertedFromDeliveryNoteDate: new Date(),
            customerSnapshot: deliveryNoteData.customerSnapshot,
            companySnapshot: deliveryNoteData.companySnapshot,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // 請求書を作成
        const result = await invoicesCollection.insertOne(invoice);
        // 納品書に変換履歴を記録
        await deliveryNotesCollection.updateOne({ _id: new mongodb_1.ObjectId(params.id) }, {
            $set: {
                convertedToInvoiceId: result.insertedId,
                convertedToInvoiceDate: new Date()
            }
        });
        return server_1.NextResponse.json({
            _id: result.insertedId,
            invoiceNumber: invoice.invoiceNumber,
            message: '請求書への変換が完了しました'
        });
    }
    catch (error) {
        console.error('Error converting delivery note to invoice:', error);
        return server_1.NextResponse.json({ error: 'Failed to convert delivery note to invoice' }, { status: 500 });
    }
}
// 請求書番号生成
async function generateInvoiceNumber(db) {
    const collection = db.collection('invoices');
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // 今月の請求書数を取得
    const startOfMonth = new Date(year, date.getMonth(), 1);
    const endOfMonth = new Date(year, date.getMonth() + 1, 0);
    const count = await collection.countDocuments({
        createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
        }
    });
    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
}
