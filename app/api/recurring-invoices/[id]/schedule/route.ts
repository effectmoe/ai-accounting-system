import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoice, RecurringInvoiceSchedule } from '@/types/recurring-invoice';
import { sanitizeLog } from '@/lib/log-sanitizer';
import { handleStandardizedError, ValidationError } from '@/lib/standardized-error-handler';

// GET: 定期請求書のスケジュールを取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      throw new ValidationError('Invalid recurring invoice ID');
    }

    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const collection = db.collection<RecurringInvoice>('recurringInvoices');

    // 定期請求書を取得
    const recurringInvoice = await collection.findOne({ _id: new ObjectId(id) });
    if (!recurringInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // 既に生成された請求書の情報を取得
    const relations = await db.collection('recurringInvoiceRelations')
      .find({ recurringInvoiceId: new ObjectId(id) })
      .toArray();

    const generatedMap = new Map(
      relations.map(r => [r.installmentNumber, r])
    );

    // スケジュールの生成
    const schedules: RecurringInvoiceSchedule[] = [];
    let currentDate = new Date(recurringInvoice.startDate);

    for (let i = 1; i <= recurringInvoice.totalInstallments; i++) {
      const existingRelation = generatedMap.get(i);
      
      const schedule: RecurringInvoiceSchedule = {
        recurringInvoiceId: new ObjectId(id),
        installmentNumber: i,
        scheduledDate: new Date(currentDate),
        amount: recurringInvoice.monthlyAmount,
        status: existingRelation ? 'generated' : 
                i <= recurringInvoice.completedInstallments ? 'completed' : 'pending',
        invoiceId: existingRelation?.invoiceId,
        isEditable: !existingRelation && recurringInvoice.status === 'active',
        notes: existingRelation?.notes
      };

      // カスタム日付や金額がある場合
      if (existingRelation) {
        if (existingRelation.customDate) {
          schedule.customDate = existingRelation.customDate;
        }
        if (existingRelation.customAmount) {
          schedule.customAmount = existingRelation.customAmount;
          schedule.amount = existingRelation.customAmount;
        }
      }

      schedules.push(schedule);

      // 次回の日付を計算
      switch (recurringInvoice.frequency) {
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'bi-monthly':
          currentDate.setMonth(currentDate.getMonth() + 2);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'semi-annually':
          currentDate.setMonth(currentDate.getMonth() + 6);
          break;
        case 'annually':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        case 'custom':
          if (recurringInvoice.customFrequencyDays) {
            currentDate.setDate(currentDate.getDate() + recurringInvoice.customFrequencyDays);
          }
          break;
      }
    }

    console.log(sanitizeLog({
      message: 'Generated recurring invoice schedule',
      recurringInvoiceId: id,
      scheduleCount: schedules.length
    }));

    return NextResponse.json({
      schedules,
      recurringInvoice: {
        _id: recurringInvoice._id,
        recurringInvoiceNumber: recurringInvoice.recurringInvoiceNumber,
        title: recurringInvoice.title,
        frequency: recurringInvoice.frequency,
        status: recurringInvoice.status
      }
    });
  } catch (error) {
    console.error('Error fetching schedule:', sanitizeLog({ error }));
    return handleStandardizedError(error);
  }
}

// PUT: スケジュールの更新（日付や金額のカスタマイズ）
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

    if (!body.installmentNumber || typeof body.installmentNumber !== 'number') {
      throw new ValidationError('Installment number is required');
    }

    const client = await clientPromise;
    const db = client.db('accounting-automation');
    
    // 定期請求書の確認
    const recurringInvoice = await db.collection<RecurringInvoice>('recurringInvoices')
      .findOne({ _id: new ObjectId(id) });
      
    if (!recurringInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    if (recurringInvoice.status !== 'active') {
      throw new ValidationError('Cannot update schedule for inactive recurring invoice');
    }

    // すでに生成された請求書でないことを確認
    const existingRelation = await db.collection('recurringInvoiceRelations').findOne({
      recurringInvoiceId: new ObjectId(id),
      installmentNumber: body.installmentNumber
    });

    if (existingRelation) {
      throw new ValidationError('Cannot update schedule for already generated invoice');
    }

    // スケジュール情報をメタデータとして保存
    const scheduleMetadata = {
      recurringInvoiceId: new ObjectId(id),
      installmentNumber: body.installmentNumber,
      customDate: body.customDate ? new Date(body.customDate) : undefined,
      customAmount: body.customAmount,
      notes: body.notes,
      updatedAt: new Date()
    };

    // カスタムスケジュールの保存（別コレクション）
    await db.collection('recurringInvoiceScheduleCustom').updateOne(
      {
        recurringInvoiceId: new ObjectId(id),
        installmentNumber: body.installmentNumber
      },
      { $set: scheduleMetadata },
      { upsert: true }
    );

    console.log(sanitizeLog({
      message: 'Updated recurring invoice schedule',
      recurringInvoiceId: id,
      installmentNumber: body.installmentNumber,
      customizations: {
        hasCustomDate: !!body.customDate,
        hasCustomAmount: !!body.customAmount
      }
    }));

    return NextResponse.json({
      message: 'Schedule updated successfully',
      installmentNumber: body.installmentNumber
    });
  } catch (error) {
    console.error('Error updating schedule:', sanitizeLog({ error }));
    return handleStandardizedError(error);
  }
}