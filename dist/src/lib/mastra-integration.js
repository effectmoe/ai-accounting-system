"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastraDatabaseAgent = exports.MastraOcrAgent = exports.MastraJapanTaxAgent = exports.MastraCustomerAgent = exports.MastraAccountingAgent = void 0;
exports.executeMastraAgent = executeMastraAgent;
const mastra_1 = require("@/src/mastra");
const logger_1 = require("@/lib/logger");
const mastra_stats_service_1 = require("@/src/services/mastra-stats.service");
const mastra_tools_registry_1 = require("@/src/lib/mastra-tools-registry");
async function executeMastraAgent(agentName, operation, data, fallbackFunction) {
    const startTime = Date.now();
    try {
        logger_1.logger.info(`Executing Mastra agent: ${agentName}.${operation}`);
        const agents = await mastra_1.mastra.getAgents();
        const agent = agents[agentName];
        if (!agent) {
            logger_1.logger.warn(`Mastra agent ${agentName} not found, falling back to direct execution`);
            mastra_stats_service_1.mastraStatsService.recordExecution({
                agentName,
                operation,
                success: false,
                executionTime: Date.now() - startTime,
                timestamp: new Date(),
                error: 'Agent not found'
            });
            if (fallbackFunction) {
                return await fallbackFunction();
            }
            throw new Error(`Agent ${agentName} not found and no fallback provided`);
        }
        const tool = (0, mastra_tools_registry_1.getTool)(agentName, operation);
        const result = await tool.handler(data);
        mastra_stats_service_1.mastraStatsService.recordExecution({
            agentName,
            operation,
            success: true,
            executionTime: Date.now() - startTime,
            timestamp: new Date()
        });
        logger_1.logger.info(`Mastra agent ${agentName}.${operation} executed successfully`);
        return result;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        mastra_stats_service_1.mastraStatsService.recordExecution({
            agentName,
            operation,
            success: false,
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
            error: errorMessage
        });
        logger_1.logger.error(`Error executing Mastra agent ${agentName}.${operation}:`, error);
        if (fallbackFunction) {
            logger_1.logger.info(`Falling back to direct execution for ${agentName}.${operation}`);
            return await fallbackFunction();
        }
        throw error;
    }
}
exports.MastraAccountingAgent = {
    async createInvoice(invoiceData, fallback) {
        return executeMastraAgent('accountingAgent', 'create_invoice', invoiceData, fallback);
    },
    async categorizeTransaction(transactionData, fallback) {
        return executeMastraAgent('accountingAgent', 'categorize_transaction', transactionData, fallback);
    },
    async generateFinancialReport(reportParams, fallback) {
        return executeMastraAgent('accountingAgent', 'generate_financial_report', reportParams, fallback);
    },
    async calculateTax(taxParams, fallback) {
        return executeMastraAgent('accountingAgent', 'calculate_tax', taxParams, fallback);
    }
};
exports.MastraCustomerAgent = {
    async createCustomer(customerData, fallback) {
        return executeMastraAgent('customerAgent', 'create_customer', customerData, fallback);
    },
    async updateCustomer(updateData, fallback) {
        return executeMastraAgent('customerAgent', 'update_customer', updateData, fallback);
    },
    async searchCustomers(searchParams, fallback) {
        return executeMastraAgent('customerAgent', 'search_customers', searchParams, fallback);
    },
    async analyzeCustomer(analysisParams, fallback) {
        return executeMastraAgent('customerAgent', 'analyze_customer', analysisParams, fallback);
    }
};
exports.MastraJapanTaxAgent = {
    async calculateConsumptionTax(taxData, fallback) {
        return executeMastraAgent('japanTaxAgent', 'calculate_consumption_tax', taxData, fallback);
    },
    async validateInvoiceNumber(invoiceData, fallback) {
        return executeMastraAgent('japanTaxAgent', 'validate_invoice_number', invoiceData, fallback);
    },
    async calculateWithholdingTax(taxData, fallback) {
        return executeMastraAgent('japanTaxAgent', 'calculate_withholding_tax', taxData, fallback);
    },
    async generateTaxReport(reportParams, fallback) {
        return executeMastraAgent('japanTaxAgent', 'generate_tax_report', reportParams, fallback);
    }
};
exports.MastraOcrAgent = {
    async processDocumentImage(imageData, fallback) {
        return executeMastraAgent('ocrAgent', 'process_document_image', imageData, fallback);
    },
    async extractReceiptData(receiptData, fallback) {
        return executeMastraAgent('ocrAgent', 'extract_receipt_data', receiptData, fallback);
    },
    async extractInvoiceData(invoiceData, fallback) {
        return executeMastraAgent('ocrAgent', 'extract_invoice_data', invoiceData, fallback);
    },
    async batchProcessDocuments(documentsData, fallback) {
        return executeMastraAgent('ocrAgent', 'batch_process_documents', documentsData, fallback);
    }
};
exports.MastraDatabaseAgent = {
    async executeQuery(queryData, fallback) {
        return executeMastraAgent('databaseAgent', 'execute_query', queryData, fallback);
    },
    async createAggregationPipeline(pipelineData, fallback) {
        return executeMastraAgent('databaseAgent', 'create_aggregation_pipeline', pipelineData, fallback);
    },
    async manageIndexes(indexData, fallback) {
        return executeMastraAgent('databaseAgent', 'manage_indexes', indexData, fallback);
    },
    async backupDatabase(backupData, fallback) {
        return executeMastraAgent('databaseAgent', 'backup_database', backupData, fallback);
    }
};
//# sourceMappingURL=mastra-integration.js.map