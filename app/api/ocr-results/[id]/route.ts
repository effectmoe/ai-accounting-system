import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid OCR result ID' },
        { status: 400 }
      );
    }

    // MongoDBからOCR結果を取得
    const database = await db;
    const collection = database.collection('ocr_results');
    const ocrResult = await collection.findOne({ _id: new ObjectId(id) });

    if (!ocrResult) {
      return NextResponse.json(
        { error: 'OCR結果が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ocrResult
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid OCR result ID' },
        { status: 400 }
      );
    }

    // MongoDBからOCR結果（ドキュメント）を削除
    const database = await db;
    const collection = database.collection('documents');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (!result) {
      return NextResponse.json(
        { error: 'OCR結果が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OCR結果を削除しました'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}