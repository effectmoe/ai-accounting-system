interface MastraExecutionStats {
    agentName: string;
    operation: string;
    success: boolean;
    executionTime: number;
    timestamp: Date;
    error?: string;
}
declare class MastraStatsService {
    private stats;
    private maxStatsSize;
    recordExecution(stats: MastraExecutionStats): void;
    getAgentStats(agentName?: string): any;
    getRecentExecutions(limit?: number): MastraExecutionStats[];
    getErrorStats(): any;
    clearStats(): void;
}
export declare const mastraStatsService: MastraStatsService;
export {};
