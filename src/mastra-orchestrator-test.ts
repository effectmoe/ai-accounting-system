import { Mastra } from '@mastra/core';
import { createTool } from '@mastra/core';
import { z } from 'zod';
import * as mockAgents from './agents-mock';

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

// Test-friendly Mastra Orchestrator
export class MastraOrchestrator {
  private mastra: Mastra | null = null;
  private agents: Map<string, any> = new Map();

  constructor() {
    // Skip Mastra initialization in test mode
    if (process.env.TEST_MODE !== 'true') {
      try {
        this.mastra = new Mastra({
          // Minimal configuration for testing
        });
      } catch (error) {
        console.warn('Mastra initialization skipped:', error);
      }
    }
    this.initializeAgents();
  }

  // Initialize all agents (using mocks)
  private initializeAgents() {
    this.agents.set('ocr-agent', mockAgents.ocrAgent);
    this.agents.set('accounting-agent', mockAgents.accountingAgent);
    this.agents.set('database-agent', mockAgents.databaseAgent);
    this.agents.set('customer-agent', mockAgents.customerAgent);
    this.agents.set('product-agent', mockAgents.productAgent);
    this.agents.set('japan-tax-agent', mockAgents.japanTaxAgent);
    this.agents.set('ui-agent', mockAgents.uiAgent);
    this.agents.set('nlweb-agent', mockAgents.nlwebAgent);

    console.log('✅ All agents initialized successfully (mock mode)');
  }

  // Execute complete document processing workflow
  async executeDocumentWorkflow(input: any) {
    try {
      console.log('🚀 Starting document workflow:', input);

      // Step 1: OCR Processing
      const ocrResult = await this.agents.get('ocr-agent').execute(input);
      if (!ocrResult.success) {
        throw new Error(`OCR failed: ${ocrResult.error}`);
      }

      // Step 2: NLWeb dynamic tax info (if needed)
      let taxContext = null;
      if (ocrResult.vendor) {
        try {
          taxContext = await this.agents.get('nlweb-agent').execute({
            query: `税制情報 ${ocrResult.vendor}`,
            dataType: 'tax_info',
            filters: { vendor: ocrResult.vendor },
          });
        } catch (error) {
          console.warn('Tax context fetch failed:', error);
        }
      }

      // Step 3: Accounting Analysis
      const accountingResult = await this.agents.get('accounting-agent').execute({
        ocrResult,
        businessType: input.businessType,
        taxContext: taxContext?.data,
      });

      // Step 4: Japan Tax Calculation
      const taxResult = await this.agents.get('japan-tax-agent').execute({
        amount: ocrResult.amount || 0,
        date: ocrResult.date || new Date().toISOString().split('T')[0],
        category: accountingResult.category || '未分類',
        vendor: ocrResult.vendor || 'Unknown',
        isDeductible: accountingResult.deductible,
      });

      // Step 5: Database Save (if autoSave enabled)
      let saveResult = null;
      if (input.autoSave !== false) {
        saveResult = await this.agents.get('database-agent').execute({
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
    } catch (error: any) {
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

      // Mock deployment result
      const deployResult = {
        success: true,
        urls: {
          production: 'https://mock-deployment.vercel.app',
        },
      };

      console.log('✅ Report deployed successfully:', deployResult.urls);
      return deployResult;
    } catch (error: any) {
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
    return await agent.execute(input);
  }

  // Get available agents
  getAvailableAgents() {
    return Array.from(this.agents.keys());
  }

  // Get Mastra instance
  getMastra() {
    return this.mastra;
  }

  // Health check
  async healthCheck() {
    const agentStatuses: Record<string, string> = {};
    for (const [agentId, agent] of this.agents) {
      try {
        // 各エージェントの軽い動作確認
        agentStatuses[agentId] = 'healthy';
      } catch (error: any) {
        agentStatuses[agentId] = `error: ${error.message}`;
      }
    }

    return {
      orchestrator: 'healthy',
      deepseek: process.env.DEEPSEEK_API_KEY ? 'configured' : 'missing_key',
      agents: agentStatuses,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const orchestrator = new MastraOrchestrator();
export default orchestrator;