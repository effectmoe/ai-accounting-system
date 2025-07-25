#!/usr/bin/env node
declare class AccountingMCPServer {
    private server;
    constructor();
    private setupToolHandlers;
    private categorizeTransaction;
    private createJournalEntry;
    private generateReport;
    private createInvoice;
    private getAnalytics;
    private getCategoryBreakdown;
    private calculateTax;
    run(): Promise<void>;
}
export { AccountingMCPServer };
