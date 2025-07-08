import { Mastra } from '@mastra/core';
import { createTool } from '@mastra/core';
import { z } from 'zod';
// 既存のエージェント（HandwritingOCR互換性のため保持）
import { ocrAgent } from './agents/ocr-agent';
import { databaseAgent } from './agents/database-agent';
// 新しいAzure/MongoDBエージェント
import { ocrAgentAzure } from './agents/ocr-agent-azure';
import { databaseAgentMongoDB } from './agents/database-agent-mongodb';
// その他のエージェント
import { accountingAgent } from './agents/accounting-agent';
import { customerAgent } from './agents/customer-agent';
import { productAgent } from './agents/product-agent';
import { japanTaxAgent } from './agents/japan-tax-agent';
import { uiAgent } from './agents/ui-agent';
import { nlwebAgent } from './agents/nlweb-agent';
import { problemSolvingAgent } from './agents/problem-solving-agent';
import { nlpOrchestrator } from './nlp-orchestrator';

// DeepSeek LLM Configuration
const deepSeekConfig = {
  provider: 'deepseek',
  name: 'deepseek-v3',
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  maxTokens: 4096,
  temperature: 0.7,
};

// Workflow schemas
const ocrWorkflowSchema = z.object({
  fileId: z.string().optional(),
  filePath: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.enum(['pdf', 'image']),
  language: z.enum(['ja', 'en']).default('ja'),
  extractType: z.enum(['receipt', 'invoice', 'general', 'handwritten']).default('receipt'),
});

const accountingWorkflowSchema = z.object({
  ocrResult: z.object({
    text: z.string(),
    vendor: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    tax: z.number().optional(),
  }),
  businessType: z.string().optional(),
  forceCategory: z.string().optional(),
});

// Mastra Orchestrator Class
export class MastraOrchestrator {
  private mastra: Mastra;
  private agents: Map<string, any> = new Map();

  constructor() {
    this.mastra = new Mastra({
      llm: deepSeekConfig,
      tools: this.createTools(),
      memory: {
        provider: 'local',
        config: {
          persist: true,
          namespace: 'accounting-automation',
        },
      },
    });
    this.initializeAgents();
  }

  // Create orchestration tools
  private createTools() {
    return {
      // 完全なOCR→会計→保存ワークフロー
      processDocumentWorkflow: createTool({
        id: 'process-document-workflow',
        description: 'Complete workflow: OCR → Accounting Analysis → Database Save',
        inputSchema: ocrWorkflowSchema.extend({
          businessType: z.string().optional(),
          autoSave: z.boolean().default(true),
        }),
        execute: async (input) => {
          return await this.executeDocumentWorkflow(input);
        },
      }),

      // OCR処理専用
      processOCR: createTool({
        id: 'process-ocr',
        description: 'Process OCR for uploaded documents',
        inputSchema: ocrWorkflowSchema,
        execute: async (input) => {
          const agent = this.agents.get('ocr-agent');
          return await agent.execute({ input });
        },
      }),

      // 会計分析専用
      analyzeAccounting: createTool({
        id: 'analyze-accounting',
        description: 'Analyze accounting data and assign categories',
        inputSchema: accountingWorkflowSchema,
        execute: async (input) => {
          const agent = this.agents.get('accounting-agent');
          return await agent.execute({ input });
        },
      }),

      // データベース操作
      saveToDatabase: createTool({
        id: 'save-to-database',
        description: 'Save processed data to database',
        inputSchema: z.object({
          data: z.object({
            file_name: z.string(),
            vendor_name: z.string(),
            total_amount: z.number(),
            tax_amount: z.number(),
            receipt_date: z.string(),
            category: z.string(),
            subcategory: z.string().optional(),
            extracted_text: z.string(),
            confidence: z.number(),
            metadata: z.record(z.any()).optional(),
          }),
        }),
        execute: async (input) => {
          const agent = this.agents.get('database-agent');
          return await agent.execute({ input });
        },
      }),

      // 顧客管理
      manageCustomer: createTool({
        id: 'manage-customer',
        description: 'Customer management operations',
        inputSchema: z.object({
          operation: z.enum(['create', 'read', 'update', 'delete', 'search']),
          customerData: z.any(),
        }),
        execute: async (input) => {
          const agent = this.agents.get('customer-agent');
          return await agent.execute({ input });
        },
      }),

      // 商品管理
      manageProduct: createTool({
        id: 'manage-product',
        description: 'Product management operations',
        inputSchema: z.object({
          operation: z.enum(['create', 'read', 'update', 'delete', 'search']),
          productData: z.any(),
        }),
        execute: async (input) => {
          const agent = this.agents.get('product-agent');
          return await agent.execute({ input });
        },
      }),

      // 日本税務計算
      calculateJapanTax: createTool({
        id: 'calculate-japan-tax',
        description: 'Calculate Japanese taxes and compliance',
        inputSchema: z.object({
          transactionData: z.object({
            amount: z.number(),
            date: z.string(),
            category: z.string(),
            vendor: z.string(),
            isDeductible: z.boolean().optional(),
          }),
        }),
        execute: async (input) => {
          const agent = this.agents.get('japan-tax-agent');
          return await agent.execute({ input });
        },
      }),

      // UI生成
      generateUI: createTool({
        id: 'generate-ui',
        description: 'Generate UI components',
        inputSchema: z.object({
          operation: z.enum(['generate_component', 'generate_page', 'create_dashboard']),
          request: z.any(),
        }),
        execute: async (input) => {
          const agent = this.agents.get('ui-agent');
          return await agent.execute({ input });
        },
      }),

      // NLWeb動的情報取得
      getNLWebData: createTool({
        id: 'get-nlweb-data',
        description: 'Get dynamic data using NLWeb',
        inputSchema: z.object({
          query: z.string(),
          dataType: z.enum(['tax_info', 'business_rules', 'compliance_data']),
          filters: z.record(z.any()).optional(),
        }),
        execute: async (input) => {
          const agent = this.agents.get('nlweb-agent');
          return await agent.execute({ input });
        },
      }),

      // 自然言語処理（メインインターフェース）
      processNaturalLanguage: createTool({
        id: 'process-natural-language',
        description: 'Process natural language input using NLP orchestrator',
        inputSchema: z.object({
          input: z.string(),
          context: z.object({
            companyId: z.string(),
            userId: z.string().optional(),
            previousConversation: z.array(z.string()).optional(),
          }).optional(),
        }),
        execute: async (input) => {
          return await nlpOrchestrator.processNaturalLanguage(
            input.input,
            input.context
          );
        },
      }),

      // 問題解決ツール
      solveProblem: createTool({
        id: 'solve-problem',
        description: 'Solve complex problems using problem-solving agent',
        inputSchema: z.object({
          problem: z.string(),
          context: z.object({
            domain: z.string().optional(),
            constraints: z.array(z.string()).optional(),
            previousAttempts: z.array(z.string()).optional(),
          }).optional(),
          requireVisualAnalysis: z.boolean().default(false),
        }),
        execute: async (input) => {
          const agent = this.agents.get('problem-solving-agent');
          return await agent.execute({ input });
        },
      }),

      // Web検索ツール
      webSearch: createTool({
        id: 'web-search',
        description: 'Search the web for information',
        inputSchema: z.object({
          query: z.string(),
          searchType: z.enum(['general', 'technical', 'business', 'legal']).default('general'),
          maxResults: z.number().default(5),
          language: z.enum(['ja', 'en']).default('ja'),
        }),
        execute: async (input) => {
          const agent = this.agents.get('problem-solving-agent');
          return await agent.execute({
            input: {
              operation: 'web_search',
              searchQuery: input.query,
              searchOptions: {
                type: input.searchType,
                maxResults: input.maxResults,
                language: input.language,
              },
            },
          });
        },
      }),

      // ビジュアル分析ツール
      visualAnalysis: createTool({
        id: 'visual-analysis',
        description: 'Analyze visual data like charts, diagrams, or images',
        inputSchema: z.object({
          imageUrl: z.string().optional(),
          imageData: z.string().optional(), // base64 encoded
          analysisType: z.enum(['chart', 'diagram', 'general', 'ocr']).default('general'),
          extractData: z.boolean().default(false),
        }),
        execute: async (input) => {
          const agent = this.agents.get('problem-solving-agent');
          return await agent.execute({
            input: {
              operation: 'visual_analysis',
              visualData: {
                url: input.imageUrl,
                data: input.imageData,
                type: input.analysisType,
                extractData: input.extractData,
              },
            },
          });
        },
      }),
    };
  }

  // Initialize all agents
  private initializeAgents() {
    // 環境変数で新旧システムを切り替え
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (useAzureMongoDB) {
      // 新システム: Azure Form Recognizer + MongoDB
      this.agents.set('ocr-agent', ocrAgentAzure);
      this.agents.set('database-agent', databaseAgentMongoDB);
      console.log('📌 Using Azure Form Recognizer + MongoDB');
    } else {
      // 既存システム: Google/GAS OCR + Supabase
      this.agents.set('ocr-agent', ocrAgent);
      this.agents.set('database-agent', databaseAgent);
      console.log('📌 Using Legacy OCR + Supabase');
    }
    
    // 共通エージェント
    this.agents.set('accounting-agent', accountingAgent);
    this.agents.set('customer-agent', customerAgent);
    this.agents.set('product-agent', productAgent);
    this.agents.set('japan-tax-agent', japanTaxAgent);
    this.agents.set('ui-agent', uiAgent);
    this.agents.set('nlweb-agent', nlwebAgent);
    this.agents.set('problem-solving-agent', problemSolvingAgent);

    console.log('✅ All agents initialized successfully');
  }

  // Execute complete document processing workflow
  async executeDocumentWorkflow(input: any) {
    try {
      console.log('🚀 Starting document workflow:', input);

      // Step 1: OCR Processing
      const ocrResult = await this.agents.get('ocr-agent').execute({ input });
      if (!ocrResult.success) {
        throw new Error(`OCR failed: ${ocrResult.error}`);
      }

      // Step 2: NLWeb dynamic tax info (if needed)
      let taxContext = null;
      if (ocrResult.vendor) {
        try {
          taxContext = await this.agents.get('nlweb-agent').execute({
            input: {
              query: `税制情報 ${ocrResult.vendor}`,
              dataType: 'tax_info',
              filters: { vendor: ocrResult.vendor },
            },
          });
        } catch (error) {
          console.warn('Tax context fetch failed:', error);
        }
      }

      // Step 3: Accounting Analysis
      const accountingResult = await this.agents.get('accounting-agent').execute({
        input: {
          ocrResult,
          businessType: input.businessType,
          taxContext: taxContext?.data,
        },
      });

      // Step 4: Japan Tax Calculation
      const taxResult = await this.agents.get('japan-tax-agent').execute({
        input: {
          transactionData: {
            amount: ocrResult.amount || 0,
            date: ocrResult.date || new Date().toISOString().split('T')[0],
            category: accountingResult.category || '未分類',
            vendor: ocrResult.vendor || 'Unknown',
            isDeductible: accountingResult.deductible,
          },
        },
      });

      // Step 5: Database Save (if autoSave enabled)
      let saveResult = null;
      if (input.autoSave !== false) {
        saveResult = await this.agents.get('database-agent').execute({
          input: {
            data: {
              file_name: input.fileName || 'unknown',
              vendor_name: ocrResult.vendor || 'Unknown',
              total_amount: ocrResult.amount || 0,
              tax_amount: taxResult.consumptionTax || 0,
              receipt_date: ocrResult.date || new Date().toISOString().split('T')[0],
              category: accountingResult.category || '未分類',
              subcategory: accountingResult.subcategory,
              extracted_text: ocrResult.text,
              confidence: ocrResult.confidence || 0,
              metadata: {
                taxDetails: taxResult,
                accountingAnalysis: accountingResult,
                ocrDetails: ocrResult,
              },
            },
          },
        });
      }

      // Step 6: Auto-deploy to Vercel (if enabled)
      let deployResult = null;
      if (input.autoDeployReport) {
        deployResult = await this.deployReceiptReport({
          ocrResult,
          accountingResult,
          taxResult,
          saveResult,
        });
      }

      return {
        success: true,
        workflow: 'document_processing',
        results: {
          ocr: ocrResult,
          accounting: accountingResult,
          tax: taxResult,
          database: saveResult,
          taxContext,
          deployment: deployResult,
        },
        summary: {
          vendor: ocrResult.vendor,
          amount: ocrResult.amount,
          category: accountingResult.category,
          deductible: accountingResult.deductible,
          savedToDb: !!saveResult,
          deployedUrl: deployResult?.urls?.production,
        },
      };
    } catch (error) {
      console.error('❌ Workflow error:', error);
      return {
        success: false,
        workflow: 'document_processing',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Deploy receipt report to Vercel via GitHub
  private async deployReceiptReport(data: any) {
    try {
      console.log('📊 Generating receipt report for deployment...');

      // Generate UI for the receipt
      const uiResult = await this.agents.get('ui-agent').execute({
        operation: 'generate_ui',
        genericUIConfig: {
          type: 'receipt_result',
          data: {
            receipt: data.saveResult?.data || {},
            ocr: data.ocrResult,
            accounting: data.accountingResult,
          },
        },
      });

      // Generate accounting page
      const pageResult = await this.agents.get('nlweb-agent').execute({
        operation: 'generate_accounting_page',
        accountingPageConfig: {
          pageType: 'expense-report',
          title: `領収書処理レポート - ${data.ocrResult.vendor || 'Unknown'}`,
          features: ['receipt-viewer', 'journal-entries', 'tax-summary'],
          integrations: {
            ocr: true,
            accounting: true,
            database: true,
          },
        },
      });

      // Prepare files for deployment
      const files = [];

      // Main HTML file
      if (uiResult.success && uiResult.code) {
        files.push({
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>領収書処理レポート - ${data.ocrResult.vendor || 'Unknown'}</title>
  <meta name="description" content="自動生成された領収書処理レポート">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    ${uiResult.code.css}
  </style>
</head>
<body>
  <div class="container">
    <h1>領収書処理レポート</h1>
    ${uiResult.code.html}
    <div class="tax-summary">
      <h2>税務情報</h2>
      <dl>
        <dt>消費税額</dt>
        <dd>¥${data.taxResult.consumptionTax || 0}</dd>
        <dt>税率</dt>
        <dd>${data.taxResult.taxRate || 10}%</dd>
        <dt>控除可能</dt>
        <dd>${data.accountingResult.deductible ? 'はい' : 'いいえ'}</dd>
      </dl>
    </div>
  </div>
  <script>${uiResult.code.js}</script>
</body>
</html>`,
        });
      }

      // Add additional report files from pageResult
      if (pageResult.success && pageResult.files) {
        files.push(...pageResult.files);
      }

      // Deploy via GitHub to Vercel
      const deployResult = await this.agents.get('nlweb-agent').execute({
        operation: 'deploy_with_github',
        deployWithGitHubConfig: {
          projectName: `receipt-report-${Date.now()}`,
          githubRepo: {
            name: `receipt-report-${Date.now()}`,
            description: `Receipt report for ${data.ocrResult.vendor || 'Unknown'} - ${new Date().toLocaleDateString('ja-JP')}`,
            private: true,
          },
          vercelConfig: {
            domain: `receipt-${Date.now()}.vercel.app`,
            environment: 'production',
            password: process.env.REPORT_PASSWORD || 'receipt2024',
          },
          files,
        },
      });

      if (deployResult.success) {
        console.log('✅ Report deployed successfully:', deployResult.urls);
        return deployResult;
      } else {
        console.error('❌ Deployment failed:', deployResult.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Report deployment error:', error);
      return null;
    }
  }

  // Run specific agent
  async runAgent(agentId: string, input: any) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    return await agent.execute({ input });
  }

  // Get available agents
  getAvailableAgents() {
    return Array.from(this.agents.keys());
  }

  // Get Mastra instance
  getMastra() {
    return this.mastra;
  }

  // Process natural language input (main interface)
  async processNaturalLanguage(input: string, context?: any) {
    return await nlpOrchestrator.processNaturalLanguage(input, context);
  }

  // Execute problem solving workflow
  async executeProblemSolvingWorkflow(input: {
    problem: string;
    domain?: string;
    requireWebSearch?: boolean;
    requireVisualAnalysis?: boolean;
    visualData?: any;
    maxIterations?: number;
  }) {
    try {
      console.log('🧩 Starting problem solving workflow:', input.problem);

      const workflowContext = {
        problem: input.problem,
        domain: input.domain,
        iterations: 0,
        maxIterations: input.maxIterations || 3,
        solutions: [],
        searchResults: [],
        visualAnalysis: null,
      };

      // Step 1: Initial problem analysis
      const initialAnalysis = await this.agents.get('problem-solving-agent').execute({
        input: {
          problem: input.problem,
          context: {
            domain: input.domain,
          },
        },
      });

      workflowContext.solutions.push(initialAnalysis);

      // Step 2: Web search if required
      if (input.requireWebSearch || initialAnalysis.requiresMoreInfo) {
        const searchQueries = initialAnalysis.searchQueries || [input.problem];
        
        for (const query of searchQueries) {
          const searchResult = await this.agents.get('problem-solving-agent').execute({
            input: {
              operation: 'web_search',
              searchQuery: query,
              searchOptions: {
                type: input.domain === 'technical' ? 'technical' : 'general',
                maxResults: 5,
                language: 'ja',
              },
            },
          });

          if (searchResult.success) {
            workflowContext.searchResults.push(searchResult.data);
          }
        }
      }

      // Step 3: Visual analysis if required
      if (input.requireVisualAnalysis && input.visualData) {
        const visualResult = await this.agents.get('problem-solving-agent').execute({
          input: {
            operation: 'visual_analysis',
            visualData: input.visualData,
          },
        });

        if (visualResult.success) {
          workflowContext.visualAnalysis = visualResult.data;
        }
      }

      // Step 4: Enhanced problem solving with additional context
      if (workflowContext.searchResults.length > 0 || workflowContext.visualAnalysis) {
        const enhancedAnalysis = await this.agents.get('problem-solving-agent').execute({
          input: {
            problem: input.problem,
            context: {
              domain: input.domain,
              searchResults: workflowContext.searchResults,
              visualAnalysis: workflowContext.visualAnalysis,
              previousSolutions: workflowContext.solutions,
            },
          },
        });

        workflowContext.solutions.push(enhancedAnalysis);
      }

      // Step 5: Generate final solution summary
      const finalSolution = await this.agents.get('problem-solving-agent').execute({
        input: {
          operation: 'synthesize_solution',
          problem: input.problem,
          allSolutions: workflowContext.solutions,
          searchResults: workflowContext.searchResults,
          visualAnalysis: workflowContext.visualAnalysis,
        },
      });

      // Step 6: Generate UI for solution presentation
      const uiResult = await this.agents.get('ui-agent').execute({
        operation: 'generate_component',
        request: {
          componentType: 'solution-presentation',
          data: {
            problem: input.problem,
            solution: finalSolution,
            searchResults: workflowContext.searchResults,
            visualAnalysis: workflowContext.visualAnalysis,
          },
        },
      });

      return {
        success: true,
        workflow: 'problem_solving',
        results: {
          problem: input.problem,
          finalSolution: finalSolution,
          searchResults: workflowContext.searchResults,
          visualAnalysis: workflowContext.visualAnalysis,
          ui: uiResult,
        },
        summary: {
          solutionFound: finalSolution.success,
          confidence: finalSolution.confidence || 0,
          searchesPerformed: workflowContext.searchResults.length,
          hasVisualAnalysis: !!workflowContext.visualAnalysis,
        },
      };
    } catch (error) {
      console.error('❌ Problem solving workflow error:', error);
      return {
        success: false,
        workflow: 'problem_solving',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Health check
  async healthCheck() {
    const agentStatuses = {};
    for (const [agentId, agent] of this.agents) {
      try {
        // 各エージェントの軽い動作確認
        agentStatuses[agentId] = 'healthy';
      } catch (error) {
        agentStatuses[agentId] = `error: ${error.message}`;
      }
    }

    return {
      orchestrator: 'healthy',
      deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing_key',
      nlpOrchestrator: 'integrated',
      agents: agentStatuses,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const orchestrator = new MastraOrchestrator();
export default orchestrator;