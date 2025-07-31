import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoice, RecurringInvoiceRelation } from '@/types/recurring-invoice';
import { Invoice } from '@/types/collections';
import { sanitizeLog } from '@/lib/log-sanitizer';
import { handleStandardizedError, ValidationError, DatabaseError } from '@/lib/standardized-error-handler';

// POST: 定期請求書から個別の請求書を生成
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      throw new ValidationError('Invalid recurring invoice ID');
    }

    const client = await clientPromise;
    const db = client.db('accounting-automation');
    const recurringCollection = db.collection<RecurringInvoice>('recurringInvoices');
    const invoiceCollection = db.collection<Invoice>('invoices');
    const relationCollection = db.collection<RecurringInvoiceRelation>('recurringInvoiceRelations');

    // 定期請求書を取得
    const recurringInvoice = await recurringCollection.findOne({ _id: new ObjectId(id) });
    if (!recurringInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // ステータスチェック
    if (recurringInvoice.status !== 'active') {
      throw new ValidationError(`Cannot generate invoice from ${recurringInvoice.status} recurring invoice`);
    }

    // 生成する請求書の日付（指定がなければ次回請求日）
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : 
                       recurringInvoice.nextInvoiceDate || new Date();

    // 回数の計算
    const installmentNumber = recurringInvoice.completedInstallments + 1;

    // すでに同じ回数の請求書が生成されていないかチェック
    const existingRelation = await relationCollection.findOne({
      recurringInvoiceId: new ObjectId(id),
      installmentNumber
    });

    if (existingRelation && existingRelation.status !== 'cancelled') {
      throw new ValidationError(`Invoice for installment ${installmentNumber} already exists`);
    }

    // 請求書番号の生成
    const lastInvoice = await invoiceCollection.findOne(
      {},
      { sort: { invoiceNumber: -1 } }
    );

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const invoiceNumber = `INV-${nextNumber.toString().padStart(6, '0')}`;

    // 支払期限の計算
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (recurringInvoice.paymentTerms || 30));

    // 金額（カスタム金額が指定されていればそれを使用）
    const amount = body.customAmount || recurringInvoice.monthlyAmount;

    // 新規請求書の作成
    const newInvoice: Invoice = {
      invoiceNumber,
      customerId: recurringInvoice.customerId,
      issueDate: invoiceDate,
      dueDate,
      items: recurringInvoice.items.map(item => ({
        ...item,
        // 金額をカスタム金額に合わせて調整
        unitPrice: body.customAmount ? 
          (item.unitPrice * amount / recurringInvoice.monthlyAmount) : 
          item.unitPrice
      })),
      subtotal: body.customAmount ? 
        (recurringInvoice.subtotal * amount / recurringInvoice.monthlyAmount) :
        recurringInvoice.subtotal,
      taxRate: recurringInvoice.taxRate,
      taxAmount: body.customAmount ?
        (recurringInvoice.taxAmount * amount / recurringInvoice.monthlyAmount) :
        recurringInvoice.taxAmount,
      totalAmount: amount,
      paymentMethod: recurringInvoice.paymentMethod,
      paymentStatus: 'unpaid',
      bankAccountId: recurringInvoice.bankAccountId,
      notes: body.notes || recurringInvoice.notes,
      recurringInvoiceId: new ObjectId(id),
      installmentNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // トランザクション的な処理
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 請求書を作成
        const invoiceResult = await invoiceCollection.insertOne(newInvoice, { session });

        if (!invoiceResult.insertedId) {
          throw new DatabaseError('Failed to create invoice', 'INSERT_FAILED');
        }

        // 関連情報を作成
        const newRelation: RecurringInvoiceRelation = {
          recurringInvoiceId: new ObjectId(id),
          invoiceId: invoiceResult.insertedId,
          installmentNumber,
          scheduledDate: recurringInvoice.nextInvoiceDate || invoiceDate,
          generatedDate: new Date(),
          status: 'generated',
          amount,
          notes: body.notes
        };

        await relationCollection.insertOne(newRelation, { session });

        // 定期請求書の情報を更新
        const updateFields: Partial<RecurringInvoice> = {
          completedInstallments: installmentNumber,
          remainingInstallments: recurringInvoice.totalInstallments - installmentNumber,
          totalInvoicedAmount: recurringInvoice.totalInvoicedAmount + amount,
          lastInvoiceDate: invoiceDate,
          updatedAt: new Date()
        };

        // 次回請求日の計算
        if (installmentNumber < recurringInvoice.totalInstallments) {
          const nextDate = new Date(invoiceDate);
          
          switch (recurringInvoice.frequency) {
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'bi-monthly':
              nextDate.setMonth(nextDate.getMonth() + 2);
              break;
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3);
              break;
            case 'semi-annually':
              nextDate.setMonth(nextDate.getMonth() + 6);
              break;
            case 'annually':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            case 'custom':
              if (recurringInvoice.customFrequencyDays) {
                nextDate.setDate(nextDate.getDate() + recurringInvoice.customFrequencyDays);
              }
              break;
          }
          
          updateFields.nextInvoiceDate = nextDate;
        } else {
          // 全ての請求書が生成された場合
          updateFields.status = 'completed';
          updateFields.completedAt = new Date();
          updateFields.nextInvoiceDate = undefined;
        }

        await recurringCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields },
          { session }
        );

        console.log(sanitizeLog({
          message: 'Generated invoice from recurring invoice',
          recurringInvoiceId: id,
          invoiceId: invoiceResult.insertedId,
          invoiceNumber,
          installmentNumber
        }));
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({
      message: 'Invoice generated successfully',
      invoiceNumber,
      installmentNumber,
      totalInstallments: recurringInvoice.totalInstallments
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating invoice:', sanitizeLog({ error }));
    return handleStandardizedError(error);
  }
}