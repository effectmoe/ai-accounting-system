import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { v4 as uuidv4 } from 'uuid';

// GET: 顧客一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const collection = db.collection('customers');

    // 検索条件の構築
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    // 総件数を取得
    const total = await collection.countDocuments(query);

    // 顧客データを取得
    const customers = await collection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // MongoDBの_idをidに変換、フィールド名を統一
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id.toString(),
      id: customer._id.toString(),
      companyName: customer.companyName || customer.name || customer.company || '',
      name: customer.name || customer.companyName || '',
      email: customer.email,
      phone: customer.phone || null,
      address: customer.address || null,
      company: customer.company || customer.companyName || null,
      notes: customer.notes || null,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    }));

    return NextResponse.json({
      success: true,
      customers: formattedCustomers,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: '顧客データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 新規顧客作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, companyName, email, phone, address, company, notes } = body;

    // 必須フィールドのチェック
    const customerName = companyName || name;
    if (!customerName) {
      return NextResponse.json(
        { success: false, error: '顧客名は必須です' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック（メールアドレスが提供された場合のみ）
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: '有効なメールアドレスを入力してください' },
          { status: 400 }
        );
      }
    }

    const db = await getDatabase();
    const collection = db.collection('customers');

    // メールアドレスの重複チェック（メールアドレスが提供された場合のみ）
    if (email) {
      const existingCustomer = await collection.findOne({ email });
      if (existingCustomer) {
        return NextResponse.json(
          { success: false, error: 'このメールアドレスは既に登録されています' },
          { status: 400 }
        );
      }
    }

    // 新規顧客データの作成
    const now = new Date();
    const newCustomer = {
      name: name || companyName,
      companyName: companyName || name,
      email,
      phone: phone || null,
      address: address || null,
      company: company || companyName || null,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };

    // データベースに保存
    const result = await collection.insertOne(newCustomer);

    return NextResponse.json({
      success: true,
      _id: result.insertedId.toString(),
      id: result.insertedId.toString(),
      ...newCustomer,
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: '顧客の作成に失敗しました' },
      { status: 500 }
    );
  }
}