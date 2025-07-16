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

// POST - 請求書から納品書への変換
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClient();
    const db = client.db('accounting');
    const invoicesCollection = db.collection('invoices');
    const deliveryNotesCollection = db.collection('deliveryNotes');

    // 請求書を取得
    const invoice = await invoicesCollection
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

    if (!invoice || invoice.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoiceData = invoice[0];

    // 納品書番号の生成
    const deliveryNoteNumber = await generateDeliveryNoteNumber(db);

    // 顧客情報のスナップショット作成
    const customerSnapshot = await createCustomerSnapshot(db, invoiceData.customerId);
    
    // 会社情報のスナップショット作成
    const companySnapshot = await createCompanySnapshot(db);

    // 請求書の項目を納品書項目に変換
    const deliveryNoteItems = invoiceData.items.map((item: any) => ({
      itemName: item.itemName || item.description,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      taxRate: item.taxRate || 0.1,
      taxAmount: item.taxAmount || (item.amount * (item.taxRate || 0.1)),
      deliveredQuantity: item.quantity, // デフォルトで注文数量と同じ
      notes: item.notes
    }));

    // 納品書データの作成
    const newDeliveryNote = {
      deliveryNoteNumber,
      customerId: invoiceData.customerId,
      issueDate: new Date(), // 今日の日付
      deliveryDate: new Date(), // 今日の日付（後で変更可能）
      items: deliveryNoteItems,
      subtotal: invoiceData.subtotal || 0,
      taxAmount: invoiceData.taxAmount || 0,
      taxRate: invoiceData.taxRate || 0.1,
      totalAmount: invoiceData.totalAmount || 0,
      deliveryLocation: '', // 空で作成（後で入力）
      deliveryMethod: '', // 空で作成（後で選択）
      status: 'draft', // 下書きで作成
      notes: `請求書 ${invoiceData.invoiceNumber} から作成`, // 変換元の記録
      internalNotes: `請求書ID: ${invoiceData._id} から変換`,
      convertedFromInvoiceId: invoiceData._id, // 変換元請求書のID
      convertedFromInvoiceDate: new Date(),
      customerSnapshot,
      companySnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 納品書を作成
    const result = await deliveryNotesCollection.insertOne(newDeliveryNote);

    // 請求書に納品書変換情報を記録
    await invoicesCollection.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          convertedToDeliveryNoteId: result.insertedId,
          convertedToDeliveryNoteDate: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      _id: result.insertedId,
      ...newDeliveryNote,
      message: '請求書から納品書への変換が完了しました'
    }, { status: 201 });

  } catch (error) {
    console.error('Error converting invoice to delivery note:', error);
    return NextResponse.json(
      { 
        error: 'Failed to convert invoice to delivery note',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
  
  // 当月の最大番号を取得
  const prefix = `DN-${year}${month}`;
  const lastDeliveryNote = await collection
    .findOne(
      { deliveryNoteNumber: { $regex: `^${prefix}` } },
      { sort: { deliveryNoteNumber: -1 } }
    );

  let nextNumber = 1;
  if (lastDeliveryNote) {
    const lastNumber = parseInt(lastDeliveryNote.deliveryNoteNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

// 顧客情報スナップショット作成
async function createCustomerSnapshot(db: any, customerId: string) {
  const customersCollection = db.collection('customers');
  const customer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
  
  if (!customer) {
    throw new Error('Customer not found');
  }

  const primaryContact = customer.contacts?.find((c: any) => c.isPrimary) || customer.contacts?.[0];
  
  return {
    companyName: customer.companyName,
    contactName: primaryContact?.name,
    address: `${customer.postalCode ? `〒${customer.postalCode} ` : ''}${customer.prefecture || ''}${customer.city || ''}${customer.address1 || ''}${customer.address2 || ''}`.trim(),
    phone: customer.phone,
    email: customer.email || primaryContact?.email
  };
}

// 会社情報スナップショット作成
async function createCompanySnapshot(db: any) {
  const companyCollection = db.collection('company-info');
  const company = await companyCollection.findOne({ isDefault: true });
  
  return {
    companyName: company?.companyName || '会社名未設定',
    address: `${company?.postalCode ? `〒${company.postalCode} ` : ''}${company?.prefecture || ''}${company?.city || ''}${company?.address1 || ''}${company?.address2 || ''}`.trim(),
    phone: company?.phone,
    email: company?.email,
    invoiceRegistrationNumber: company?.registrationNumber,
    stampImage: company?.sealUrl
  };
}