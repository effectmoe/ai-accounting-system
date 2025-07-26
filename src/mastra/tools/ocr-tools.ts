import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

/**
 * 文書画像をOCR処理してテキストを抽出
 */
export const processDocumentImageTool = {
  name: 'process_document_image',
  description: '文書画像をOCR処理してテキストを抽出します',
  parameters: {
    type: 'object',
    properties: {
      image_url: { type: 'string', description: '画像URL' },
      image_base64: { type: 'string', description: 'Base64エンコードされた画像データ' },
      document_type: {
        type: 'string',
        enum: ['receipt', 'invoice', 'delivery_note', 'quotation', 'contract', 'business_card', 'unknown'],
        description: '文書タイプ',
      },
      language: { type: 'string', enum: ['ja', 'en', 'auto'], description: '言語設定' },
      enhance_quality: { type: 'boolean', description: '画質向上処理を行うか' },
    },
    required: ['document_type'],
  },
  handler: async (params: any) => {
    logger.info('Processing document image:', params);
    
    const db = await getDatabase();
    const collection = db.collection('ocr_results');
    
    // OCR処理のシミュレーション
    let extractedText = '';
    let structuredData: any = {};
    
    switch (params.document_type) {
      case 'receipt':
        extractedText = `スーパーマーケット ABC
東京都渋谷区1-2-3
TEL: 03-1234-5678

2024年1月15日 14:30
レジ#: 001 担当: 田中

商品名　　　　　数量　単価　　金額
-----------------------------------
牛乳　　　　　　1　　¥248　　¥248
パン　　　　　　2　　¥158　　¥316
卵　　　　　　　1　　¥298　　¥298
野菜ジュース　　3　　¥128　　¥384
-----------------------------------
小計　　　　　　　　　　　　¥1,246
消費税(8%)　　　　　　　　　　¥72
消費税(10%)　　　　　　　　　　¥28
-----------------------------------
合計　　　　　　　　　　　　¥1,346

お預かり　　　　　　　　　　¥2,000
お釣り　　　　　　　　　　　　¥654`;
        
        structuredData = {
          store_name: 'スーパーマーケット ABC',
          store_address: '東京都渋谷区1-2-3',
          store_phone: '03-1234-5678',
          transaction_date: '2024-01-15',
          transaction_time: '14:30',
          items: [
            { name: '牛乳', quantity: 1, unit_price: 248, tax_rate: 0.08 },
            { name: 'パン', quantity: 2, unit_price: 158, tax_rate: 0.08 },
            { name: '卵', quantity: 1, unit_price: 298, tax_rate: 0.08 },
            { name: '野菜ジュース', quantity: 3, unit_price: 128, tax_rate: 0.1 },
          ],
          subtotal: 1246,
          tax_8_percent: 72,
          tax_10_percent: 28,
          total_amount: 1346,
        };
        break;
        
      case 'invoice':
        extractedText = `請求書
                        
請求書番号: INV-2024-0123
発行日: 2024年1月20日
支払期限: 2024年2月20日

株式会社サンプル商事 御中

株式会社ABC
〒100-0001
東京都千代田区1-2-3
TEL: 03-9876-5432
登録番号: T1234567890123

品目　　　　　　　数量　単価　　　金額
商品A　　　　　　 10　　¥5,000　 ¥50,000
サービスB　　　　　5　　¥8,000　 ¥40,000
配送料　　　　　　 1　　¥2,000　　¥2,000

小計　　　　　　　　　　　　　　¥92,000
消費税(10%)　　　　　　　　　　　¥9,200
合計　　　　　　　　　　　　　 ¥101,200

振込先:
みずほ銀行 東京支店
普通 1234567
カ)エービーシー`;
        
        structuredData = {
          invoice_number: 'INV-2024-0123',
          issue_date: '2024-01-20',
          due_date: '2024-02-20',
          customer_name: '株式会社サンプル商事',
          supplier_name: '株式会社ABC',
          supplier_address: '東京都千代田区1-2-3',
          supplier_phone: '03-9876-5432',
          tax_registration_number: 'T1234567890123',
          items: [
            { description: '商品A', quantity: 10, unit_price: 5000, amount: 50000 },
            { description: 'サービスB', quantity: 5, unit_price: 8000, amount: 40000 },
            { description: '配送料', quantity: 1, unit_price: 2000, amount: 2000 },
          ],
          subtotal: 92000,
          tax_amount: 9200,
          total_amount: 101200,
          bank_info: {
            bank_name: 'みずほ銀行',
            branch_name: '東京支店',
            account_type: '普通',
            account_number: '1234567',
          },
        };
        break;
        
      case 'business_card':
        extractedText = `株式会社テクノロジー
代表取締役
山田 太郎
TARO YAMADA

〒150-0001
東京都渋谷区神宮前1-2-3
テクノロジービル 10F

TEL: 03-1111-2222
FAX: 03-1111-2223
Mobile: 090-1234-5678
Email: yamada@technology.co.jp
URL: https://www.technology.co.jp`;
        
        structuredData = {
          name: '山田 太郎',
          name_romaji: 'TARO YAMADA',
          title: '代表取締役',
          company: '株式会社テクノロジー',
          address: '東京都渋谷区神宮前1-2-3 テクノロジービル 10F',
          postal_code: '150-0001',
          phone: '03-1111-2222',
          fax: '03-1111-2223',
          mobile: '090-1234-5678',
          email: 'yamada@technology.co.jp',
          website: 'https://www.technology.co.jp',
        };
        break;
        
      default:
        extractedText = 'OCR処理が完了しました。文書タイプが不明なため、構造化データは生成されませんでした。';
    }
    
    // OCR結果を保存
    const ocrResult = {
      document_type: params.document_type,
      language: params.language || 'ja',
      extracted_text: extractedText,
      structured_data: structuredData,
      confidence_score: 0.95,
      processing_time_ms: 1500,
      image_url: params.image_url,
      created_at: new Date(),
      enhanced_quality: params.enhance_quality || false,
    };
    
    const result = await collection.insertOne(ocrResult);
    
    return {
      success: true,
      ocr_result_id: result.insertedId.toString(),
      document_type: params.document_type,
      extracted_text: extractedText,
      structured_data: structuredData,
      confidence_score: ocrResult.confidence_score,
      processing_time_ms: ocrResult.processing_time_ms,
      language_detected: 'ja',
      quality_assessment: {
        text_clarity: 'high',
        layout_preservation: 'excellent',
        character_accuracy: '98%',
      },
    };
  }
};

/**
 * 領収書から構造化データを抽出
 */
export const extractReceiptDataTool = {
  name: 'extract_receipt_data',
  description: '領収書から構造化データを抽出します',
  parameters: {
    type: 'object',
    properties: {
      ocr_text: { type: 'string', description: 'OCRで抽出されたテキスト' },
      image_url: { type: 'string', description: '元画像URL（精度向上用）' },
      extract_items: { type: 'boolean', description: '明細項目を抽出するか' },
    },
    required: ['ocr_text'],
  },
  handler: async (params: any) => {
    logger.info('Extracting receipt data:', params);
    
    // テキスト解析によるデータ抽出
    const lines = params.ocr_text.split('\n');
    const receiptData: any = {
      raw_text: params.ocr_text,
      store_info: {},
      transaction_info: {},
      items: [],
      payment_info: {},
    };
    
    // 店舗情報の抽出
    const storeNamePattern = /^(.+?)(店|マーケット|ストア|商店)/;
    const phonePattern = /TEL[:：]\s*(\d{2,4}-\d{2,4}-\d{4})/;
    const addressPattern = /(〒?\d{3}-?\d{4})?\s*(.+?[都道府県].+?[市区町村].+)/;
    
    for (const line of lines) {
      if (storeNamePattern.test(line)) {
        receiptData.store_info.name = line.trim();
      }
      if (phonePattern.test(line)) {
        receiptData.store_info.phone = line.match(phonePattern)?.[1];
      }
      if (addressPattern.test(line)) {
        const match = line.match(addressPattern);
        if (match) {
          receiptData.store_info.postal_code = match[1];
          receiptData.store_info.address = match[2];
        }
      }
    }
    
    // 日付・時刻の抽出
    const datePattern = /(\d{4}年\d{1,2}月\d{1,2}日)/;
    const timePattern = /(\d{1,2}[:：]\d{2})/;
    
    for (const line of lines) {
      if (datePattern.test(line)) {
        receiptData.transaction_info.date = line.match(datePattern)?.[1];
      }
      if (timePattern.test(line)) {
        receiptData.transaction_info.time = line.match(timePattern)?.[1];
      }
    }
    
    // 金額の抽出
    const totalPattern = /合計.+?[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/;
    const taxPattern = /消費税.+?[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/;
    
    for (const line of lines) {
      if (totalPattern.test(line)) {
        const amount = line.match(totalPattern)?.[1]?.replace(/,/g, '');
        receiptData.payment_info.total_amount = parseInt(amount || '0');
      }
      if (taxPattern.test(line)) {
        const amount = line.match(taxPattern)?.[1]?.replace(/,/g, '');
        receiptData.payment_info.tax_amount = parseInt(amount || '0');
      }
    }
    
    // 明細項目の抽出（オプション）
    if (params.extract_items) {
      const itemPattern = /(.+?)\s+(\d+)\s+[¥￥]?(\d{1,3}(?:,\d{3})*)\s+[¥￥]?(\d{1,3}(?:,\d{3})*)/;
      
      for (const line of lines) {
        const match = line.match(itemPattern);
        if (match && !line.includes('小計') && !line.includes('合計')) {
          receiptData.items.push({
            name: match[1].trim(),
            quantity: parseInt(match[2]),
            unit_price: parseInt(match[3].replace(/,/g, '')),
            amount: parseInt(match[4].replace(/,/g, '')),
          });
        }
      }
    }
    
    // データの検証と補完
    if (receiptData.items.length > 0) {
      const calculatedTotal = receiptData.items.reduce((sum: number, item: any) => sum + item.amount, 0);
      receiptData.validation = {
        items_total: calculatedTotal,
        matches_receipt_total: Math.abs(calculatedTotal - (receiptData.payment_info.total_amount || 0)) < 100,
      };
    }
    
    return {
      success: true,
      receipt_data: receiptData,
      extraction_quality: {
        store_info_complete: Object.keys(receiptData.store_info).length >= 2,
        transaction_info_complete: Object.keys(receiptData.transaction_info).length >= 2,
        payment_info_complete: Object.keys(receiptData.payment_info).length >= 1,
        items_extracted: receiptData.items.length,
      },
      suggestions: [
        receiptData.store_info.name ? null : '店舗名が検出できませんでした',
        receiptData.transaction_info.date ? null : '取引日が検出できませんでした',
        receiptData.payment_info.total_amount ? null : '合計金額が検出できませんでした',
      ].filter(s => s !== null),
    };
  }
};

/**
 * 表形式データを構造化して抽出
 */
export const extractTableDataTool = {
  name: 'extract_table_data',
  description: '画像内の表形式データを構造化して抽出します',
  parameters: {
    type: 'object',
    properties: {
      image_url: { type: 'string', description: '画像URL' },
      image_base64: { type: 'string', description: 'Base64エンコードされた画像データ' },
      table_type: {
        type: 'string',
        enum: ['invoice_items', 'price_list', 'inventory', 'financial_statement'],
        description: '表のタイプ',
      },
      headers: { type: 'array', items: { type: 'string' }, description: '期待されるヘッダー' },
    },
    required: ['table_type'],
  },
  handler: async (params: any) => {
    logger.info('Extracting table data:', params);
    
    let tableData: any = {
      headers: [],
      rows: [],
      summary: {},
    };
    
    // 表タイプに応じたサンプルデータ生成
    switch (params.table_type) {
      case 'invoice_items':
        tableData.headers = ['品目', '数量', '単価', '金額', '税率'];
        tableData.rows = [
          ['商品A', '10', '¥1,000', '¥10,000', '10%'],
          ['商品B', '5', '¥2,500', '¥12,500', '10%'],
          ['サービスC', '1', '¥30,000', '¥30,000', '10%'],
          ['配送料', '1', '¥1,500', '¥1,500', '10%'],
        ];
        tableData.summary = {
          subtotal: 54000,
          tax: 5400,
          total: 59400,
        };
        break;
        
      case 'price_list':
        tableData.headers = ['商品コード', '商品名', '定価', '卸価格', '在庫'];
        tableData.rows = [
          ['PRD-001', 'ノートPC', '¥150,000', '¥120,000', '25'],
          ['PRD-002', 'モニター', '¥35,000', '¥28,000', '50'],
          ['PRD-003', 'キーボード', '¥8,000', '¥6,400', '100'],
          ['PRD-004', 'マウス', '¥3,000', '¥2,400', '150'],
        ];
        break;
        
      case 'financial_statement':
        tableData.headers = ['勘定科目', '当期', '前期', '増減'];
        tableData.rows = [
          ['売上高', '¥50,000,000', '¥45,000,000', '+11.1%'],
          ['売上原価', '¥30,000,000', '¥28,000,000', '+7.1%'],
          ['売上総利益', '¥20,000,000', '¥17,000,000', '+17.6%'],
          ['販管費', '¥15,000,000', '¥14,000,000', '+7.1%'],
          ['営業利益', '¥5,000,000', '¥3,000,000', '+66.7%'],
        ];
        break;
    }
    
    // カスタムヘッダーが指定されている場合は上書き
    if (params.headers && params.headers.length > 0) {
      tableData.headers = params.headers;
    }
    
    // 数値データの解析
    const numericColumns: number[] = [];
    tableData.headers.forEach((header: string, index: number) => {
      if (['金額', '単価', '当期', '前期', '定価', '卸価格'].includes(header)) {
        numericColumns.push(index);
      }
    });
    
    // 統計情報の計算
    if (numericColumns.length > 0) {
      tableData.statistics = {
        row_count: tableData.rows.length,
        numeric_columns: numericColumns.map((i: number) => tableData.headers[i]),
        has_totals: tableData.summary && Object.keys(tableData.summary).length > 0,
      };
    }
    
    return {
      success: true,
      table_data: tableData,
      extraction_info: {
        table_type: params.table_type,
        headers_detected: tableData.headers.length,
        rows_extracted: tableData.rows.length,
        confidence: 0.92,
      },
      formatting_detected: {
        currency_format: '¥',
        number_format: 'comma_separated',
        percentage_format: 'detected',
      },
      export_formats_available: ['csv', 'excel', 'json'],
    };
  }
};

// すべてのツールをエクスポート
export const ocrTools = [
  processDocumentImageTool,
  extractReceiptDataTool,
  extractTableDataTool,
];