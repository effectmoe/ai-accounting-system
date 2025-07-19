import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { DeliveryNote, DeliveryNoteStatus } from '@/types/collections';
import { getDatabase } from '@/lib/mongodb';

import { logger } from '@/lib/logger';
// GET - 納品書一覧取得
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // フィルター条件構築
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (customerId) {
      filter.customerId = new ObjectId(customerId);
    }

    // 納品書一覧取得（顧客情報を含む）
    const deliveryNotes = await collection
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();

    // 総件数取得
    const total = await collection.countDocuments(filter);

    return NextResponse.json({
      deliveryNotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching delivery notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery notes' },
      { status: 500 }
    );
  }
}

// POST - 納品書作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    // 納品書番号の生成
    const deliveryNoteNumber = await generateDeliveryNoteNumber(db);

    // 顧客情報のスナップショット作成
    const customerSnapshot = await createCustomerSnapshot(db, body.customerId);
    
    // 会社情報のスナップショット作成
    const companySnapshot = await createCompanySnapshot(db);

    const newDeliveryNote: Partial<DeliveryNote> = {
      deliveryNoteNumber,
      customerId: new ObjectId(body.customerId),
      issueDate: new Date(body.issueDate),
      deliveryDate: new Date(body.deliveryDate),
      items: body.items || [],
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      taxRate: body.taxRate || 0.1,
      totalAmount: body.totalAmount || 0,
      deliveryLocation: body.deliveryLocation,
      deliveryMethod: body.deliveryMethod,
      status: (body.status as DeliveryNoteStatus) || 'draft',
      notes: body.notes,
      internalNotes: body.internalNotes,
      convertedFromQuoteId: body.convertedFromQuoteId ? new ObjectId(body.convertedFromQuoteId) : undefined,
      convertedFromQuoteDate: body.convertedFromQuoteDate ? new Date(body.convertedFromQuoteDate) : undefined,
      customerSnapshot,
      companySnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newDeliveryNote);
    
    return NextResponse.json({
      _id: result.insertedId,
      ...newDeliveryNote
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating delivery note:', error);
    return NextResponse.json(
      { error: 'Failed to create delivery note' },
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
  const companyCollection = db.collection('companyInfo');
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