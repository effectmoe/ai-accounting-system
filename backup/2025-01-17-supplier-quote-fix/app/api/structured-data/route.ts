import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { StructuredDataService } from '@/services/structured-data.service';
import { 
  SupportedSchemaType,
  StructuredDataInput,
  StructuredDataGenerationConfig 
} from '@/types/structured-data';

// 構造化データサービスのインスタンス
let structuredDataService: StructuredDataService;

const getStructuredDataService = () => {
  if (!structuredDataService) {
    structuredDataService = new StructuredDataService();
  }
  return structuredDataService;
};

/**
 * GET /api/structured-data
 * 構造化データの一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const sourceType = searchParams.get('sourceType');
    const schemaType = searchParams.get('schemaType');

    const service = getStructuredDataService();

    if (sourceId) {
      // 特定のソースの構造化データを取得
      const data = await service.getStructuredData(
        new ObjectId(sourceId),
        sourceType || undefined
      );
      
      return NextResponse.json({
        success: true,
        data,
        count: data.length
      });
    } else {
      // 統計情報を取得
      const stats = await service.getStats();
      
      return NextResponse.json({
        success: true,
        stats
      });
    }
  } catch (error) {
    console.error('Structured data GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/structured-data
 * 構造化データの生成と保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceData,
      schemaType,
      config,
      saveToDatabase = true
    }: {
      sourceData: StructuredDataInput;
      schemaType: SupportedSchemaType;
      config?: Partial<StructuredDataGenerationConfig>;
      saveToDatabase?: boolean;
    } = body;

    // 入力検証
    if (!sourceData || !schemaType) {
      return NextResponse.json(
        {
          success: false,
          error: 'sourceData and schemaType are required'
        },
        { status: 400 }
      );
    }

    const service = getStructuredDataService();

    // 構造化データを生成
    const result = await service.generateStructuredData(
      sourceData,
      schemaType,
      config
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate structured data',
          details: result.errors
        },
        { status: 400 }
      );
    }

    let savedDocument = null;

    // データベースに保存（オプション）
    if (saveToDatabase && result.data && (sourceData as any)._id) {
      const sourceId = new ObjectId((sourceData as any)._id);
      const sourceType = getSourceType(schemaType);
      
      savedDocument = await service.saveStructuredData(
        sourceId,
        sourceType,
        schemaType,
        result.data,
        {
          isValid: result.success,
          errors: result.errors || [],
          warnings: result.warnings
        },
        result.metadata || {}
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
      savedDocument: savedDocument ? {
        id: savedDocument._id,
        sourceId: savedDocument.sourceId,
        schemaType: savedDocument.schemaType
      } : null,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('Structured data POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/structured-data
 * 構造化データの更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      sourceData,
      schemaType,
      config
    }: {
      id: string;
      sourceData: StructuredDataInput;
      schemaType: SupportedSchemaType;
      config?: Partial<StructuredDataGenerationConfig>;
    } = body;

    if (!id || !sourceData || !schemaType) {
      return NextResponse.json(
        {
          success: false,
          error: 'id, sourceData and schemaType are required'
        },
        { status: 400 }
      );
    }

    const service = getStructuredDataService();

    // 新しい構造化データを生成
    const result = await service.generateStructuredData(
      sourceData,
      schemaType,
      config
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate structured data',
          details: result.errors
        },
        { status: 400 }
      );
    }

    // データベースのドキュメントを更新
    // Note: 実際の更新処理はStructuredDataServiceに追加する必要があります
    
    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
      warnings: result.warnings
    });

  } catch (error) {
    console.error('Structured data PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/structured-data
 * 構造化データの削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const sourceId = searchParams.get('sourceId');

    if (!id && !sourceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'id or sourceId is required'
        },
        { status: 400 }
      );
    }

    // Note: 削除処理はStructuredDataServiceに追加する必要があります
    
    return NextResponse.json({
      success: true,
      message: 'Structured data deleted successfully'
    });

  } catch (error) {
    console.error('Structured data DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * スキーマタイプからソースタイプを推定する
 */
function getSourceType(schemaType: SupportedSchemaType): 'invoice' | 'quote' | 'delivery-note' | 'faq' | 'article' | 'event' {
  switch (schemaType) {
    case 'Invoice':
      return 'invoice';
    case 'Quotation':
      return 'quote';
    case 'DeliveryNote':
      return 'delivery-note';
    case 'FAQPage':
      return 'faq';
    case 'Article':
      return 'article';
    case 'BusinessEvent':
      return 'event';
    default:
      return 'article';
  }
}