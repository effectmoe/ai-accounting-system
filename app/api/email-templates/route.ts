import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

interface EmailTemplate {
  documentType: 'invoice' | 'quote' | 'delivery-note';
  subject: string;
  body: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// GET: メールテンプレートを取得
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const collection = db.collection('email_templates');
    
    // 既存のテンプレートを取得
    const templates = await collection.find({}).toArray();
    
    logger.debug('Fetched email templates:', templates.length);
    
    return NextResponse.json({
      success: true,
      templates: templates.map(template => ({
        documentType: template.documentType,
        subject: template.subject,
        body: template.body,
      })),
    });
  } catch (error) {
    logger.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

// POST: メールテンプレートを保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templates } = body;
    
    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { error: 'Invalid templates data' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const collection = db.collection('email_templates');
    
    // 既存のテンプレートを削除して新しいテンプレートを保存
    // （より洗練された方法としては、個別に更新することも可能）
    const now = new Date();
    
    for (const template of templates) {
      await collection.replaceOne(
        { documentType: template.documentType },
        {
          ...template,
          updatedAt: now,
          createdAt: now, // 新規作成の場合
        },
        { upsert: true }
      );
    }
    
    logger.info('Email templates saved successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Templates saved successfully',
    });
  } catch (error) {
    logger.error('Error saving email templates:', error);
    return NextResponse.json(
      { error: 'Failed to save email templates' },
      { status: 500 }
    );
  }
}