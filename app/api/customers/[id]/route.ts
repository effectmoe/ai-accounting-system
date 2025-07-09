import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// GET: 顧客詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ObjectIdの形式チェック
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: '無効な顧客IDです' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('customers');

    // 顧客データを取得
    const customer = await collection.findOne({ _id: new ObjectId(id) });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    // MongoDBの_idをidに変換
    const formattedCustomer = {
      id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      address: customer.address || null,
      company: customer.company || null,
      notes: customer.notes || null,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };

    return NextResponse.json({
      success: true,
      customer: formattedCustomer,
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { success: false, error: '顧客データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: 顧客情報更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, phone, address, company, notes } = body;

    // ObjectIdの形式チェック
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: '無効な顧客IDです' },
        { status: 400 }
      );
    }

    // 必須フィールドのチェック
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: '顧客名とメールアドレスは必須です' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('customers');

    // メールアドレスの重複チェック（自分以外）
    const existingCustomer = await collection.findOne({
      email,
      _id: { $ne: new ObjectId(id) },
    });
    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // 顧客データの更新
    const updateData = {
      name,
      email,
      phone: phone || null,
      address: address || null,
      company: company || null,
      notes: notes || null,
      updated_at: new Date(),
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id,
        ...updateData,
      },
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, error: '顧客情報の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: 顧客削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ObjectIdの形式チェック
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: '無効な顧客IDです' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection('customers');

    // 顧客の削除
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: '顧客が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '顧客を削除しました',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, error: '顧客の削除に失敗しました' },
      { status: 500 }
    );
  }
}