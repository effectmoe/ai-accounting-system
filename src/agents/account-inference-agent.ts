import { Agent } from '@mastra/core';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { z } from 'zod';
import { getMcpClient } from '@/lib/mcp-client';

const accountInferenceSchema = z.object({
  primaryAccount: z.object({
    code: z.string(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  }),
  alternativeAccounts: z.array(z.object({
    code: z.string(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })).optional(),
});

export class AccountInferenceAgent extends Agent {
  name = 'account-inference-agent';
  instructions = `あなたは日本の会計システムと税務の専門家です。
領収書や請求書の内容を分析し、最新の税法と会計基準に基づいて適切な勘定科目を推論してください。

推論プロセス：
1. まず文書内容を詳細に分析
2. Perplexityで最新の税務・会計情報を検索
3. 国税庁のガイドラインを確認
4. 業界別の慣習を考慮
5. 類似取引の前例を参照
6. 複数の情報源を総合して最適な勘定科目を決定

考慮すべき要素：
- 取引の性質と目的
- 金額の大小（資産計上基準など）
- 消費税の取り扱い
- 損金算入の可否
- 業界特有の会計処理

必ず以下の形式で回答してください：
- 最も適切な勘定科目とその確信度（0-1）
- 推論の根拠（参照した情報源を明記）
- 他の候補となる勘定科目（あれば）
- 税務上の注意点`;

  model = {
    provider: 'OPENAI' as const,
    name: 'gpt-4',
    toolChoice: 'auto' as const,
  };

  async analyzeDocument(documentData: {
    documentType: string;
    vendorName: string;
    items: Array<{ name: string; amount: number }>;
    totalAmount: number;
    notes: string;
    extractedText?: string;
    industry?: string;
  }) {
    const supabase = getSupabaseClient();
    const mcpClient = getMcpClient();

    // 1. 勘定科目マスターを取得
    const { data: accountCategories } = await supabase
      .from('account_categories')
      .select('*')
      .eq('is_active', true);

    const accountList = accountCategories?.map(acc => 
      `${acc.code}: ${acc.name} (${acc.category_type}) - キーワード: ${acc.keywords?.join(', ')}`
    ).join('\n');

    // 2. MCPで最新の会計・税務情報を収集
    const searchKeywords = [
      documentData.vendorName,
      ...documentData.items.map(item => item.name),
      documentData.extractedText?.substring(0, 100) || ''
    ].filter(Boolean).join(' ');

    // Perplexityで関連情報を検索
    const accountingInfo = await mcpClient.searchAccountingInfo(searchKeywords);
    
    // 国税庁ガイドラインを検索
    const taxGuidelines = await mcpClient.searchTaxGuidelines(searchKeywords);
    
    // 業界別慣習を取得
    const industryPractices = documentData.industry 
      ? await mcpClient.getIndustryPractices(documentData.industry, documentData.documentType)
      : '';

    // 類似取引を検索
    const similarTransactions = await mcpClient.searchSimilarTransactions(
      documentData.notes + ' ' + documentData.items.map(i => i.name).join(' '),
      documentData.totalAmount
    );

    const prompt = `
以下の文書情報と収集した外部情報から、最適な勘定科目を推論してください。

【文書情報】
- 文書種類: ${documentData.documentType}
- 取引先: ${documentData.vendorName}
- 金額: ¥${documentData.totalAmount.toLocaleString()}
- 明細: ${documentData.items.map(item => `${item.name}: ¥${item.amount.toLocaleString()}`).join(', ')}
- 備考: ${documentData.notes}
${documentData.extractedText ? `- OCR抽出テキスト: ${documentData.extractedText}` : ''}
${documentData.industry ? `- 業界: ${documentData.industry}` : ''}

【Perplexityによる最新の会計・税務情報】
${accountingInfo || '情報取得中...'}

【国税庁ガイドライン】
${taxGuidelines}

【業界別慣習】
${industryPractices}

【類似取引の前例】
${similarTransactions.length > 0 ? 
  similarTransactions.map(t => `- ${t.partner_name}: ${t.account_categories?.name} (${t.notes})`).join('\n') 
  : '類似取引なし'}

【利用可能な勘定科目】
${accountList}

上記の情報を総合的に判断し、以下の形式で回答してください：
{
  "primaryAccount": {
    "code": "勘定科目コード",
    "name": "勘定科目名",
    "confidence": 0.95,
    "reasoning": "この勘定科目を選んだ理由（参照した情報源を明記）"
  },
  "alternativeAccounts": [
    {
      "code": "代替勘定科目コード",
      "name": "代替勘定科目名",
      "confidence": 0.7,
      "reasoning": "代替案として考えられる理由"
    }
  ],
  "taxNotes": "税務上の注意点があれば記載"
}`;

    try {
      const response = await this.completion(prompt);
      const result = accountInferenceSchema.parse(JSON.parse(response));
      
      return result;
    } catch (error) {
      console.error('Account inference error:', error);
      
      // フォールバック: 文書種類に基づくデフォルト勘定科目
      const defaultAccounts = {
        receipt: { code: '5910', name: '雑費', confidence: 0.5, reasoning: 'デフォルト設定' },
        invoice: { code: '4110', name: '売上高', confidence: 0.8, reasoning: '請求書のため売上高と推定' },
        estimate: { code: '1210', name: '売掛金', confidence: 0.6, reasoning: '見積書のため売掛金と推定' },
        delivery_note: { code: '4110', name: '売上高', confidence: 0.7, reasoning: '納品書のため売上高と推定' },
      };

      return {
        primaryAccount: defaultAccounts[documentData.documentType as keyof typeof defaultAccounts] || defaultAccounts.receipt,
        alternativeAccounts: [],
      };
    }
  }

  async saveInference(documentId: string, inference: z.infer<typeof accountInferenceSchema>) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('account_inferences')
      .insert({
        document_id: documentId,
        inferred_account_code: inference.primaryAccount.code,
        confidence_score: inference.primaryAccount.confidence,
        reasoning: inference.primaryAccount.reasoning,
        alternative_accounts: inference.alternativeAccounts?.map(alt => ({
          code: alt.code,
          score: alt.confidence,
          reason: alt.reasoning,
        })),
      })
      .select()
      .single();

    if (error) throw error;

    // documentsテーブルも更新
    await supabase
      .from('documents')
      .update({
        account_code: inference.primaryAccount.code,
        account_inference_id: data.id,
      })
      .eq('id', documentId);

    return data;
  }

  async confirmInference(inferenceId: string, confirmedCode: string, userId: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('account_inferences')
      .update({
        is_confirmed: true,
        confirmed_account_code: confirmedCode,
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', inferenceId);

    if (error) throw error;

    // 関連するdocumentも更新
    const { data: inference } = await supabase
      .from('account_inferences')
      .select('document_id')
      .eq('id', inferenceId)
      .single();

    if (inference) {
      await supabase
        .from('documents')
        .update({ account_code: confirmedCode })
        .eq('id', inference.document_id);
    }
  }
}