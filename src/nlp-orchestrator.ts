import { Mastra } from '@mastra/core';
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { DocumentGenerator } from './lib/document-generator';
import { orchestrator as baseOrchestrator } from './mastra-orchestrator';

// 自然言語入力のスキーマ
const nlpInputSchema = z.object({
  input: z.string().describe('自然言語での指示'),
  context: z.object({
    companyId: z.string(),
    userId: z.string().optional(),
    previousConversation: z.array(z.string()).optional(),
  }).optional(),
});

// 意図解析の結果
const intentSchema = z.object({
  type: z.enum([
    'create_document',    // 帳票作成
    'process_document',   // 書類処理（OCR）
    'analyze_data',      // 分析・レポート
    'ask_question',      // 質問・照会
    'manage_data',       // データ管理
    'strategic_planning' // 戦略立案
  ]),
  confidence: z.number(),
  entities: z.record(z.any()),
  suggestedAction: z.string(),
});

export class NLPOrchestrator {
  private mastra: Mastra;
  private documentGenerator: DocumentGenerator;
  private intentPatterns: Map<string, RegExp[]>;

  constructor() {
    this.documentGenerator = new DocumentGenerator();
    this.initializeIntentPatterns();
    
    // Mastra設定（DeepSeek使用）
    this.mastra = new Mastra({
      llm: {
        provider: 'deepseek',
        name: 'deepseek-v3',
        apiKey: process.env.DEEPSEEK_API_KEY!,
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        maxTokens: 4096,
        temperature: 0.3, // より決定的な応答のため低めに設定
      },
      tools: this.createNLPTools(),
    });
  }

  // 意図パターンの初期化
  private initializeIntentPatterns() {
    this.intentPatterns = new Map([
      ['create_document', [
        /(?:作って|作成|発行|生成).*(?:請求書|見積書|領収書|納品書)/,
        /(?:請求書|見積書|領収書|納品書).*(?:作って|作成|発行|お願い)/,
        /invoice|estimate|receipt|delivery/i,
      ]],
      ['process_document', [
        /(?:読み取|OCR|スキャン|処理).*(?:領収書|請求書)/,
        /(?:領収書|請求書).*(?:読み取|OCR|スキャン)/,
        /この(?:画像|ファイル|書類)を/,
      ]],
      ['analyze_data', [
        /(?:分析|レポート|集計|まとめ)/,
        /(?:売上|経費|利益).*(?:教えて|確認|見せて)/,
        /(?:月次|年次|四半期).*(?:報告|レポート)/,
      ]],
      ['ask_question', [
        /(?:いくら|どれくらい|何件|誰|いつ)/,
        /(?:教えて|確認したい|知りたい)/,
        /\?$/,
      ]],
      ['strategic_planning', [
        /(?:戦略|計画|予測|シミュレーション)/,
        /(?:改善|最適化|効率化).*(?:提案|方法)/,
        /どうすれば.*(?:良い|いい)/,
      ]],
    ]);
  }

  // 自然言語処理ツールの作成
  private createNLPTools() {
    return {
      // 意図解析
      analyzeIntent: createTool({
        id: 'analyze-intent',
        description: 'Analyze user intent from natural language input',
        inputSchema: z.object({ input: z.string() }),
        execute: async ({ input }) => {
          return await this.analyzeIntent(input);
        },
      }),

      // エンティティ抽出
      extractEntities: createTool({
        id: 'extract-entities',
        description: 'Extract entities from natural language',
        inputSchema: z.object({ 
          input: z.string(),
          intentType: z.string(),
        }),
        execute: async ({ input, intentType }) => {
          return await this.extractEntities(input, intentType);
        },
      }),

      // アクション実行
      executeAction: createTool({
        id: 'execute-action',
        description: 'Execute the determined action',
        inputSchema: z.object({
          intent: intentSchema,
          originalInput: z.string(),
          context: z.any(),
        }),
        execute: async ({ intent, originalInput, context }) => {
          return await this.executeAction(intent, originalInput, context);
        },
      }),
    };
  }

  // メイン処理メソッド
  async processNaturalLanguage(input: string, context?: any): Promise<any> {
    try {
      console.log('🧠 [NLP] Processing:', input);

      // 1. 意図解析
      const intent = await this.analyzeIntent(input);
      console.log('🎯 [NLP] Intent:', intent);

      // 2. エンティティ抽出
      const entities = await this.extractEntities(input, intent.type);
      intent.entities = entities;

      // 3. アクション実行
      const result = await this.executeAction(intent, input, context);

      // 4. 応答生成
      const response = await this.generateResponse(intent, result);

      return {
        success: true,
        intent,
        result,
        response,
        suggestions: await this.generateSuggestions(intent, result),
      };
    } catch (error: any) {
      console.error('❌ [NLP] Error:', error);
      return {
        success: false,
        error: error.message,
        suggestions: [
          '「ABC商事に100万円の請求書を作って」のように指示してください',
          '「先月の売上を教えて」のように質問してください',
          '「この領収書を読み取って」のように依頼してください',
        ],
      };
    }
  }

  // 意図解析
  private async analyzeIntent(input: string): Promise<any> {
    // パターンマッチング
    for (const [intentType, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          return {
            type: intentType,
            confidence: 0.9,
            entities: {},
            suggestedAction: this.getSuggestedAction(intentType),
          };
        }
      }
    }

    // パターンに一致しない場合はAIで解析
    const prompt = `
以下の入力から、ユーザーの意図を分析してください。

入力: "${input}"

意図タイプ:
- create_document: 帳票作成（請求書、見積書、領収書、納品書）
- process_document: 書類処理（OCR、スキャン）
- analyze_data: データ分析、レポート作成
- ask_question: 質問、データ照会
- manage_data: データの追加、更新、削除
- strategic_planning: 戦略立案、改善提案

最も適切な意図タイプを選んでください。
`;

    const aiResponse = await this.mastra.llm.generate({
      prompt,
      maxTokens: 100,
    });

    // AI応答を解析
    const intentType = this.parseAIIntent(aiResponse.text);

    return {
      type: intentType,
      confidence: 0.7,
      entities: {},
      suggestedAction: this.getSuggestedAction(intentType),
    };
  }

  // エンティティ抽出
  private async extractEntities(input: string, intentType: string): Promise<any> {
    const entities: any = {};

    switch (intentType) {
      case 'create_document':
        // 文書タイプ
        if (input.includes('請求書') || input.includes('invoice')) entities.documentType = 'invoice';
        else if (input.includes('見積書') || input.includes('estimate')) entities.documentType = 'estimate';
        else if (input.includes('領収書') || input.includes('receipt')) entities.documentType = 'receipt';
        else if (input.includes('納品書') || input.includes('delivery')) entities.documentType = 'delivery_note';

        // 金額
        const amountMatch = input.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:円|万円)/);
        if (amountMatch) {
          let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (input.includes('万円')) amount *= 10000;
          entities.amount = amount;
        }

        // 会社名
        const companyPattern = /(?:(?:株式会社|有限会社|合同会社)\s*)?[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+(?:株式会社|有限会社|合同会社)?/;
        const companyMatch = input.match(companyPattern);
        if (companyMatch) entities.company = companyMatch[0];

        break;

      case 'analyze_data':
        // 期間
        if (input.includes('今月')) entities.period = 'this_month';
        else if (input.includes('先月')) entities.period = 'last_month';
        else if (input.includes('今年')) entities.period = 'this_year';
        else if (input.includes('昨年')) entities.period = 'last_year';

        // 分析タイプ
        if (input.includes('売上')) entities.analysisType = 'revenue';
        else if (input.includes('経費')) entities.analysisType = 'expense';
        else if (input.includes('利益')) entities.analysisType = 'profit';

        break;

      case 'tax_return':
        // 申告年度
        const taxYearMatch = input.match(/(\d{4})\s*年度?/);
        if (taxYearMatch) entities.taxYear = parseInt(taxYearMatch[1]);
        
        // 申告種類
        if (input.includes('青色申告') || input.includes('青色')) entities.blueTaxReturn = true;
        else if (input.includes('白色申告') || input.includes('白色')) entities.blueTaxReturn = false;
        
        // 事業種別
        if (input.includes('個人事業主') || input.includes('個人')) entities.businessType = 'sole_proprietor';
        else if (input.includes('法人') || input.includes('会社')) entities.businessType = 'corporation';
        else entities.businessType = 'individual';
        
        // e-Tax利用
        if (input.includes('e-Tax') || input.includes('イータックス') || input.includes('電子申告')) {
          entities.electronicFiling = true;
        }
        
        break;

      case 'tax_planning':
        // 対象年度
        const planYearMatch = input.match(/(\d{4})\s*年度?/);
        if (planYearMatch) entities.taxYear = parseInt(planYearMatch[1]);
        
        // 計画タイプ
        if (input.includes('節税') || input.includes('減税')) entities.planType = 'tax_saving';
        else if (input.includes('最適化')) entities.planType = 'optimization';
        else if (input.includes('シミュレーション')) entities.planType = 'simulation';
        
        break;
    }

    return entities;
  }

  // アクション実行
  private async executeAction(intent: any, originalInput: string, context: any): Promise<any> {
    switch (intent.type) {
      case 'create_document':
        // 帳票生成
        const documentData = await this.documentGenerator.generateFromNaturalLanguage(
          originalInput,
          context?.companyId || 'default'
        );
        
        // HTML生成
        const { generateDocumentHTML } = await import('./lib/document-generator');
        const html = generateDocumentHTML(documentData);
        
        // データベース保存
        const saveResult = await baseOrchestrator.runAgent('database-agent', {
          operation: 'create',
          data: {
            type: 'document',
            subtype: documentData.documentType,
            content: documentData,
            html: html,
          },
        });

        return {
          documentData,
          html,
          saved: saveResult.success,
          documentId: saveResult.data?.id,
        };

      case 'process_document':
        // OCR処理
        return await baseOrchestrator.executeDocumentWorkflow({
          filePath: intent.entities.filePath,
          fileType: 'image',
          extractType: intent.entities.extractType || 'receipt',
          autoSave: true,
        });

      case 'analyze_data':
        // データ分析
        const period = intent.entities.period || 'this_month';
        const analysisType = intent.entities.analysisType || 'all';
        
        // 分析実行
        const analysisResult = await this.performAnalysis(period, analysisType);
        
        // レポート生成
        const report = await baseOrchestrator.runAgent('ui-agent', {
          operation: 'generate_ui',
          genericUIConfig: {
            type: 'analysis_report',
            data: analysisResult,
          },
        });

        return {
          analysis: analysisResult,
          report: report.code,
        };

      case 'ask_question':
        // 質問応答
        return await this.answerQuestion(originalInput, context);

      case 'strategic_planning':
        // 戦略立案
        return await this.generateStrategicPlan(originalInput, context);

      default:
        throw new Error(`Unknown intent type: ${intent.type}`);
    }
  }

  // データ分析の実行
  private async performAnalysis(period: string, type: string): Promise<any> {
    const dateRange = this.getDateRange(period);
    
    // データベースから集計
    const result = await baseOrchestrator.runAgent('database-agent', {
      operation: 'aggregate',
      query: {
        startDate: dateRange.start,
        endDate: dateRange.end,
        groupBy: 'category',
        metrics: ['sum', 'count', 'average'],
      },
    });

    return {
      period,
      type,
      data: result.data,
      summary: {
        total: result.data?.total || 0,
        count: result.data?.count || 0,
        average: result.data?.average || 0,
      },
    };
  }

  // 質問応答
  private async answerQuestion(question: string, context: any): Promise<any> {
    // コンテキストを含めてAIに質問
    const prompt = `
以下の質問に対して、データベースのデータを基に回答してください。

質問: "${question}"

利用可能なデータ:
- 売上データ
- 経費データ
- 顧客データ
- 商品データ

具体的で実用的な回答を提供してください。
`;

    const response = await this.mastra.llm.generate({
      prompt,
      maxTokens: 500,
    });

    return {
      question,
      answer: response.text,
      sources: ['database', 'calculations'],
    };
  }

  // 戦略立案
  private async generateStrategicPlan(request: string, context: any): Promise<any> {
    // 現状分析
    const currentState = await this.analyzeCurrentState();
    
    // AI による戦略提案
    const prompt = `
以下のビジネス状況に基づいて、戦略的な提案を行ってください。

リクエスト: "${request}"

現在の状況:
${JSON.stringify(currentState, null, 2)}

以下の観点から提案してください：
1. 短期的改善策（1-3ヶ月）
2. 中期的成長戦略（3-12ヶ月）
3. 長期的ビジョン（1年以上）
4. リスクと対策
5. 必要なリソース
`;

    const response = await this.mastra.llm.generate({
      prompt,
      maxTokens: 1000,
    });

    return {
      request,
      currentState,
      recommendations: this.parseStrategicRecommendations(response.text),
      actionItems: this.generateActionItems(response.text),
    };
  }

  // 応答生成
  private async generateResponse(intent: any, result: any): Promise<string> {
    switch (intent.type) {
      case 'create_document':
        return `${result.documentData.documentType}を作成しました。
文書番号: ${result.documentData.documentNumber}
金額: ¥${result.documentData.total.toLocaleString()}（税込）
${result.saved ? 'データベースに保存しました。' : ''}`;

      case 'process_document':
        return `書類を処理しました。
店舗: ${result.summary?.vendor || '不明'}
金額: ¥${result.summary?.amount?.toLocaleString() || '0'}
カテゴリ: ${result.summary?.category || '未分類'}`;

      case 'analyze_data':
        return `${intent.entities.period}の分析結果：
合計: ¥${result.analysis.summary.total.toLocaleString()}
件数: ${result.analysis.summary.count}件
平均: ¥${result.analysis.summary.average.toLocaleString()}`;

      default:
        return '処理が完了しました。';
    }
  }

  // 提案生成
  private async generateSuggestions(intent: any, result: any): Promise<string[]> {
    const suggestions: string[] = [];

    switch (intent.type) {
      case 'create_document':
        suggestions.push('この書類をメールで送信しますか？');
        suggestions.push('PDFとして保存しますか？');
        if (result.documentData.documentType === 'estimate') {
          suggestions.push('承認されたら請求書を作成しますか？');
        }
        break;

      case 'analyze_data':
        suggestions.push('詳細なレポートを生成しますか？');
        suggestions.push('前期と比較しますか？');
        suggestions.push('改善提案を見ますか？');
        break;
      case 'tax_return':
        suggestions.push('申告書をe-Taxで提出しますか？');
        suggestions.push('控除項目を最適化しますか？');
        suggestions.push('来年の税務計画を立てますか？');
        break;
      case 'tax_planning':
        suggestions.push('具体的な節税対策を実行しますか？');
        suggestions.push('税理士相談を予約しますか？');
        suggestions.push('来年度の計画を立てますか？');
        break;
    }

    return suggestions;
  }

  // ヘルパーメソッド
  private getSuggestedAction(intentType: string): string {
    const actions = {
      create_document: '帳票を生成します',
      process_document: '書類を処理します',
      analyze_data: 'データを分析します',
      ask_question: '質問に回答します',
      manage_data: 'データを管理します',
      strategic_planning: '戦略を立案します',
    };
    return actions[intentType] || '処理を実行します';
  }

  private parseAIIntent(aiResponse: string): string {
    // AI応答から意図タイプを抽出
    const intentTypes = [
      'create_document',
      'process_document',
      'analyze_data',
      'ask_question',
      'manage_data',
      'strategic_planning',
    ];

    for (const type of intentTypes) {
      if (aiResponse.toLowerCase().includes(type)) {
        return type;
      }
    }

    return 'ask_question'; // デフォルト
  }

  private getDateRange(period: string): { start: string; end: string } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'this_month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1, 1);
        end.setDate(0);
        break;
      case 'this_year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case 'last_year':
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }

  private async analyzeCurrentState(): Promise<any> {
    // 現在のビジネス状態を分析
    const lastMonth = this.getDateRange('last_month');
    const thisMonth = this.getDateRange('this_month');

    const [revenue, expenses, customers] = await Promise.all([
      this.performAnalysis('last_month', 'revenue'),
      this.performAnalysis('last_month', 'expense'),
      baseOrchestrator.runAgent('customer-agent', {
        operation: 'list',
        listConfig: { limit: 100 },
      }),
    ]);

    return {
      revenue: revenue.summary,
      expenses: expenses.summary,
      customerCount: customers.data?.length || 0,
      profitMargin: ((revenue.summary.total - expenses.summary.total) / revenue.summary.total * 100).toFixed(2),
    };
  }

  private parseStrategicRecommendations(text: string): any {
    // AIのテキストから構造化された推奨事項を抽出
    return {
      shortTerm: this.extractSection(text, '短期的改善策'),
      midTerm: this.extractSection(text, '中期的成長戦略'),
      longTerm: this.extractSection(text, '長期的ビジョン'),
      risks: this.extractSection(text, 'リスクと対策'),
      resources: this.extractSection(text, '必要なリソース'),
    };
  }

  private extractSection(text: string, sectionName: string): string[] {
    // テキストからセクションを抽出
    const pattern = new RegExp(`${sectionName}[：:]\s*([^1-9]*?)(?=\\d+\\.|$)`, 's');
    const match = text.match(pattern);
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.trim());
    }
    return [];
  }

  private generateActionItems(text: string): any[] {
    // アクションアイテムを生成
    const items: any[] = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.match(/^\d+\./) || line.match(/^[・-]/)) {
        items.push({
          task: line.replace(/^[\d\.\s・-]+/, '').trim(),
          priority: this.determinePriority(line),
          deadline: this.estimateDeadline(line),
        });
      }
    });

    return items;
  }

  private determinePriority(text: string): string {
    if (text.includes('緊急') || text.includes('すぐに')) return 'high';
    if (text.includes('重要')) return 'medium';
    return 'low';
  }

  private estimateDeadline(text: string): string {
    const now = new Date();
    if (text.includes('今週')) {
      now.setDate(now.getDate() + 7);
    } else if (text.includes('今月')) {
      now.setMonth(now.getMonth() + 1);
    } else if (text.includes('3ヶ月')) {
      now.setMonth(now.getMonth() + 3);
    } else {
      now.setMonth(now.getMonth() + 1); // デフォルト1ヶ月
    }
    return now.toISOString().split('T')[0];
  }

  // 確定申告処理
  private async processTaxReturn(originalInput: string, entities: any, context: any): Promise<any> {
    try {
      // 税務エージェントを使用して確定申告処理
      const taxReturnResult = await baseOrchestrator.runAgent('tax-return-agent', {
        operation: 'generate_tax_return',
        taxYear: entities.taxYear || new Date().getFullYear() - 1,
        taxpayerInfo: {
          companyId: context?.companyId || 'default',
          businessType: entities.businessType || 'individual',
          name: entities.taxpayerName || 'デフォルト申告者',
        },
        settings: {
          blueTaxReturn: entities.blueTaxReturn !== false, // デフォルトで青色申告
          electronicFiling: entities.electronicFiling !== false, // デフォルトでe-Tax
          optimizeTax: true,
        },
      });

      if (taxReturnResult.success) {
        // データベースに保存
        const saveResult = await baseOrchestrator.runAgent('database-agent', {
          operation: 'create',
          data: {
            type: 'tax_return',
            taxYear: entities.taxYear || new Date().getFullYear() - 1,
            content: taxReturnResult.data,
            taxpayerId: context?.companyId,
          },
        });

        return {
          success: true,
          taxCalculation: taxReturnResult.taxCalculation,
          documents: taxReturnResult.documents,
          recommendations: taxReturnResult.recommendations,
          saved: saveResult.success,
          taxReturnId: saveResult.data?.id,
        };
      } else {
        throw new Error(taxReturnResult.error || '確定申告処理に失敗しました');
      }
    } catch (error: any) {
      console.error('Tax return processing error:', error);
      return {
        success: false,
        error: error.message,
        recommendations: [
          '年間データが不足している可能性があります',
          '必要書類を確認してください',
          '税理士への相談をご検討ください',
        ],
      };
    }
  }

  // 税務計画生成
  private async generateTaxPlan(originalInput: string, entities: any, context: any): Promise<any> {
    try {
      // 現在の状況分析
      const currentState = await this.analyzeCurrentState();
      
      // 税務計画エージェントを使用
      const taxPlanResult = await baseOrchestrator.runAgent('tax-return-agent', {
        operation: 'optimize_tax',
        taxYear: entities.taxYear || new Date().getFullYear(),
        taxpayerInfo: {
          companyId: context?.companyId || 'default',
          businessType: entities.businessType || 'individual',
        },
        currentState: currentState,
        settings: {
          blueTaxReturn: entities.blueTaxReturn !== false,
          optimizeTax: true,
        },
      });

      if (taxPlanResult.success) {
        // AI による税務戦略提案の拡張
        const strategicAdvice = await this.generateTaxStrategicAdvice(
          originalInput,
          taxPlanResult.data,
          currentState
        );

        return {
          success: true,
          taxPlan: taxPlanResult.data,
          recommendations: [
            ...taxPlanResult.recommendations || [],
            ...strategicAdvice.recommendations || [],
          ],
          actionItems: strategicAdvice.actionItems,
          projectedSavings: taxPlanResult.data?.projectedSavings || 0,
        };
      } else {
        throw new Error(taxPlanResult.error || '税務計画生成に失敗しました');
      }
    } catch (error: any) {
      console.error('Tax planning error:', error);
      return {
        success: false,
        error: error.message,
        recommendations: [
          '税務の専門家にご相談ください',
          '所得や経費の詳細データが必要です',
          '節税対策は計画的に実行しましょう',
        ],
      };
    }
  }

  // 税務戦略アドバイス生成
  private async generateTaxStrategicAdvice(
    request: string,
    taxData: any,
    currentState: any
  ): Promise<any> {
    const prompt = `
以下の税務状況に基づいて、戦略的な税務アドバイスを提供してください。

リクエスト: "${request}"

現在の税務状況:
${JSON.stringify(taxData, null, 2)}

事業状況:
${JSON.stringify(currentState, null, 2)}

以下の観点から具体的なアドバイスをお願いします：
1. 短期的節税対策（今年度中に実行可能）
2. 中期的税務戦略（来年度以降）
3. 控除・減税措置の活用方法
4. リスク管理と対策
5. 税務コンプライアンス強化

実践的で具体的な提案をしてください。
`;

    const response = await this.mastra.llm.generate({
      prompt,
      maxTokens: 1000,
    });

    return {
      request,
      recommendations: this.parseStrategicRecommendations(response.text),
      actionItems: this.generateActionItems(response.text),
      advice: response.text,
    };
  }
}

// シングルトンインスタンス
export const nlpOrchestrator = new NLPOrchestrator();

// 簡易的な使用例
export async function processUserInput(input: string, context?: any) {
  return await nlpOrchestrator.processNaturalLanguage(input, context);
}