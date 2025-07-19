import { NextRequest, NextResponse } from 'next/server';
import { KnowledgeService } from '@/services/knowledge.service';
import { StructuredDataService } from '@/services/structured-data.service';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const knowledgeService = new KnowledgeService();
  
  try {
    const { id } = params;
    logger.debug('[FAQ Delete API] Starting deletion for ID:', id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      logger.error('[FAQ Delete API] Invalid FAQ ID format:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid FAQ ID format' },
        { status: 400 }
      );
    }

    await knowledgeService.connect();

    // Delete from faq_articles collection
    const faqArticlesResult = await knowledgeService.db.collection('faq_articles').deleteOne({
      _id: new ObjectId(id)
    });

    logger.debug('[FAQ Delete API] FAQ articles deletion result:', faqArticlesResult);

    // Also try to delete from old faq collection
    const faqResult = await knowledgeService.db.collection('faq').deleteOne({
      _id: new ObjectId(id)
    });

    logger.debug('[FAQ Delete API] FAQ deletion result:', faqResult);

    // Delete associated structured data
    try {
      const structuredDataService = new StructuredDataService();
      const structuredDataCollection = structuredDataService.db.collection('structuredData');
      const structuredDataResult = await structuredDataCollection.deleteMany({
        sourceId: new ObjectId(id),
        sourceType: 'faq'
      });
      logger.debug('[FAQ Delete API] Structured data deletion result:', structuredDataResult);
      await structuredDataService.close();
    } catch (structuredError) {
      logger.error('[FAQ Delete API] Error deleting structured data:', structuredError);
      // Continue with FAQ deletion even if structured data deletion fails
    }

    await knowledgeService.disconnect();

    if (faqArticlesResult.deletedCount === 0 && faqResult.deletedCount === 0) {
      logger.warn('[FAQ Delete API] FAQ not found with ID:', id);
      return NextResponse.json(
        { success: false, error: 'FAQ not found' },
        { status: 404 }
      );
    }

    logger.debug('[FAQ Delete API] Successfully deleted FAQ and associated data');
    return NextResponse.json({
      success: true,
      deletedFaqArticle: faqArticlesResult.deletedCount,
      deletedFaq: faqResult.deletedCount
    });
  } catch (error) {
    logger.error('[FAQ Delete API] Error deleting FAQ:', error);
    await knowledgeService.disconnect();
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete FAQ' 
      },
      { status: 500 }
    );
  }
}