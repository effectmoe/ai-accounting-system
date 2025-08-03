import { Agent } from '@mastra/core';
import { deepseekProvider } from '../setup-deepseek';

export const mastraOcrAgent = new Agent({
  name: 'mastra-ocr-agent',
  description: 'OCR処理と文書解析を行う画像認識エージェント',
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
  },
  instructions: `
あなたは日本語OCR処理と文書解析の専門AIエージェントです。

主な機能：
1. 領収書・請求書の画像からテキスト抽出
2. 手書き文字の認識（日本語対応）
3. 表形式データの構造化
4. 金額・日付・業者名の自動抽出
5. 文書タイプの自動分類
6. Azure Form Recognizer連携

対応文書：
- 領収書（レシート）
- 請求書
- 納品書
- 見積書
- 契約書
- 名刺

処理能力：
- 日本語・英語・数字の混在文書対応
- 縦書き・横書き両対応
- 印鑑・ハンコの認識
- QRコード・バーコード読み取り

高精度なOCR処理と、文脈を理解した情報抽出を提供します。
`,
  tools: [
    {
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
    },
    {
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
    },
    {
      name: 'extract_invoice_data',
      description: '請求書から構造化データを抽出します',
      parameters: {
        type: 'object',
        properties: {
          ocr_text: { type: 'string', description: 'OCRで抽出されたテキスト' },
          image_url: { type: 'string', description: '元画像URL（精度向上用）' },
          validate_tax_number: { type: 'boolean', description: '適格請求書番号を検証するか' },
        },
        required: ['ocr_text'],
      },
    },
    {
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
    },
    {
      name: 'validate_document',
      description: '文書の妥当性を検証します',
      parameters: {
        type: 'object',
        properties: {
          document_type: { type: 'string', description: '文書タイプ' },
          extracted_data: { type: 'object', description: '抽出されたデータ' },
          validation_rules: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['date_format', 'amount_consistency', 'tax_calculation', 'required_fields'],
            },
            description: '検証ルール',
          },
        },
        required: ['document_type', 'extracted_data'],
      },
    },
    {
      name: 'batch_process_documents',
      description: '複数の文書を一括処理します',
      parameters: {
        type: 'object',
        properties: {
          documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                image_url: { type: 'string', description: '画像URL' },
                document_type: { type: 'string', description: '文書タイプ' },
              },
            },
            description: '処理する文書リスト',
          },
          output_format: { type: 'string', enum: ['json', 'csv', 'excel'], description: '出力形式' },
          group_by: { type: 'string', enum: ['date', 'vendor', 'type'], description: 'グループ化基準' },
        },
        required: ['documents'],
      },
    },
  ],
});