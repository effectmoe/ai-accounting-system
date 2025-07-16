import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('[FAQ Delete API] Starting deletion for ID:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      console.error('[FAQ Delete API] Invalid FAQ ID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid FAQ ID format' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('accounting-app');

    // Delete from faq collection
    const faqResult = await db.collection('faq').deleteOne({
      _id: new ObjectId(id)
    });

    console.log('[FAQ Delete API] FAQ deletion result:', faqResult);

    // Delete from faq_articles collection
    const articleResult = await db.collection('faq_articles').deleteOne({
      faqId: id
    });

    console.log('[FAQ Delete API] FAQ article deletion result:', articleResult);

    if (faqResult.deletedCount === 0) {
      console.warn('[FAQ Delete API] FAQ not found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    console.log('[FAQ Delete API] Successfully deleted FAQ and article');
    return NextResponse.json({
      success: true,
      deletedFaq: faqResult.deletedCount,
      deletedArticle: articleResult.deletedCount
    });
  } catch (error) {
    console.error('[FAQ Delete API] Error deleting FAQ:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete FAQ' 
      },
      { status: 500 }
    );
  }
}