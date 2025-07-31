import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoice } from '@/types/recurring-invoice';
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

// GET: 個別の定期請求書の取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      throw new ValidationError('Invalid recurring invoice ID', 'invalid_id');
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    const recurringInvoice = await collection.aggregate([
      { $match: { _id: new ObjectId(id) } },
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
      { $limit: 1 }
    ]).toArray();

    if (recurringInvoice.length === 0) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    const formattedInvoice = {
      ...recurringInvoice[0],
      id: recurringInvoice[0]._id?.toString()
    };

    console.log(sanitizeLog({
      message: 'Fetched recurring invoice',
      id,
      recurringInvoiceNumber: recurringInvoice[0].recurringInvoiceNumber
    }));

    return NextResponse.json(formattedInvoice);
  } catch (error) {
    console.error('Error fetching recurring invoice:', sanitizeLog({ error }));
    return handleStandardizedError(error, 'GET');
  }
}

// PUT: 定期請求書の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      throw new ValidationError('Invalid recurring invoice ID');
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 既存の定期請求書を取得
    const existingInvoice = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // 更新可能なフィールドのみを抽出
    const updateFields: Partial<RecurringInvoice> = {};

    // 基本情報
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.customerId !== undefined) updateFields.customerId = new ObjectId(body.customerId);
    
    // 請求内容
    if (body.items !== undefined) {
      updateFields.items = body.items;
      
      // 金額の再計算
      const subtotal = body.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0
      );
      const taxRate = body.taxRate || existingInvoice.taxRate || 0.1;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;
      
      updateFields.subtotal = subtotal;
      updateFields.taxAmount = taxAmount;
      updateFields.totalAmount = totalAmount;
    }
    
    if (body.taxRate !== undefined) updateFields.taxRate = body.taxRate;
    
    // 定期請求設定
    if (body.frequency !== undefined) updateFields.frequency = body.frequency;
    if (body.customFrequencyDays !== undefined) updateFields.customFrequencyDays = body.customFrequencyDays;
    
    // 金額設定（ステータスがactiveの場合のみ）
    if (existingInvoice.status === 'active') {
      if (body.totalContractAmount !== undefined) updateFields.totalContractAmount = body.totalContractAmount;
      if (body.monthlyAmount !== undefined) updateFields.monthlyAmount = body.monthlyAmount;
      if (body.totalInstallments !== undefined) {
        updateFields.totalInstallments = body.totalInstallments;
        updateFields.remainingInstallments = body.totalInstallments - existingInvoice.completedInstallments;
      }
    }
    
    // スケジュール設定
    if (body.startDate !== undefined) updateFields.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateFields.endDate = new Date(body.endDate);
    if (body.nextInvoiceDate !== undefined) updateFields.nextInvoiceDate = new Date(body.nextInvoiceDate);
    
    // 支払い設定
    if (body.paymentMethod !== undefined) updateFields.paymentMethod = body.paymentMethod;
    if (body.paymentTerms !== undefined) updateFields.paymentTerms = body.paymentTerms;
    if (body.bankAccountId !== undefined) {
      updateFields.bankAccountId = body.bankAccountId ? new ObjectId(body.bankAccountId) : undefined;
    }
    
    // ステータス
    if (body.status !== undefined && body.status !== existingInvoice.status) {
      updateFields.status = body.status;
      
      // ステータス変更時のタイムスタンプ
      if (body.status === 'paused') {
        updateFields.pausedAt = new Date();
      } else if (body.status === 'cancelled') {
        updateFields.cancelledAt = new Date();
      } else if (body.status === 'completed') {
        updateFields.completedAt = new Date();
      }
    }
    
    // メモ・備考
    if (body.notes !== undefined) updateFields.notes = body.notes;
    if (body.internalNotes !== undefined) updateFields.internalNotes = body.internalNotes;
    
    // 自動化設定
    if (body.autoGenerate !== undefined) updateFields.autoGenerate = body.autoGenerate;
    if (body.autoSend !== undefined) updateFields.autoSend = body.autoSend;
    if (body.notifyBeforeDays !== undefined) updateFields.notifyBeforeDays = body.notifyBeforeDays;
    
    // 更新日時
    updateFields.updatedAt = new Date();

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      throw new DatabaseError('Failed to update recurring invoice', 'UPDATE_FAILED');
    }

    console.log(sanitizeLog({
      message: 'Updated recurring invoice',
      id,
      updatedFields: Object.keys(updateFields)
    }));

    return NextResponse.json({
      message: 'Recurring invoice updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating recurring invoice:', sanitizeLog({ error }));
    return handleStandardizedError(error);
  }
}

// DELETE: 定期請求書の削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      throw new ValidationError('Invalid recurring invoice ID');
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 既存の定期請求書を確認
    const existingInvoice = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // すでに生成された請求書があるかチェック
    const relationsCollection = db.collection('recurringInvoiceRelations');
    const hasRelations = await relationsCollection.countDocuments({
      recurringInvoiceId: new ObjectId(id)
    });

    if (hasRelations > 0) {
      // 関連する請求書がある場合は、キャンセル扱いにする
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      console.log(sanitizeLog({
        message: 'Cancelled recurring invoice (has relations)',
        id,
        recurringInvoiceNumber: existingInvoice.recurringInvoiceNumber
      }));

      return NextResponse.json({
        message: 'Recurring invoice cancelled successfully',
        action: 'cancelled'
      });
    } else {
      // 関連する請求書がない場合は、物理削除
      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        throw new DatabaseError('Failed to delete recurring invoice', 'DELETE_FAILED');
      }

      console.log(sanitizeLog({
        message: 'Deleted recurring invoice',
        id,
        recurringInvoiceNumber: existingInvoice.recurringInvoiceNumber
      }));

      return NextResponse.json({
        message: 'Recurring invoice deleted successfully',
        action: 'deleted'
      });
    }
  } catch (error) {
    console.error('Error deleting recurring invoice:', sanitizeLog({ error }));
    return handleStandardizedError(error, 'DELETE');
  }
}