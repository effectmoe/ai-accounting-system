"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastra = void 0;
const core_1 = require("@mastra/core");
const agent_1 = require("@mastra/core/agent");
const openai_1 = require("@ai-sdk/openai");
const env_validation_1 = require("./utils/env-validation");
const express_1 = require("express");
// Validate environment variables on startup
(0, env_validation_1.validateEnvironment)();
// Simple agent definition for Mastra Cloud
const accountingAgent = new agent_1.Agent({
    name: "Accounting Assistant",
    instructions: "You are a helpful accounting assistant. Answer concisely.",
    model: (0, openai_1.openai)("gpt-4o-mini"),
});
// Mastra configuration with server settings
const mastra = new core_1.Mastra({
    agents: { accountingAgent },
    server: {
        port: parseInt(process.env.PORT || "4111"), // Mastra Cloudが期待するデフォルトポート
        host: "0.0.0.0",
        timeout: 30000,
    },
});
exports.mastra = mastra;
// Create Express app for HTTP server
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "4111");
// Middleware
app.use(express_1.default.json());
// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: "ok",
        service: "mastra-accounting-automation",
        timestamp: new Date().toISOString()
    });
});
// Detailed health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Get agents to verify they're loaded
        const agents = await mastra.getAgents();
        const agentCount = Object.keys(agents).length;
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            components: {
                agents: {
                    status: agentCount > 0 ? "healthy" : "degraded",
                    count: agentCount
                },
                memory: {
                    used: process.memoryUsage().heapUsed,
                    total: process.memoryUsage().heapTotal
                },
                uptime: process.uptime()
            }
        });
    }
    catch (error) {
        res.status(503).json({
            status: "unhealthy",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// Start the server for Mastra Cloud
if (process.env.NODE_ENV === "production" || require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Starting Mastra server on port ${port}...`);
        console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
        console.log(`✅ Health check endpoint: http://0.0.0.0:${port}/`);
        console.log(`✅ Detailed health check endpoint: http://0.0.0.0:${port}/health`);
    });
}
exports.default = mastra;
