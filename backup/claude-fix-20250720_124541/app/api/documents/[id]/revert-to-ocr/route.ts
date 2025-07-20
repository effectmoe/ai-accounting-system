import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const documentId = params.id;
    const body = await request.json();
    const { journalId, sourceDocumentId } = body;

    logger.debug('Reverting to OCR:', {
      documentId,
      journalId,
      sourceDocumentId
    });

    // 1. 仕訳伝票を削除
    if (journalId) {
      await db.delete('journals', journalId);
      logger.debug('Deleted journal:', journalId);
    }

    // 2. 作成済み文書（仕訳伝票ドキュメント）を削除
    await db.delete('documents', documentId);
    logger.debug('Deleted journal document:', documentId);

    // 3. 元のOCRドキュメントを復元（hiddenFromListフラグを削除）
    if (sourceDocumentId) {
      // sourceDocumentIdをObjectIdに変換
      const sourceObjectId = ObjectId.isValid(sourceDocumentId) 
        ? new ObjectId(sourceDocumentId) 
        : sourceDocumentId;
      
      logger.debug('Converting sourceDocumentId:', {
        original: sourceDocumentId,
        converted: sourceObjectId,
        isValid: ObjectId.isValid(sourceDocumentId)
      });
      
      const updateResult = await db.update('documents', sourceObjectId, {
        status: 'pending',
        journalId: null,
        hiddenFromList: false,
        updatedAt: new Date()
      });
      
      logger.debug('Update result:', updateResult);
      logger.debug('Restored original OCR document:', sourceObjectId);
    } else {
      logger.debug('WARNING: No sourceDocumentId provided, cannot restore original OCR document');
    }

    return NextResponse.json({
      success: true,
      message: 'OCR結果に戻しました'
    });

  } catch (error) {
    logger.error('Revert to OCR error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'OCR結果への復元に失敗しました'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';