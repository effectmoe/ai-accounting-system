#!/usr/bin/env node
declare class AccountingMCPServer {
    private server;
    constructor();
    private setupToolHandlers;
    private categorizeTransaction;
    private createJournalEntry;
    private generateReport;
    run(): Promise<void>;
}
export { AccountingMCPServer };
