"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastraStatsService = void 0;
const logger_1 = require("@/lib/logger");
class MastraStatsService {
    stats = [];
    maxStatsSize = 1000;
    recordExecution(stats) {
        this.stats.push(stats);
        if (this.stats.length > this.maxStatsSize) {
            this.stats.shift();
        }
        if (stats.success) {
            logger_1.logger.info(`Mastra agent executed successfully: ${stats.agentName}.${stats.operation} (${stats.executionTime}ms)`);
        }
        else {
            logger_1.logger.error(`Mastra agent execution failed: ${stats.agentName}.${stats.operation} - ${stats.error}`);
        }
    }
    getAgentStats(agentName) {
        const filteredStats = agentName
            ? this.stats.filter(s => s.agentName === agentName)
            : this.stats;
        const agentStats = {};
        filteredStats.forEach(stat => {
            if (!agentStats[stat.agentName]) {
                agentStats[stat.agentName] = {
                    totalExecutions: 0,
                    successCount: 0,
                    failureCount: 0,
                    averageExecutionTime: 0,
                    operations: {}
                };
            }
            const agent = agentStats[stat.agentName];
            agent.totalExecutions++;
            if (stat.success) {
                agent.successCount++;
            }
            else {
                agent.failureCount++;
            }
            if (!agent.operations[stat.operation]) {
                agent.operations[stat.operation] = {
                    count: 0,
                    successCount: 0,
                    failureCount: 0,
                    totalTime: 0,
                    averageTime: 0
                };
            }
            const operation = agent.operations[stat.operation];
            operation.count++;
            operation.totalTime += stat.executionTime;
            if (stat.success) {
                operation.successCount++;
            }
            else {
                operation.failureCount++;
            }
        });
        Object.values(agentStats).forEach((agent) => {
            const totalTime = filteredStats
                .filter(s => s.agentName === agent.agentName && s.success)
                .reduce((sum, s) => sum + s.executionTime, 0);
            agent.averageExecutionTime = agent.successCount > 0
                ? Math.round(totalTime / agent.successCount)
                : 0;
            Object.values(agent.operations).forEach((op) => {
                op.averageTime = op.count > 0
                    ? Math.round(op.totalTime / op.count)
                    : 0;
            });
        });
        return agentStats;
    }
    getRecentExecutions(limit = 50) {
        return this.stats.slice(-limit).reverse();
    }
    getErrorStats() {
        const errors = this.stats.filter(s => !s.success);
        const errorTypes = {};
        errors.forEach(error => {
            const errorType = error.error || 'Unknown error';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
        return {
            totalErrors: errors.length,
            errorRate: this.stats.length > 0
                ? ((errors.length / this.stats.length) * 100).toFixed(2) + '%'
                : '0%',
            errorTypes: errorTypes,
            recentErrors: errors.slice(-10).reverse()
        };
    }
    clearStats() {
        this.stats = [];
        logger_1.logger.info('Mastra execution stats cleared');
    }
}
exports.mastraStatsService = new MastraStatsService();
//# sourceMappingURL=mastra-stats.service.js.map