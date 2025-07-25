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
export declare function executeMastraAgent(agentName: string, operation: string, data: any, fallbackFunction?: () => Promise<any>): Promise<any>;
export declare const MastraAccountingAgent: {
    createInvoice(invoiceData: any, fallback?: () => Promise<any>): Promise<any>;
    categorizeTransaction(transactionData: any, fallback?: () => Promise<any>): Promise<any>;
    generateFinancialReport(reportParams: any, fallback?: () => Promise<any>): Promise<any>;
    calculateTax(taxParams: any, fallback?: () => Promise<any>): Promise<any>;
};
export declare const MastraCustomerAgent: {
    createCustomer(customerData: any, fallback?: () => Promise<any>): Promise<any>;
    updateCustomer(updateData: any, fallback?: () => Promise<any>): Promise<any>;
    searchCustomers(searchParams: any, fallback?: () => Promise<any>): Promise<any>;
    analyzeCustomer(analysisParams: any, fallback?: () => Promise<any>): Promise<any>;
};
export declare const MastraJapanTaxAgent: {
    calculateConsumptionTax(taxData: any, fallback?: () => Promise<any>): Promise<any>;
    validateInvoiceNumber(invoiceData: any, fallback?: () => Promise<any>): Promise<any>;
    calculateWithholdingTax(taxData: any, fallback?: () => Promise<any>): Promise<any>;
    generateTaxReport(reportParams: any, fallback?: () => Promise<any>): Promise<any>;
};
export declare const MastraOcrAgent: {
    processDocumentImage(imageData: any, fallback?: () => Promise<any>): Promise<any>;
    extractReceiptData(receiptData: any, fallback?: () => Promise<any>): Promise<any>;
    extractInvoiceData(invoiceData: any, fallback?: () => Promise<any>): Promise<any>;
    batchProcessDocuments(documentsData: any, fallback?: () => Promise<any>): Promise<any>;
};
export declare const MastraDatabaseAgent: {
    executeQuery(queryData: any, fallback?: () => Promise<any>): Promise<any>;
    createAggregationPipeline(pipelineData: any, fallback?: () => Promise<any>): Promise<any>;
    manageIndexes(indexData: any, fallback?: () => Promise<any>): Promise<any>;
    backupDatabase(backupData: any, fallback?: () => Promise<any>): Promise<any>;
};
