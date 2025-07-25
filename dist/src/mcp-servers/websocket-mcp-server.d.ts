#!/usr/bin/env node
declare class WebSocketMCPServer {
    private server;
    constructor();
    private setupToolHandlers;
    private handleStartServer;
    private handleStopServer;
    private handleGetStats;
    private handleSendProgress;
    private handleSendStatus;
    private handleSendResult;
    private handleSendError;
    private handleSendLog;
    private handleBroadcastToAll;
    private handleHealthCheck;
    run(): Promise<void>;
}
export { WebSocketMCPServer };
