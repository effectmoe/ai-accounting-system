interface NotificationMessage {
    type: 'progress' | 'status' | 'result' | 'error' | 'log';
    sessionId: string;
    data: any;
    timestamp: Date;
    source?: string;
}
interface ProgressUpdate {
    sessionId: string;
    operation: string;
    progress: number;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    data?: any;
    error?: string;
}
export declare class WebSocketManager {
    private wss;
    private connections;
    private server;
    private port;
    private isRunning;
    constructor(port?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleConnection;
    private handleClientMessage;
    private removeConnection;
    private cleanupConnections;
    sendProgress(update: ProgressUpdate): void;
    sendStatus(sessionId: string, status: any, source?: string): void;
    sendResult(sessionId: string, result: any, source?: string): void;
    sendError(sessionId: string, error: any, source?: string): void;
    sendLog(sessionId: string, log: any, source?: string): void;
    private broadcast;
    private sendToConnection;
    broadcastToAll(message: Omit<NotificationMessage, 'sessionId'>): void;
    getStats(): {
        isRunning: boolean;
        port: number;
        totalConnections: number;
        sessionCount: number;
        sessions: {
            sessionId: string;
            connectionCount: number;
            subscriptions: string[];
        }[];
    };
}
export declare function getWebSocketManager(): WebSocketManager;
export declare function updateProgress(sessionId: string, progress: Partial<ProgressUpdate>): void;
export declare function startWebSocketServer(): Promise<WebSocketManager>;
export {};
