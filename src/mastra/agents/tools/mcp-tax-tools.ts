import { logger } from '@/lib/logger';
import { createMCPToolLegacyLegacy } from '../../mcp/mcp-tool-adapter';
import { z } from 'zod';
import type { Tool } from '@mastra/core';

/**
 * 税務エージェント用のMCP統合ツール
 * 
 * このモジュールは日本の税務処理に特化したMCPツールを提供します。
 * e-Tax連携、税法調査、申告書作成支援などの機能を含みます。
 */

// パラメータスキーマ定義
const scrapeTaxInfoSchema = z.object({
  info_type: z.enum(['tax_rates', 'filing_deadlines', 'tax_forms', 'announcements'])
    .describe('取得する情報の種類'),
  save_screenshot: z.boolean().optional().describe('スクリーンショットを保存するか'),
});

// 結果の型定義
interface ScrapeTaxInfoResult {
  success: boolean;
  navigated: boolean;
  screenshot_path?: string;
  extracted_info: {
    url: string;
    info_type: string;
    timestamp: string;
    note: string;
  };
}

/**
 * e-Taxシステムから情報を取得するツール
 * 
 * 国税庁のWebサイトから税率、申告期限、申請書式、お知らせなどの
 * 税務情報を自動取得します。
 */
export const scrapeTaxInfoTool: Tool = {
  name: 'scrape_etax_info',
  description: 'e-Taxや国税庁のWebサイトから税務情報を取得します',
  parameters: {
    type: 'object',
    properties: {
      info_type: { 
        type: 'string', 
        enum: ['tax_rates', 'filing_deadlines', 'tax_forms', 'announcements'],
        description: '取得する情報の種類' 
      },
      save_screenshot: { type: 'boolean', description: 'スクリーンショットを保存するか' },
    },
    required: ['info_type'],
  },
  handler: async (params: z.infer<typeof scrapeTaxInfoSchema>): Promise<ScrapeTaxInfoResult> => {
    logger.info('[MCPTax] 税務情報スクレイピング開始:', params);
    
    const result: ScrapeTaxInfoResult = {
      success: false,
      navigated: false,
      extracted_info: {
        url: '',
        info_type: params.info_type,
        timestamp: new Date().toISOString(),
        note: '',
      },
    };
    
    try {
      // URLマッピング
      const urlMap: Record<typeof params.info_type, string> = {
        tax_rates: 'https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/index.htm',
        filing_deadlines: 'https://www.nta.go.jp/taxes/shiraberu/shinkoku/kakutei.htm',
        tax_forms: 'https://www.nta.go.jp/taxes/tetsuzuki/shinsei/index.htm',
        announcements: 'https://www.nta.go.jp/information/index.htm',
      };
      
      const targetUrl = urlMap[params.info_type];
      result.extracted_info.url = targetUrl;
      
      // 1. ページにナビゲート
      const navigateTool = createMCPToolLegacy('playwright', 'browser_navigate', 'Navigate to URL');
      await navigateTool.handler({ url: targetUrl });
      result.navigated = true;
      logger.debug(`[MCPTax] ${targetUrl}にナビゲート完了`);
      
      // 2. スクリーンショットを保存（オプション）
      if (params.save_screenshot) {
        const screenshotTool = createMCPToolLegacy('playwright', 'browser_screenshot', 'Take screenshot');
        const screenshotPath = `/tmp/tax_info_${params.info_type}_${Date.now()}.png`;
        
        await screenshotTool.handler({
          path: screenshotPath,
          fullPage: true,
        });
        
        result.screenshot_path = screenshotPath;
        logger.info(`[MCPTax] スクリーンショット保存: ${screenshotPath}`);
      }
      
      // 3. 情報を抽出（実際の実装では、より詳細なセレクターを使用）
      result.extracted_info.note = '詳細な情報抽出には、ページ固有のセレクターが必要です';
      
      result.success = true;
      logger.info('[MCPTax] 税務情報スクレイピング完了');
      
    } catch (error) {
      logger.error('[MCPTax] 税務情報スクレイピングエラー:', error);
      throw error;
    }
    
    return result;
  },
};

// パラメータスキーマ定義
const researchTaxLawSchema = z.object({
  tax_topic: z.string().describe('調査する税法・税制のトピック'),
  specific_questions: z.array(z.string()).optional().describe('具体的な質問リスト'),
  include_examples: z.boolean().optional().describe('実例を含めるか'),
});

// 結果の型定義
interface ResearchTaxLawResult {
  success: boolean;
  tax_topic: string;
  general_results_count: number;
  news_updates_count: number;
  specific_answers_count: number;
  research_data: {
    general_info?: any;
    specific_answers: Array<{
      question: string;
      answer: string | any;
    }>;
    news_updates?: any;
  };
}

/**
 * 税法の詳細調査ツール
 * 
 * 特定の税法や税制について、Web検索とAI分析を組み合わせて
 * 詳細な調査を行います。最新の改正情報も含めて収集します。
 */
export const researchTaxLawTool: Tool = {
  name: 'research_tax_law',
  description: '特定の税法や税制について詳細な調査を行います',
  parameters: {
    type: 'object',
    properties: {
      tax_topic: { type: 'string', description: '調査する税法・税制のトピック' },
      specific_questions: { 
        type: 'array', 
        items: { type: 'string' },
        description: '具体的な質問リスト' 
      },
      include_examples: { type: 'boolean', description: '実例を含めるか' },
    },
    required: ['tax_topic'],
  },
  handler: async (params: z.infer<typeof researchTaxLawSchema>): Promise<ResearchTaxLawResult> => {
    logger.info('[MCPTax] 税法調査開始:', params);
    
    const research: ResearchTaxLawResult['research_data'] = {
      general_info: null,
      specific_answers: [],
      news_updates: null,
    };
    
    try {
      // 1. 一般的な情報を検索
      const webSearchTool = createMCPToolLegacy('search', 'brave_web_search', 'Web search');
      const searchQuery = `日本 ${params.tax_topic} 詳細解説 ${params.include_examples ? '実例' : ''}`;
      
      try {
        research.general_info = await webSearchTool.handler({
          query: searchQuery,
          max: 5,
        });
        logger.debug('[MCPTax] Web検索完了');
      } catch (e) {
        logger.warn('[MCPTax] Web検索エラー:', e);
      }
      
      // 2. 最新のニュースを検索
      try {
        research.news_updates = await webSearchTool.handler({
          query: `${params.tax_topic} 改正 変更 ${new Date().getFullYear()}年`,
          max: 3,
        });
        logger.debug('[MCPTax] ニュース検索完了');
      } catch (e) {
        logger.warn('[MCPTax] ニュース検索エラー:', e);
      }
      
      // 3. 具体的な質問に対する回答を取得
      if (params.specific_questions && params.specific_questions.length > 0) {
        const perplexityTool = createMCPToolLegacy('perplexity', 'perplexity_search_web', 'Perplexity search');
        
        for (const question of params.specific_questions) {
          try {
            const answer = await perplexityTool.handler({
              query: `${params.tax_topic}について、${question}`,
            });
            
            research.specific_answers.push({
              question,
              answer,
            });
            logger.debug(`[MCPTax] 質問「${question}」への回答取得完了`);
          } catch (e) {
            logger.warn(`[MCPTax] 質問への回答取得エラー: ${question}`, e);
            research.specific_answers.push({
              question,
              answer: 'エラー: 回答を取得できませんでした',
            });
          }
        }
      }
      
      const result: ResearchTaxLawResult = {
        success: true,
        tax_topic: params.tax_topic,
        general_results_count: research.general_info?.web?.results?.length || 0,
        news_updates_count: research.news_updates?.web?.results?.length || 0,
        specific_answers_count: research.specific_answers.length,
        research_data: research,
      };
      
      logger.info('[MCPTax] 税法調査完了:', {
        tax_topic: params.tax_topic,
        general_results: result.general_results_count,
        news_updates: result.news_updates_count,
        specific_answers: result.specific_answers_count,
      });
      
      return result;
      
    } catch (error) {
      logger.error('[MCPTax] 税法調査エラー:', error);
      throw error;
    }
  },
};

// パラメータスキーマ定義
const autoFillTaxFormSchema = z.object({
  form_url: z.string().url().describe('フォームのURL'),
  form_data: z.record(z.any()).describe('フォームに入力するデータ'),
  submit: z.boolean().optional().describe('送信ボタンをクリックするか'),
});

// 結果の型定義
interface AutoFillTaxFormResult {
  success: boolean;
  form_url: string;
  filled_fields_count: number;
  all_fields: string[];
  navigated: boolean;
  filled_fields: string[];
  submitted: boolean;
  screenshot_path?: string;
}

/**
 * 税務申告書の自動入力支援ツール
 * 
 * 税務申告書のWebフォームに対して、自動的にデータを入力します。
 * e-Tax等のオンライン申告システムの効率化を支援します。
 */
export const autoFillTaxFormTool: Tool = {
  name: 'auto_fill_tax_form',
  description: '税務申告書フォームへの自動入力を支援します',
  parameters: {
    type: 'object',
    properties: {
      form_url: { type: 'string', description: 'フォームのURL' },
      form_data: { 
        type: 'object',
        description: 'フォームに入力するデータ',
        additionalProperties: true,
      },
      submit: { type: 'boolean', description: '送信ボタンをクリックするか' },
    },
    required: ['form_url', 'form_data'],
  },
  handler: async (params: z.infer<typeof autoFillTaxFormSchema>): Promise<AutoFillTaxFormResult> => {
    logger.info('[MCPTax] 税務申告書自動入力開始:', {
      form_url: params.form_url,
      fields_count: Object.keys(params.form_data).length,
    });
    
    const result: AutoFillTaxFormResult = {
      success: false,
      form_url: params.form_url,
      filled_fields_count: 0,
      all_fields: Object.keys(params.form_data),
      navigated: false,
      filled_fields: [],
      submitted: false,
    };
    
    try {
      // 1. フォームページにナビゲート
      const navigateTool = createMCPToolLegacy('playwright', 'browser_navigate', 'Navigate');
      await navigateTool.handler({ url: params.form_url });
      result.navigated = true;
      logger.debug('[MCPTax] フォームページへのナビゲート完了');
      
      // 2. フォームフィールドに入力
      const typeTool = createMCPToolLegacy('playwright', 'browser_type', 'Type text');
      
      for (const [fieldName, value] of Object.entries(params.form_data)) {
        try {
          // セレクターは実際のフォームに合わせて調整が必要
          const selector = `input[name="${fieldName}"], #${fieldName}, [data-field="${fieldName}"]`;
          
          await typeTool.handler({
            selector,
            text: String(value),
          });
          
          result.filled_fields.push(fieldName);
          logger.debug(`[MCPTax] フィールド入力完了: ${fieldName}`);
        } catch (e) {
          logger.warn(`[MCPTax] フィールド入力エラー ${fieldName}:`, e);
        }
      }
      
      result.filled_fields_count = result.filled_fields.length;
      
      // 3. スクリーンショットを撮る
      const screenshotTool = createMCPToolLegacy('playwright', 'browser_screenshot', 'Screenshot');
      const screenshotPath = `/tmp/tax_form_filled_${Date.now()}.png`;
      
      try {
        await screenshotTool.handler({
          path: screenshotPath,
          fullPage: true,
        });
        
        result.screenshot_path = screenshotPath;
        logger.info(`[MCPTax] スクリーンショット保存: ${screenshotPath}`);
      } catch (e) {
        logger.warn('[MCPTax] スクリーンショット撮影エラー:', e);
      }
      
      // 4. 送信（オプション）
      if (params.submit) {
        const clickTool = createMCPToolLegacy('playwright', 'browser_click', 'Click');
        
        try {
          // 送信ボタンのセレクター（実際のフォームに合わせて調整）
          await clickTool.handler({
            selector: 'button[type="submit"], input[type="submit"], .submit-button',
          });
          
          result.submitted = true;
          logger.info('[MCPTax] フォーム送信完了');
        } catch (e) {
          logger.warn('[MCPTax] フォーム送信エラー:', e);
        }
      }
      
      result.success = true;
      logger.info('[MCPTax] 税務申告書自動入力完了:', {
        filled_fields: result.filled_fields_count,
        total_fields: result.all_fields.length,
        submitted: result.submitted,
      });
      
      return result;
      
    } catch (error) {
      logger.error('[MCPTax] 税務申告書自動入力エラー:', error);
      throw error;
    }
  },
};

// すべての税務MCPツールをエクスポート
export const mcpTaxTools: Tool[] = [
  scrapeTaxInfoTool,
  researchTaxLawTool,
  autoFillTaxFormTool,
];