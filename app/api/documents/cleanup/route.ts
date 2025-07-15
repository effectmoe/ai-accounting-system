import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db('accounting');
    
    // 不完全なデータを検索（undefinedやNaNを含むデータ）
    const invalidDocs = await db.collection('documents').find({
      $or: [
        { document_number: { $regex: 'undefined' } },
        { partner_name: null },
        { total_amount: null }
      ]
    }).toArray();

    if (invalidDocs && invalidDocs.length > 0) {
      // 関連する明細を削除
      const docIds = invalidDocs.map(doc => doc._id);
      
      await db.collection('document_items').deleteMany({
        document_id: { $in: docIds }
      });

      // 文書本体を削除
      await db.collection('documents').deleteMany({
        _id: { $in: docIds }
      });

      return NextResponse.json({
        message: `${invalidDocs.length}件の不完全なデータを削除しました`,
        deleted: invalidDocs
      });
    }

    return NextResponse.json({
      message: '削除対象のデータがありません'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'クリーンアップに失敗しました' },
      { status: 500 }
    );
  }
}