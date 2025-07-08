import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // 環境変数チェック
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (!useAzureMongoDB) {
      return NextResponse.json({
        success: false,
        error: 'MongoDB is not enabled. Use legacy system.'
      }, { status: 400 });
    }

    const body = await request.json();
    const {
      companyId,
      date,
      description,
      debitAccount,
      creditAccount,
      amount,
      taxAmount,
      taxRate,
      isTaxIncluded,
      documentId
    } = body;

    // 仕訳番号を生成（簡易版）
    const journalCount = await db.count('journals', { companyId });
    const journalNumber = `J${new Date().getFullYear()}${String(journalCount + 1).padStart(5, '0')}`;

    // 仕訳データを作成
    const journalEntry = {
      companyId,
      journalNumber,
      entryDate: new Date(date),
      description,
      status: 'confirmed',
      sourceType: 'ocr',
      sourceDocumentId: documentId ? new ObjectId(documentId) : null,
      lines: [
        {
          accountCode: '605', // 仮の勘定科目コード
          accountName: debitAccount,
          debitAmount: amount,
          creditAmount: 0,
          taxRate,
          taxAmount,
          isTaxIncluded
        },
        {
          accountCode: '100', // 仮の勘定科目コード（現金）
          accountName: creditAccount,
          debitAmount: 0,
          creditAmount: amount,
          taxRate: 0,
          taxAmount: 0,
          isTaxIncluded: false
        }
      ],
      totalDebit: amount,
      totalCredit: amount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // MongoDBに保存
    const savedJournal = await db.create('journals', journalEntry);

    // 関連ドキュメントを更新（存在する場合）
    if (documentId) {
      await db.update('documents', documentId, {
        status: 'journalized',
        journalId: savedJournal._id,
        updatedAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      journal: {
        id: savedJournal._id.toString(),
        journalNumber,
        ...journalEntry
      }
    });

  } catch (error) {
    console.error('Journal creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create journal entry'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Journal Creation API',
    method: 'POST',
    fields: {
      companyId: 'required',
      date: 'required',
      description: 'required',
      debitAccount: 'required',
      creditAccount: 'required',
      amount: 'required',
      taxAmount: 'optional',
      taxRate: 'optional',
      isTaxIncluded: 'optional',
      documentId: 'optional'
    }
  });
}

// Node.js Runtimeを使用
export const runtime = 'nodejs';