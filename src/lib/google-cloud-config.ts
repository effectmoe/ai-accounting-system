// Google Cloud Vision API設定
export const googleCloudConfig = {
  // Google Cloud Projectの設定
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  
  // 認証情報の設定方法:
  // 1. サービスアカウントキーファイルを使用する場合
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  
  // 2. 環境変数に直接キーを設定する場合
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ? 
    JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined,
  
  // Vision APIの設定
  vision: {
    // APIのエンドポイント（通常はデフォルトで問題ない）
    apiEndpoint: process.env.GOOGLE_VISION_API_ENDPOINT || 'vision.googleapis.com',
    
    // リクエストの設定
    maxResults: 50, // テキスト検出の最大結果数
    
    // 言語ヒント
    languageHints: ['ja', 'en'], // 日本語と英語
    
    // OCRの詳細設定
    imageContext: {
      languageHints: ['ja', 'en'],
      textDetectionParams: {
        enableTextDetectionConfidenceScore: true,
      }
    }
  }
};

// Google Cloud Vision APIを使用するための手順:
// 
// 1. Google Cloud Consoleでプロジェクトを作成
//    https://console.cloud.google.com/
//
// 2. Vision APIを有効化
//    - APIとサービス > ライブラリ > Cloud Vision API を検索して有効化
//
// 3. サービスアカウントの作成と認証
//    - IAMと管理 > サービスアカウント > サービスアカウントを作成
//    - 必要な権限: Cloud Vision API User
//    - キーを作成（JSON形式）してダウンロード
//
// 4. 環境変数の設定（.envファイルに追加）:
//    GOOGLE_CLOUD_PROJECT_ID=your-project-id
//    GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
//    
//    または
//    
//    GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"..."}
//
// 5. 必要なパッケージのインストール:
//    npm install @google-cloud/vision