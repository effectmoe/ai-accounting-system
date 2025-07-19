import { NextRequest, NextResponse } from 'next/server';
import { StructuredDataService } from '@/services/structured-data.service';
import { logger } from '@/lib/logger';
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
 * POST /api/structured-data/generate
 * 構造化データの生成（保存なし）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceData,
      schemaType,
      config,
      validateOnly = false
    }: {
      sourceData: StructuredDataInput;
      schemaType: SupportedSchemaType;
      config?: Partial<StructuredDataGenerationConfig>;
      validateOnly?: boolean;
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

    // サポートされているスキーマタイプかチェック
    const supportedTypes: SupportedSchemaType[] = [
      'Invoice', 'Quotation', 'DeliveryNote', 'FAQPage', 
      'Article', 'BusinessEvent', 'Organization', 'Person'
    ];

    if (!supportedTypes.includes(schemaType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported schema type: ${schemaType}. Supported types: ${supportedTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    const service = getStructuredDataService();

    if (validateOnly) {
      // バリデーションのみ実行
      const tempData = await service.generateStructuredData(
        sourceData,
        schemaType,
        config
      );

      if (!tempData.success) {
        return NextResponse.json({
          success: false,
          validation: {
            isValid: false,
            errors: tempData.errors || ['Generation failed']
          },
          error: 'Validation failed'
        });
      }

      const validationResult = service.validateSchema(tempData.data, schemaType);

      return NextResponse.json({
        success: true,
        validation: validationResult,
        metadata: tempData.metadata
      });
    }

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
          details: result.errors,
          metadata: result.metadata
        },
        { status: 400 }
      );
    }

    // JSON-LD形式での出力
    const jsonLdOutput = {
      '@context': result.data?.['@context'] || 'https://schema.org',
      ...result.data
    };

    return NextResponse.json({
      success: true,
      data: result.data,
      jsonLd: jsonLdOutput,
      metadata: result.metadata,
      warnings: result.warnings,
      validation: {
        isValid: true,
        errors: []
      }
    });

  } catch (error) {
    logger.error('Structured data generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/structured-data/generate
 * サポートされているスキーマタイプとオプションの取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schemaType = searchParams.get('schemaType') as SupportedSchemaType;

    const supportedTypes: SupportedSchemaType[] = [
      'Invoice', 'Quotation', 'DeliveryNote', 'FAQPage', 
      'Article', 'BusinessEvent', 'Organization', 'Person'
    ];

    const schemaInfo = {
      'Invoice': {
        description: '請求書のSchema.org構造化データ',
        requiredFields: ['invoiceNumber', 'customerId', 'totalAmount', 'dueDate'],
        optionalFields: ['items', 'bankAccount', 'notes'],
        example: {
          invoiceNumber: 'INV-2025-001',
          customerId: '507f1f77bcf86cd799439011',
          totalAmount: 10800,
          dueDate: '2025-01-31'
        }
      },
      'Quotation': {
        description: '見積書のSchema.org構造化データ',
        requiredFields: ['quoteNumber', 'customerId', 'totalAmount', 'validityDate'],
        optionalFields: ['items', 'bankAccount', 'notes'],
        example: {
          quoteNumber: 'QUO-2025-001',
          customerId: '507f1f77bcf86cd799439011',
          totalAmount: 10800,
          validityDate: '2025-02-28'
        }
      },
      'DeliveryNote': {
        description: '納品書のSchema.org構造化データ',
        requiredFields: ['deliveryNoteNumber', 'customerId', 'deliveryDate'],
        optionalFields: ['items', 'deliveryLocation', 'deliveryMethod'],
        example: {
          deliveryNoteNumber: 'DEL-2025-001',
          customerId: '507f1f77bcf86cd799439011',
          deliveryDate: '2025-01-20'
        }
      },
      'FAQPage': {
        description: 'FAQ記事のSchema.org構造化データ',
        requiredFields: ['question', 'answer'],
        optionalFields: ['category', 'tags', 'usageStats'],
        example: {
          question: '消費税の計算方法は？',
          answer: '消費税は商品価格に税率を掛けて計算します。'
        }
      },
      'Article': {
        description: '記事のSchema.org構造化データ',
        requiredFields: ['title', 'content', 'authorName'],
        optionalFields: ['publishedDate', 'tags', 'category'],
        example: {
          title: '税制改正のお知らせ',
          content: '2025年度の税制改正について...',
          authorName: 'Tax Expert'
        }
      },
      'BusinessEvent': {
        description: 'ビジネスイベントのSchema.org構造化データ',
        requiredFields: ['name', 'startDate'],
        optionalFields: ['description', 'location', 'organizer'],
        example: {
          name: '税務セミナー',
          startDate: '2025-02-15T10:00:00+09:00'
        }
      },
      'Organization': {
        description: '組織・会社のSchema.org構造化データ',
        requiredFields: ['companyName'],
        optionalFields: ['email', 'phone', 'website', 'address1'],
        example: {
          companyName: '株式会社サンプル'
        }
      },
      'Person': {
        description: '人物のSchema.org構造化データ',
        requiredFields: ['companyName'],
        optionalFields: ['email', 'contacts'],
        example: {
          companyName: '山田太郎'
        }
      }
    };

    if (schemaType) {
      // 特定のスキーマタイプの情報を返す
      if (!supportedTypes.includes(schemaType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported schema type: ${schemaType}`
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        schemaType,
        info: schemaInfo[schemaType] || null,
        defaultConfig: {
          includeCompanyInfo: true,
          includeCustomerInfo: true,
          includeTaxInfo: true,
          includeLineItems: true,
          language: 'ja',
          context: 'https://schema.org'
        }
      });
    }

    // すべてのサポートされているスキーマタイプを返す
    return NextResponse.json({
      success: true,
      supportedTypes,
      schemaInfo,
      defaultConfig: {
        includeCompanyInfo: true,
        includeCustomerInfo: true,
        includeTaxInfo: true,
        includeLineItems: true,
        language: 'ja',
        context: 'https://schema.org'
      }
    });

  } catch (error) {
    logger.error('Schema info error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}