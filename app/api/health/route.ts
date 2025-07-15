import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 環境変数の確認
    const azureEndpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
    const azureKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
    const mongoUri = process.env.MONGODB_URI;
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB;

    const status = {
      timestamp: new Date().toISOString(),
      system: 'AAM Accounting Automation',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // 設定状況
      configuration: {
        useAzureMongoDB: useAzureMongoDB === 'true',
        azureFormRecognizer: {
          configured: !!(azureEndpoint && azureKey),
          endpoint: azureEndpoint ? 'configured' : 'missing',
        },
        mongodb: {
          configured: !!mongoUri,
          atlas: mongoUri?.includes('mongodb+srv://') || false,
        }
      },
      
      // システム状態
      services: {
        webServer: 'healthy',
        // Azure Form Recognizer の簡単な疎通確認は省略（APIコールが必要なため）
        azureFormRecognizer: azureEndpoint && azureKey ? 'configured' : 'not_configured',
        mongodb: mongoUri ? 'configured' : 'not_configured',
      }
    };

    // MongoDB接続テスト（新システムが有効な場合のみ）
    if (useAzureMongoDB === 'true' && mongoUri) {
      try {
        const { checkConnection } = await import('@/lib/mongodb-client');
        const isMongoConnected = await checkConnection();
        status.services.mongodb = isMongoConnected ? 'healthy' : 'unhealthy';
      } catch (error) {
        status.services.mongodb = 'error';
      }
    }

    const httpStatus = Object.values(status.services).every(s => 
      s === 'healthy' || s === 'configured'
    ) ? 200 : 503;

    return NextResponse.json(status, { status: httpStatus });
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  // ヘルスチェック用の軽量エンドポイント
  return new NextResponse(null, { status: 200 });
}