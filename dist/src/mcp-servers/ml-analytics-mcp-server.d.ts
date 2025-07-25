#!/usr/bin/env node
declare class MLAnalyticsMCPServer {
    private server;
    private mlAnalytics;
    constructor();
    private setupToolHandlers;
    private handleMLAnalyze;
    private handleHealthCheck;
    private handleQuickAnalysis;
    private handlePredict;
    private handleDetectAnomalies;
    private handleCluster;
    run(): Promise<void>;
}
export { MLAnalyticsMCPServer };
