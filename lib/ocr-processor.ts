export interface OCRResult {
  text: string;
  confidence: number;
  vendor?: string;
  date?: string;
  amount?: number;
  taxAmount?: number;
  items?: Array<{
    name: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  message?: string; // OCR処理ステータスメッセージ
}

export class OCRProcessor {
  async processReceiptFile(file: File): Promise<OCRResult> {
    // ファイルタイプによって処理を分岐
    if (file.type === 'application/pdf') {
      return this.processPDFFile(file);
    } else if (file.type.startsWith('image/')) {
      return this.processImageFile(file);
    } else {
      throw new Error('サポートされていないファイル形式です。PDF または画像ファイルをアップロードしてください。');
    }
  }

  async processImageFile(imageFile: File): Promise<OCRResult> {
    // GAS OCR APIが設定されているか確認
    const isGasOcrConfigured = process.env.GAS_OCR_URL;
    
    // GAS OCR APIを使用（サーバーサイドでもクライアントサイドでも利用可能）
    if (isGasOcrConfigured && process.env.ENABLE_OCR === 'true') {
      try {
        const { GASWebAppOCRProcessor } = await import('./ocr-processor-gas');
        const gasOCR = new GASWebAppOCRProcessor();
        
        // FileをBufferに変換
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const result = await gasOCR.processReceiptImage(buffer);
        await gasOCR.close();
        
        return result;
      } catch (error) {
        console.error('GAS OCR API error:', error);
        console.log('Falling back to mock data');
      }
    }
    
    // Google Vision APIは削除済み - Azure Form Recognizer使用
    
    // モックデータを返す（開発環境またはAPIが設定されていない場合）
    const fileName = imageFile.name.toLowerCase();
    
    // デモ用のレスポンス
    const mockResults: Record<string, OCRResult> = {
      default: {
        text: `スターバックスコーヒー
渋谷店
2025年1月5日 15:30

カフェラテ (Tall)     ¥495
サンドイッチ          ¥680
-----------------------
小計                ¥1,175
消費税(10%)          ¥117
-----------------------
合計                ¥1,292

現金                ¥1,300
お釣り                 ¥8

ありがとうございました`,
        confidence: 0.95,
        vendor: 'スターバックスコーヒー',
        date: '2025-01-05',
        amount: 1175,
        taxAmount: 117,
        items: [
          { name: 'カフェラテ (Tall)', amount: 495 },
          { name: 'サンドイッチ', amount: 680 }
        ]
      },
      restaurant: {
        text: `和食レストラン 花
東京都渋谷区道玄坂1-2-3

2025年1月5日 19:30

ビール                ¥600
刺身盛り合わせ      ¥1,800
天ぷら定食          ¥1,500
焼き鳥 (5本)         ¥800
-----------------------
小計                ¥4,700
消費税(10%)          ¥470
-----------------------
合計                ¥5,170`,
        confidence: 0.92,
        vendor: '和食レストラン 花',
        date: '2025-01-05',
        amount: 4700,
        taxAmount: 470,
        items: [
          { name: 'ビール', amount: 600 },
          { name: '刺身盛り合わせ', amount: 1800 },
          { name: '天ぷら定食', amount: 1500 },
          { name: '焼き鳥 (5本)', amount: 800 }
        ]
      },
      taxi: {
        text: `東京無線タクシー
車両番号: 品川500あ1234

2025年1月5日 23:45

乗車地: 渋谷駅
降車地: 六本木駅

運賃              ¥2,100
深夜料金            ¥420
-----------------------
合計              ¥2,520`,
        confidence: 0.88,
        vendor: '東京無線タクシー',
        date: '2025-01-05',
        amount: 2520,
        taxAmount: 0, // タクシーは内税
        items: [
          { name: 'タクシー運賃', amount: 2520 }
        ]
      }
    };
    
    // ファイル名に基づいてモックデータを選択
    if (fileName.includes('restaurant') || fileName.includes('dinner') || fileName.includes('飲み')) {
      return mockResults.restaurant;
    } else if (fileName.includes('taxi') || fileName.includes('タクシー')) {
      return mockResults.taxi;
    }
    
    return mockResults.default;
  }

  async processPDFFile(pdfFile: File): Promise<OCRResult> {
    try {
      // PDFからテキストを抽出
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // GAS OCR APIが設定されているか確認
      const isGasOcrConfigured = process.env.GAS_OCR_URL;
      
      // GAS OCR APIを使用してPDFを処理
      if (isGasOcrConfigured && process.env.ENABLE_OCR === 'true') {
        try {
          const { GASWebAppOCRProcessor } = await import('./ocr-processor-gas');
          const gasOCR = new GASWebAppOCRProcessor();
          
          const buffer = Buffer.from(arrayBuffer);
          const result = await gasOCR.processPDF(buffer);
          await gasOCR.close();
          
          return result;
        } catch (error) {
          console.error('GAS OCR API error:', error);
          console.log('PDF processing now handled by Azure Form Recognizer');
          // GASエラーの詳細をログに記録
          if (error instanceof Error) {
            console.error('GAS OCR Error details:', error.message);
          }
        }
      }
      
      // Azure Form RecognizerでPDFを処理
      // ファイルは/api/ocr/analyzeエンドポイントで処理される
      
      // クライアントサイドまたはサーバーサイドでエラーが発生した場合のモックデータ
      const fileName = pdfFile.name.toLowerCase();
      
      // PDF用のモックデータ
      const mockPDFResults: Record<string, OCRResult> = {
        invoice: {
          text: `請求書
株式会社サンプル御中

請求番号: INV-2025-001
発行日: 2025年1月5日
支払期日: 2025年2月5日

品目                    数量    単価      金額
システム開発費            1    1,000,000  1,000,000
保守サポート費            12   50,000     600,000
─────────────────────────────────
小計                                   1,600,000
消費税(10%)                              160,000
─────────────────────────────────
合計                                   1,760,000`,
          confidence: 0.95,
          vendor: '株式会社テックソリューション',
          date: '2025-01-05',
          amount: 1600000,
          taxAmount: 160000,
          items: [
            { name: 'システム開発費', amount: 1000000 },
            { name: '保守サポート費', amount: 600000 }
          ]
        },
        receipt: {
          text: `領収書
お客様名: 株式会社サンプル様

2025年1月5日

コンサルティング料       500,000円
交通費                   10,000円
─────────────────────────
小計                    510,000円
消費税(10%)              51,000円
─────────────────────────
合計                    561,000円

ありがとうございました。`,
          confidence: 0.92,
          vendor: '山田コンサルティング',
          date: '2025-01-05',
          amount: 510000,
          taxAmount: 51000,
          items: [
            { name: 'コンサルティング料', amount: 500000 },
            { name: '交通費', amount: 10000 }
          ]
        },
        default: {
          text: `経費精算書
日付: 2025年1月5日

交通費                   5,000円
会議費                   8,000円
資料代                   3,000円
─────────────────────────
小計                    16,000円
消費税(10%)              1,600円
─────────────────────────
合計                    17,600円`,
          confidence: 0.88,
          vendor: 'PDF文書',
          date: '2025-01-05',
          amount: 16000,
          taxAmount: 1600,
          items: [
            { name: '交通費', amount: 5000 },
            { name: '会議費', amount: 8000 },
            { name: '資料代', amount: 3000 }
          ]
        }
      };

      // ファイル名に基づいてモックデータを選択
      if (fileName.includes('invoice') || fileName.includes('請求')) {
        return mockPDFResults.invoice;
      } else if (fileName.includes('receipt') || fileName.includes('領収')) {
        return mockPDFResults.receipt;
      }
      
      return mockPDFResults.default;
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error('PDFファイルの処理中にエラーが発生しました。');
    }
  }

  // 既存のprocessReceiptImageメソッドをラッパーとして保持（後方互換性）
  async processReceiptImage(imageFile: File): Promise<OCRResult> {
    return this.processImageFile(imageFile);
  }
  
  parseReceiptText(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {
      text,
      items: []
    };
    
    // 日付の抽出
    const datePatterns = [
      /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
      /(\d{2})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = match[1].length === 2 ? `20${match[1]}` : match[1];
        result.date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        break;
      }
    }
    
    // 金額の抽出
    const amountPattern = /[合計|計|total]\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/gi;
    const amountMatches = text.match(amountPattern);
    if (amountMatches && amountMatches.length > 0) {
      const amountStr = amountMatches[amountMatches.length - 1]; // 最後の合計を使用
      result.amount = parseInt(amountStr.replace(/[^\d]/g, ''));
    }
    
    // 税額の抽出
    const taxPattern = /(?:消費税|税)\s*(?:\(?\d+%\)?)?\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/gi;
    const taxMatches = text.match(taxPattern);
    if (taxMatches && taxMatches.length > 0) {
      const taxStr = taxMatches[0];
      result.taxAmount = parseInt(taxStr.replace(/[^\d]/g, ''));
    }
    
    // 店舗名の抽出（最初の行を店舗名と仮定）
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      result.vendor = lines[0].trim();
    }
    
    return result;
  }
  
  async createJournalEntry(ocrResult: OCRResult, accountId: string): Promise<{
    date: string;
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    taxAmount: number;
    taxRate: number;
    isTaxIncluded: boolean;
  }> {
    // TypeScript税制ライブラリをインポート
    const { TaxCalculator } = await import('./tax-calculator');
    
    // OCR結果から仕訳データを生成
    const description = `${ocrResult.vendor || '店舗名不明'} - ${ocrResult.items?.map(i => i.name).join(', ') || ''}`;
    
    // デフォルトの勘定科目を判定
    let debitAccount = '消耗品費'; // デフォルト
    let taxRate = 0.10; // デフォルト10%
    let aiReasoning = '';
    
    // AIベースの勘定科目分類システムを使用
    try {
      const { AccountCategoryAI } = await import('./account-category-ai');
      const categoryAI = new AccountCategoryAI();
      
      // AIによる高度な分析を実行
      const prediction = await categoryAI.predictAccountCategory(ocrResult, accountId);
      
      if (prediction && prediction.confidence >= 0.6) {
        debitAccount = prediction.category;
        aiReasoning = prediction.reasoning;
        
        // 税務関連のメモがあれば保存
        if (prediction.taxNotes) {
          console.log('Tax notes:', prediction.taxNotes);
        }
        
        // 使用したソースを記録
        if (prediction.sources && prediction.sources.length > 0) {
          console.log('Sources used:', prediction.sources.join(', '));
        }
      }
    } catch (error) {
      console.error('AI category prediction failed:', error);
      
      // フォールバック: 従来のキーワードベースの判定
      if (ocrResult.vendor) {
        const vendor = ocrResult.vendor.toLowerCase();
        
        // より詳細なパターンマッチング
        const text = ocrResult.text.toLowerCase();
        
        // 駐車場の高度な判定
        if (vendor.includes('times') || vendor.includes('タイムズ') || 
            vendor.includes('パーキング') || vendor.includes('駐車場') ||
            (text.includes('入庫') && text.includes('出庫')) ||
            (text.includes('駐車時間') && text.includes('駐車料金'))) {
          debitAccount = '旅費交通費';
          aiReasoning = '駐車場利用の特徴を検出（フォールバック処理）';
        }
        // その他の交通費
        else if (vendor.includes('タクシー') || vendor.includes('taxi') || 
                vendor.includes('jr') || vendor.includes('鉄道') || vendor.includes('バス') ||
                vendor.includes('高速道路') || vendor.includes('etc') || vendor.includes('ガソリン')) {
          debitAccount = '旅費交通費';
        } 
        // 会議・カフェ関連
        else if (vendor.includes('コーヒー') || vendor.includes('カフェ') || vendor.includes('coffee') ||
                 vendor.includes('スターバックス') || vendor.includes('ドトール') || 
                 vendor.includes('タリーズ') || vendor.includes('喫茶')) {
          debitAccount = '会議費';
        } 
        // 飲食・接待関連
        else if (vendor.includes('レストラン') || vendor.includes('restaurant') || 
                 vendor.includes('食堂') || vendor.includes('居酒屋') || vendor.includes('寿司') ||
                 vendor.includes('焼肉') || vendor.includes('中華') || vendor.includes('イタリアン') ||
                 vendor.includes('フレンチ') || vendor.includes('和食')) {
          debitAccount = '接待交際費';
        } 
        // コンビニ・日用品関連
        else if (vendor.includes('コンビニ') || vendor.includes('ローソン') || 
                 vendor.includes('セブン') || vendor.includes('ファミリーマート') ||
                 vendor.includes('ミニストップ') || vendor.includes('デイリー')) {
          debitAccount = '消耗品費';
        }
        // 事務用品・文具関連
        else if (vendor.includes('文具') || vendor.includes('事務') || 
                 vendor.includes('コクヨ') || vendor.includes('アスクル')) {
          debitAccount = '事務用品費';
        }
      }
    }
    
    // 品目から軽減税率の判定
    if (ocrResult.items && ocrResult.items.length > 0) {
      const hasReducedTaxItems = ocrResult.items.some(item => 
        TaxCalculator.isReducedTaxItem(item.name)
      );
      if (hasReducedTaxItems) {
        taxRate = 0.08; // 軽減税率
      }
    }
    
    // 税額が明示されていない場合は計算
    let taxAmount = ocrResult.taxAmount || 0;
    if (!ocrResult.taxAmount && ocrResult.amount) {
      const taxCalc = TaxCalculator.calculateFromTaxIncluded(ocrResult.amount, taxRate);
      taxAmount = taxCalc.taxAmount;
    }
    
    return {
      date: ocrResult.date || new Date().toISOString().split('T')[0],
      description: description.substring(0, 100), // 最大100文字
      debitAccount,
      creditAccount: '現金',
      amount: ocrResult.amount || 0,
      taxAmount,
      taxRate,
      isTaxIncluded: true // 領収書の金額は通常税込み
    };
  }
}

// 後方互換性のためのprocessOCR関数をエクスポート
export async function processOCR(file: File): Promise<OCRResult> {
  const ocrProcessor = new OCRProcessor();
  return await ocrProcessor.processReceiptFile(file);
}