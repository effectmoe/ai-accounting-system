import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';

// UIエージェント定義
export const uiAgent = new Agent({
  name: 'UI Agent',
  description: 'User interface and document generation',
  model: deepseekProvider,
  instructions: `
あなたはUI・ドキュメント生成専門のAIエージェントです。

主な機能：
1. PDF帳票生成
2. Excel・CSV出力
3. フォーム生成
4. ダッシュボード作成
5. レポート作成

美しく使いやすいUIと正確な帳票を生成します。
`,
  getTools: () => [
    {
      name: 'generate_pdf_report',
      description: 'PDFレポートを生成します',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['invoice', 'receipt', 'report'], description: 'レポートタイプ' },
          data: { type: 'object', description: 'データ' },
          template: { type: 'string', description: 'テンプレート名' }
        },
        required: ['type', 'data']
      }
    },
    {
      name: 'export_to_excel',
      description: 'Excelファイルを生成します',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'array', description: 'データ配列' },
          headers: { type: 'array', description: 'ヘッダー' },
          filename: { type: 'string', description: 'ファイル名' }
        },
        required: ['data', 'headers']
      }
    }
  ]
});

export default uiAgent;