import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { format } from 'date-fns';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

let client: MongoClient | null = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

// POST - 見積書から納品書への変換
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db('accounting');
    const quotesCollection = db.collection('quotes');
    const deliveryNotesCollection = db.collection('deliveryNotes');

    // 見積書を取得
    const quote = await quotesCollection
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

    if (!quote || quote.length === 0) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    const quoteData = quote[0];

    // 納品書番号の生成
    const deliveryNoteNumber = await generateDeliveryNoteNumber(db);

    // 顧客情報のスナップショット作成
    const customerSnapshot = await createCustomerSnapshot(db, quoteData.customerId);
    const companySnapshot = await createCompanySnapshot(db);

    // 納品書データの作成
    const deliveryNote = {
      deliveryNoteNumber,
      customerId: quoteData.customerId,
      issueDate: new Date(),
      deliveryDate: new Date(), // デフォルトは当日
      items: quoteData.items.map((item: any) => ({
        itemName: item.itemName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        taxRate: item.taxRate || 10,
        taxAmount: item.taxAmount || Math.floor(item.amount * 0.1),
        deliveredQuantity: item.quantity // デフォルトは注文数量と同じ
      })),
      subtotal: quoteData.subtotal,
      taxAmount: quoteData.taxAmount,
      taxRate: quoteData.taxRate || 10,
      totalAmount: quoteData.totalAmount,
      status: 'draft',
      notes: quoteData.notes || '',
      convertedFromQuoteId: new ObjectId(params.id),
      convertedFromQuoteDate: new Date(),
      customerSnapshot,
      companySnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 納品書を作成
    const result = await deliveryNotesCollection.insertOne(deliveryNote);

    // 見積書に変換履歴を記録（オプション）
    // await quotesCollection.updateOne(
    //   { _id: new ObjectId(params.id) },
    //   { 
    //     $set: { 
    //       convertedToDeliveryNoteId: result.insertedId,
    //       convertedToDeliveryNoteDate: new Date()
    //     } 
    //   }
    // );

    return NextResponse.json({
      _id: result.insertedId,
      deliveryNoteNumber: deliveryNote.deliveryNoteNumber,
      message: '納品書の作成が完了しました'
    });
  } catch (error) {
    console.error('Error converting quote to delivery note:', error);
    return NextResponse.json(
      { error: 'Failed to convert quote to delivery note' },
      { status: 500 }
    );
  }
}

// 納品書番号生成
async function generateDeliveryNoteNumber(db: any): Promise<string> {
  const collection = db.collection('deliveryNotes');
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  // 今月の納品書数を取得
  const startOfMonth = new Date(year, date.getMonth(), 1);
  const endOfMonth = new Date(year, date.getMonth() + 1, 0);
  
  const count = await collection.countDocuments({
    createdAt: {
      $gte: startOfMonth,
      $lte: endOfMonth
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `DN-${year}${month}-${sequence}`;
}

// 顧客情報のスナップショット作成
async function createCustomerSnapshot(db: any, customerId: ObjectId) {
  const customer = await db.collection('customers').findOne({ _id: customerId });
  
  if (!customer) {
    return {
      companyName: '顧客情報なし',
      address: '',
    };
  }

  return {
    companyName: customer.companyName || '',
    contactName: customer.contacts?.[0]?.name || '',
    address: [
      customer.postalCode ? `〒${customer.postalCode}` : '',
      customer.prefecture || '',
      customer.city || '',
      customer.address1 || '',
      customer.address2 || ''
    ].filter(Boolean).join(' '),
    phone: customer.phone || '',
    email: customer.email || ''
  };
}

// 会社情報のスナップショット作成
async function createCompanySnapshot(db: any) {
  const companyInfo = await db.collection('companyInfo').findOne({ isDefault: true });
  
  if (!companyInfo) {
    return {
      companyName: '会社情報未設定',
      address: '',
    };
  }

  return {
    companyName: companyInfo.companyName || '',
    address: [
      companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
      companyInfo.prefecture || '',
      companyInfo.city || '',
      companyInfo.address1 || '',
      companyInfo.address2 || ''
    ].filter(Boolean).join(' '),
    phone: companyInfo.phone || '',
    email: companyInfo.email || '',
    invoiceRegistrationNumber: companyInfo.registrationNumber || '',
    stampImage: companyInfo.sealUrl || ''
  };
}