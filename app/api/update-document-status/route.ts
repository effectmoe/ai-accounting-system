import { NextRequest, NextResponse } from 'next/server';
import { vercelDb } from '@/lib/mongodb-client';

export async function POST(request: NextRequest) {
  try {
    // MongoDBを使用してステータスを更新
    const filter = { status: 'sent' };
    const update = { 
      $set: { 
        status: 'confirmed',
        updatedAt: new Date()
      }
    };

    const result = await vercelDb.updateMany('documents', filter, update);

    if (!result || result.modifiedCount === undefined) {
      console.error('Update failed: No result returned');
      return NextResponse.json(
        { error: 'ステータス更新に失敗しました', details: 'No result returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
      message: `${result.modifiedCount} 件の文書のステータスを更新しました`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}