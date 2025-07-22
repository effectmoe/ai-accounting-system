import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // ドキュメントを取得（生のデータ）
    const document = await db.findById('documents', id);
    
    if (!document) {
      return NextResponse.json({
        error: 'Document not found'
      }, { status: 404 });
    }

    // すべてのフィールドを表示
    return NextResponse.json({
      _id: document._id,
      allFields: Object.entries(document).map(([key, value]) => ({
        key,
        value: value?.toString ? value.toString() : value,
        type: typeof value
      })),
      rawDocument: document
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch document'
    }, { status: 500 });
  }
}