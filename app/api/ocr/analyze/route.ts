import { NextRequest, NextResponse } from 'next/server';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { OCRAIOrchestrator } from '@/lib/ocr-ai-orchestrator';

export async function POST(request: NextRequest) {
  try {
    console.log('[OCR API] Starting OCR analysis...');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string || 'invoice';
    const companyId = formData.get('companyId') as string || '11111111-1111-1111-1111-111111111111';
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }
    
    // Azure Form Recognizerで基本的なOCR処理
    let azureOcrResult;
    
    if (process.env.AZURE_FORM_RECOGNIZER_ENDPOINT && process.env.AZURE_FORM_RECOGNIZER_KEY) {
      console.log('[OCR API] Using Azure Form Recognizer...');
      
      const client = new DocumentAnalysisClient(
        process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
        new AzureKeyCredential(process.env.AZURE_FORM_RECOGNIZER_KEY)
      );
      
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);
      
      // documentTypeに応じてモデルを選択
      const modelId = documentType === 'supplier-quote' ? 'prebuilt-invoice' : 'prebuilt-invoice';
      
      const poller = await client.beginAnalyzeDocument(modelId, uint8Array);
      azureOcrResult = await poller.pollUntilDone();
      
      console.log('[OCR API] Azure Form Recognizer completed');
    } else {
      console.log('[OCR API] Azure Form Recognizer not configured, using mock data');
      azureOcrResult = {
        content: 'Mock OCR result for testing',
        pages: [
          {
            pageNumber: 1,
            lines: [
              { content: '合同会社アソウタイセイプリンティング' },
              { content: '株式会社CROP御中' },
              { content: '件名: 印刷物' },
              { content: '領収書（3枚複写・1冊50組）' },
              { content: '数量: 1' },
              { content: '単価: 5,000' },
              { content: '金額: 5,000' },
              { content: '小計: 5,000' },
              { content: '消費税: 500' },
              { content: '合計: 5,500' }
            ]
          }
        ],
        fields: {},
        tables: []
      };
    }
    
    // AI駆動のOCRオーケストレーター を使用
    console.log('[OCR API] Starting AI-driven orchestration...');
    
    const orchestrator = new OCRAIOrchestrator();
    
    const structuredData = await orchestrator.orchestrateOCRResult({
      ocrResult: azureOcrResult,
      documentType: documentType as 'invoice' | 'supplier-quote' | 'receipt',
      companyId: companyId
    });
    
    console.log('[OCR API] AI orchestration completed successfully');
    
    return NextResponse.json({
      success: true,
      data: structuredData,
      message: 'DeepSeek AI駆動のOCR解析が完了しました',
      processingMethod: 'DeepSeek-AI-driven',
      model: 'deepseek-coder'
    });
    
  } catch (error) {
    console.error('[OCR API] Error:', error);
    
    return NextResponse.json(
      {
        error: 'DeepSeek OCR解析中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingMethod: 'DeepSeek-AI-driven (failed)'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'DeepSeek OCR Analyze',
    method: 'POST',
    description: 'DeepSeek AI駆動のOCR解析エンドポイント',
    supportedDocumentTypes: ['invoice', 'supplier-quote', 'receipt'],
    model: 'deepseek-coder',
    features: [
      '日本語ビジネス文書の高精度解析',
      '合同会社アソウタイセイプリンティング等の企業名正確認識',
      '御中・様による顧客・仕入先自動判別',
      '商品明細の構造化抽出',
      '金額計算の自動検証'
    ],
    timestamp: new Date().toISOString()
  });
}