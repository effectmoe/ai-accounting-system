import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { format } from 'date-fns';
import { getDatabase } from '@/lib/mongodb';

import { logger } from '@/lib/logger';
// POST - 納品書から請求書への変換
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const deliveryNotesCollection = db.collection('deliveryNotes');
    const invoicesCollection = db.collection('invoices');

    // 納品書を取得
    const deliveryNote = await deliveryNotesCollection
      .aggregate([
        { $match: { _id: new ObjectId(params.id) } },
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
      return NextResponse.json(
        { error: 'Delivery note not found' },
        { status: 404 }
      );
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
      items: deliveryNoteData.items.map((item: any) => ({
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
      convertedFromDeliveryNoteId: new ObjectId(params.id),
      convertedFromDeliveryNoteDate: new Date(),
      customerSnapshot: deliveryNoteData.customerSnapshot,
      companySnapshot: deliveryNoteData.companySnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 請求書を作成
    const result = await invoicesCollection.insertOne(invoice);

    // 納品書に変換履歴を記録
    await deliveryNotesCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          convertedToInvoiceId: result.insertedId,
          convertedToInvoiceDate: new Date()
        } 
      }
    );

    return NextResponse.json({
      _id: result.insertedId,
      invoiceNumber: invoice.invoiceNumber,
      message: '請求書への変換が完了しました'
    });
  } catch (error) {
    logger.error('Error converting delivery note to invoice:', error);
    return NextResponse.json(
      { error: 'Failed to convert delivery note to invoice' },
      { status: 500 }
    );
  }
}

// 請求書番号生成
async function generateInvoiceNumber(db: any): Promise<string> {
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