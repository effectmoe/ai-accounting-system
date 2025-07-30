import { mastra } from '@/src/mastra';
import { logger } from '@/lib/logger';
import { mastraStatsService } from '@/src/services/mastra-stats.service';
import { getTool } from '@/src/lib/mastra-tools-registry';

export interface MastraAgentRequest {
  agentName: string;
  operation: string;
  data: any;
}

export interface MastraAgentResponse {
  success: boolean;
  result?: any;
  error?: string;
  executedBy: string;
  timestamp: string;
}

/**
 * Mastraエージェントを実行するヘルパー関数
 * 既存の機能を壊さないために、エラー時は既存の処理にフォールバック
 */
export async function executeMastraAgent(
  agentName: string,
  operation: string,
  data: any,
  fallbackFunction?: () => Promise<any>
): Promise<any> {
  const startTime = Date.now();
  
  try {
    logger.info(`Executing Mastra agent: ${agentName}.${operation}`, { data });
    
    // Mastraエージェントを取得
    const agents = await mastra.getAgents();
    const agent = agents[agentName];
    
    if (!agent) {
      logger.warn(`Mastra agent ${agentName} not found, falling back to direct execution`);
      
      // 統計を記録
      mastraStatsService.recordExecution({
        agentName,
        operation,
        success: false,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        error: 'Agent not found'
      });
      
      if (fallbackFunction) {
        logger.info('Using fallback function for operation');
        return await fallbackFunction();
      }
      throw new Error(`Agent ${agentName} not found and no fallback provided`);
    }
    
    // エージェントを実行
    // Mastraエージェントのツールに直接アクセスできないため、
    // ツールレジストリから取得
    try {
      const tool = getTool(agentName, operation);
      logger.debug(`Found tool: ${tool.name} for agent: ${agentName}`);
      const result = await tool.handler(data);
      
      // 成功統計を記録
      mastraStatsService.recordExecution({
        agentName,
        operation,
        success: true,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      });
      
      logger.info(`Mastra agent ${agentName}.${operation} executed successfully`);
      return result;
    } catch (toolError) {
      logger.error(`Tool execution error for ${agentName}.${operation}:`, {
        error: toolError instanceof Error ? toolError.message : toolError,
        stack: toolError instanceof Error ? toolError.stack : undefined
      });
      
      // ツールが見つからない場合もフォールバックを試す
      if (fallbackFunction) {
        logger.info(`Tool not found or failed, falling back to direct execution for ${agentName}.${operation}`);
        return await fallbackFunction();
      }
      throw toolError;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // エラー統計を記録
    mastraStatsService.recordExecution({
      agentName,
      operation,
      success: false,
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
      error: errorMessage
    });
    
    logger.error(`Error executing Mastra agent ${agentName}.${operation}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      data
    });
    
    // エラー時は既存の処理にフォールバック
    if (fallbackFunction) {
      logger.info(`Error occurred, falling back to direct execution for ${agentName}.${operation}`);
      return await fallbackFunction();
    }
    
    throw error;
  }
}

/**
 * 会計エージェントの便利なラッパー関数
 */
export const MastraAccountingAgent = {
  async createInvoice(invoiceData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('accountingAgent', 'create_invoice', invoiceData, fallback);
  },
  
  async categorizeTransaction(transactionData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('accountingAgent', 'categorize_transaction', transactionData, fallback);
  },
  
  async generateFinancialReport(reportParams: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('accountingAgent', 'generate_financial_report', reportParams, fallback);
  },
  
  async calculateTax(taxParams: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('accountingAgent', 'calculate_tax', taxParams, fallback);
  }
};

/**
 * 顧客エージェントの便利なラッパー関数
 */
export const MastraCustomerAgent = {
  async createCustomer(customerData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('customerAgent', 'create_customer', customerData, fallback);
  },
  
  async updateCustomer(updateData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('customerAgent', 'update_customer', updateData, fallback);
  },
  
  async searchCustomers(searchParams: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('customerAgent', 'search_customers', searchParams, fallback);
  },
  
  async analyzeCustomer(analysisParams: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('customerAgent', 'analyze_customer', analysisParams, fallback);
  }
};

/**
 * 日本税制エージェントの便利なラッパー関数
 */
export const MastraJapanTaxAgent = {
  async calculateConsumptionTax(taxData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('japanTaxAgent', 'calculate_consumption_tax', taxData, fallback);
  },
  
  async validateInvoiceNumber(invoiceData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('japanTaxAgent', 'validate_invoice_number', invoiceData, fallback);
  },
  
  async calculateWithholdingTax(taxData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('japanTaxAgent', 'calculate_withholding_tax', taxData, fallback);
  },
  
  async generateTaxReport(reportParams: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('japanTaxAgent', 'generate_tax_report', reportParams, fallback);
  }
};

/**
 * OCRエージェントの便利なラッパー関数
 */
export const MastraOcrAgent = {
  async processDocumentImage(imageData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('ocrAgent', 'process_document_image', imageData, fallback);
  },
  
  async extractReceiptData(receiptData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('ocrAgent', 'extract_receipt_data', receiptData, fallback);
  },
  
  async extractInvoiceData(invoiceData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('ocrAgent', 'extract_invoice_data', invoiceData, fallback);
  },
  
  async batchProcessDocuments(documentsData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('ocrAgent', 'batch_process_documents', documentsData, fallback);
  }
};

/**
 * データベースエージェントの便利なラッパー関数
 */
export const MastraDatabaseAgent = {
  async executeQuery(queryData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('databaseAgent', 'execute_query', queryData, fallback);
  },
  
  async createAggregationPipeline(pipelineData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('databaseAgent', 'create_aggregation_pipeline', pipelineData, fallback);
  },
  
  async manageIndexes(indexData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('databaseAgent', 'manage_indexes', indexData, fallback);
  },
  
  async backupDatabase(backupData: any, fallback?: () => Promise<any>) {
    return executeMastraAgent('databaseAgent', 'backup_database', backupData, fallback);
  }
};