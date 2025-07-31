import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { RecurringInvoicePaymentHistory } from '@/types/recurring-invoice';
import { sanitizeLog } from '@/lib/log-sanitizer';
import { handleStandardizedError, ValidationError } from '@/lib/standardized-error-handler';

// GET: 定期請求書の支払い履歴を取得
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

    // 定期請求書の存在確認
    const recurringInvoice = await db.collection('recurringInvoices').findOne({
      _id: new ObjectId(id)
    });

    if (!recurringInvoice) {
      return NextResponse.json(
        { error: 'Recurring invoice not found' },
        { status: 404 }
      );
    }

    // 支払い履歴の取得（関連する請求書と支払い情報を結合）
    const paymentHistory = await db.collection('recurringInvoiceRelations').aggregate([
      {
        $match: {
          recurringInvoiceId: new ObjectId(id)
        }
      },
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoiceId',
          foreignField: '_id',
          as: 'invoice'
        }
      },
      {
        $unwind: {
          path: '$invoice',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'payments',
          let: { invoiceId: '$invoiceId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$invoiceId', '$$invoiceId'] }
              }
            },
            { $sort: { paymentDate: -1 } },
            { $limit: 1 }
          ],
          as: 'payment'
        }
      },
      {
        $unwind: {
          path: '$payment',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          recurringInvoiceId: 1,
          invoiceId: 1,
          installmentNumber: 1,
          invoiceNumber: '$invoice.invoiceNumber',
          dueDate: '$invoice.dueDate',
          amount: 1,
          paidAmount: { $ifNull: ['$payment.amount', 0] },
          paidDate: '$payment.paymentDate',
          paymentMethod: '$payment.paymentMethod',
          status: '$invoice.paymentStatus',
          notes: 1,
          createdAt: '$generatedDate'
        }
      },
      {
        $sort: { installmentNumber: 1 }
      }
    ]).toArray();

    // 支払い履歴の集計情報
    const summary = {
      totalInvoices: paymentHistory.length,
      paidInvoices: paymentHistory.filter(h => h.status === 'paid').length,
      unpaidInvoices: paymentHistory.filter(h => h.status === 'unpaid').length,
      overdueInvoices: paymentHistory.filter(h => h.status === 'overdue').length,
      totalAmount: paymentHistory.reduce((sum, h) => sum + (h.amount || 0), 0),
      totalPaidAmount: paymentHistory.reduce((sum, h) => sum + (h.paidAmount || 0), 0),
      paymentRate: paymentHistory.length > 0 ? 
        (paymentHistory.filter(h => h.status === 'paid').length / paymentHistory.length) * 100 : 0
    };

    console.log(sanitizeLog({
      message: 'Fetched payment history',
      recurringInvoiceId: id,
      historyCount: paymentHistory.length
    }));

    return NextResponse.json({
      paymentHistory,
      summary
    });
  } catch (error) {
    console.error('Error fetching payment history:', sanitizeLog({ error }));
    return handleStandardizedError(error);
  }
}