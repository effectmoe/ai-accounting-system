import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { DeliveryNote, DeliveryNoteStatus } from '@/types/collections';
import { getDatabase } from '@/lib/mongodb';

// GET - 個別納品書取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    const deliveryNote = await collection
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching delivery note:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery note' },
      { status: 500 }
    );
  }
}

// PUT - 納品書更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    // 更新データの準備
    const updateData: Partial<DeliveryNote> = {
      ...body,
      updatedAt: new Date()
    };

    // ObjectIdフィールドの変換
    if (body.customerId) {
      updateData.customerId = new ObjectId(body.customerId);
    }
    if (body.convertedFromQuoteId) {
      updateData.convertedFromQuoteId = new ObjectId(body.convertedFromQuoteId);
    }
    if (body.convertedToInvoiceId) {
      updateData.convertedToInvoiceId = new ObjectId(body.convertedToInvoiceId);
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

    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Delivery note not found' },
        { status: 404 }
      );
    }

    // 更新後のデータを取得
    const updatedDeliveryNote = await collection
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

    return NextResponse.json(updatedDeliveryNote[0]);
  } catch (error) {
    console.error('Error updating delivery note:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery note' },
      { status: 500 }
    );
  }
}

// DELETE - 納品書削除（キャンセル）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const collection = db.collection('deliveryNotes');

    // 削除ではなくキャンセル状態に更新
    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          status: 'cancelled' as DeliveryNoteStatus,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Delivery note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Delivery note cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling delivery note:', error);
    return NextResponse.json(
      { error: 'Failed to cancel delivery note' },
      { status: 500 }
    );
  }
}