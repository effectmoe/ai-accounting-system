import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoice, RecurringInvoiceStatus } from '@/types/recurring-invoice';
import { sanitizeLog } from '@/lib/log-sanitizer';
import { ValidationError, DatabaseError } from '@/lib/standardized-error-handler';

function handleStandardizedError(error: unknown, context?: string): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof DatabaseError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
  }
  // MongoDB接続エラーの特別処理
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as any).message;
    if (message.includes('Database connection') || message.includes('BUILD_SKIP')) {
      console.error(`Database connection error in ${context}:`, message);
      return NextResponse.json({ error: 'データベース接続エラーが発生しました' }, { status: 503 });
    }
  }
  console.error(`Unexpected error in ${context}:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// GET: 定期請求書一覧の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'recurringInvoiceNumber';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';
    
    // フィルター条件の構築
    const status = searchParams.get('status') as RecurringInvoiceStatus | null;
    const customerId = searchParams.get('customerId');
    const frequency = searchParams.get('frequency');
    
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (customerId) {
      filter.customerId = new ObjectId(customerId);
    }
    
    if (frequency) {
      filter.frequency = frequency;
    }
    
    if (search) {
      filter.$or = [
        { recurringInvoiceNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 総件数の取得
    const totalCount = await collection.countDocuments(filter);

    // ページネーション計算
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // 定期請求書の取得（顧客情報を含む）
    const recurringInvoices = await collection.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'bankAccounts',
          localField: 'bankAccountId',
          foreignField: '_id',
          as: 'bankAccount'
        }
      },
      {
        $unwind: {
          path: '$bankAccount',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          recurringInvoiceNumber: 1,
          title: 1,
          customerId: 1,
          'customer.companyName': 1,
          'customer.contactName': 1,
          frequency: 1,
          totalContractAmount: 1,
          monthlyAmount: 1,
          totalInstallments: 1,
          completedInstallments: 1,
          remainingInstallments: 1,
          startDate: 1,
          endDate: 1,
          nextInvoiceDate: 1,
          status: 1,
          totalInvoicedAmount: 1,
          totalPaidAmount: 1,
          autoGenerate: 1,
          autoSend: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { [sort]: order } },
      { $skip: skip },
      { $limit: limit }
    ]).toArray();

    // IDフィールドの追加（フロントエンド互換性）
    const formattedRecurringInvoices = recurringInvoices.map(invoice => ({
      ...invoice,
      id: invoice._id?.toString()
    }));

    console.log(sanitizeLog({
      message: 'Fetched recurring invoices',
      count: recurringInvoices.length,
      page,
      totalPages
    }));

    return NextResponse.json({
      recurringInvoices: formattedRecurringInvoices,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching recurring invoices:', sanitizeLog({ error }));
    return handleStandardizedError(error, 'GET');
  }
}

// POST: 新規定期請求書の作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 必須フィールドの検証
    if (!body.title || !body.customerId || !body.items || body.items.length === 0) {
      throw new ValidationError('Title, customer ID, and items are required', 'missing_required_fields');
    }

    if (!body.frequency || !body.totalContractAmount || !body.monthlyAmount || !body.totalInstallments) {
      throw new ValidationError('Frequency, total amount, monthly amount, and installments are required', 'missing_payment_info');
    }

    if (!body.startDate) {
      throw new ValidationError('Start date is required', 'missing_start_date');
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 定期請求書番号の生成
    const lastInvoice = await collection.findOne(
      {},
      { sort: { recurringInvoiceNumber: -1 } }
    );

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.recurringInvoiceNumber) {
      const match = lastInvoice.recurringInvoiceNumber.match(/R-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const recurringInvoiceNumber = `R-${nextNumber.toString().padStart(6, '0')}`;

    // 終了日の計算
    const startDate = new Date(body.startDate);
    let endDate: Date | undefined;
    
    if (body.frequency === 'monthly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + body.totalInstallments - 1);
    } else if (body.frequency === 'bi-monthly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (body.totalInstallments * 2) - 2);
    } else if (body.frequency === 'quarterly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (body.totalInstallments * 3) - 3);
    } else if (body.frequency === 'semi-annually') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (body.totalInstallments * 6) - 6);
    } else if (body.frequency === 'annually') {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + body.totalInstallments - 1);
    } else if (body.frequency === 'custom' && body.customFrequencyDays) {
      const totalDays = (body.totalInstallments - 1) * body.customFrequencyDays;
      endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    }

    // 金額の計算
    const subtotal = body.items.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const taxAmount = subtotal * (body.taxRate || 0.1);
    const totalAmount = subtotal + taxAmount;

    // 新規定期請求書オブジェクトの作成
    const newRecurringInvoice: RecurringInvoice = {
      recurringInvoiceNumber,
      title: body.title,
      customerId: new ObjectId(body.customerId),
      items: body.items,
      subtotal,
      taxAmount,
      taxRate: body.taxRate || 0.1,
      totalAmount,
      frequency: body.frequency,
      customFrequencyDays: body.customFrequencyDays,
      totalContractAmount: body.totalContractAmount,
      monthlyAmount: body.monthlyAmount,
      totalInstallments: body.totalInstallments,
      startDate,
      endDate,
      nextInvoiceDate: startDate,
      paymentMethod: body.paymentMethod,
      paymentTerms: body.paymentTerms || 30,
      bankAccountId: body.bankAccountId ? new ObjectId(body.bankAccountId) : undefined,
      completedInstallments: 0,
      remainingInstallments: body.totalInstallments,
      totalInvoicedAmount: 0,
      totalPaidAmount: 0,
      status: 'active',
      notes: body.notes,
      internalNotes: body.internalNotes,
      autoGenerate: body.autoGenerate || false,
      autoSend: body.autoSend || false,
      notifyBeforeDays: body.notifyBeforeDays || 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newRecurringInvoice);

    if (!result.insertedId) {
      throw new DatabaseError('Failed to create recurring invoice', 'INSERT_FAILED');
    }

    console.log(sanitizeLog({
      message: 'Created new recurring invoice',
      recurringInvoiceNumber,
      customerId: body.customerId
    }));

    return NextResponse.json({
      _id: result.insertedId,
      id: result.insertedId.toString(),
      recurringInvoiceNumber,
      message: 'Recurring invoice created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring invoice:', sanitizeLog({ error }));
    return handleStandardizedError(error, 'POST');
  }
}