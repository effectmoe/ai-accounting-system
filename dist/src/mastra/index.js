"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastra = void 0;
const core_1 = require("@mastra/core");
const env_validation_1 = require("./utils/env-validation");
const express_1 = __importDefault(require("express"));
const mastra_accounting_agent_1 = require("../agents/mastra-accounting-agent");
const mastra_customer_agent_1 = require("../agents/mastra-customer-agent");
const mastra_database_agent_1 = require("../agents/mastra-database-agent");
const mastra_deployment_agent_1 = require("../agents/mastra-deployment-agent");
const mastra_japan_tax_agent_1 = require("../agents/mastra-japan-tax-agent");
const mastra_ocr_agent_1 = require("../agents/mastra-ocr-agent");
const mastra_problem_solving_agent_1 = require("../agents/mastra-problem-solving-agent");
const mastra_product_agent_1 = require("../agents/mastra-product-agent");
const mastra_refactor_agent_1 = require("../agents/mastra-refactor-agent");
const mastra_ui_agent_1 = require("../agents/mastra-ui-agent");
const mastra_construction_agent_1 = require("../agents/mastra-construction-agent");
(0, env_validation_1.validateEnvironment)();
const mastra = new core_1.Mastra({
    agents: {
        accountingAgent: mastra_accounting_agent_1.mastraAccountingAgent,
        customerAgent: mastra_customer_agent_1.mastraCustomerAgent,
        databaseAgent: mastra_database_agent_1.mastraDatabaseAgent,
        deploymentAgent: mastra_deployment_agent_1.mastraDeploymentAgent,
        japanTaxAgent: mastra_japan_tax_agent_1.mastraJapanTaxAgent,
        ocrAgent: mastra_ocr_agent_1.mastraOcrAgent,
        problemSolvingAgent: mastra_problem_solving_agent_1.mastraProblemSolvingAgent,
        productAgent: mastra_product_agent_1.mastraProductAgent,
        refactorAgent: mastra_refactor_agent_1.mastraRefactorAgent,
        uiAgent: mastra_ui_agent_1.mastraUiAgent,
        constructionAgent: mastra_construction_agent_1.mastraConstructionAgent
    },
    server: {
        port: parseInt(process.env.PORT || "4111"),
        host: "0.0.0.0",
        timeout: 30000,
    },
});
exports.mastra = mastra;
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "4111");
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.json({
        status: "ok",
        service: "mastra-accounting-automation",
        timestamp: new Date().toISOString()
    });
});
app.get('/health', async (req, res) => {
    try {
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
if (process.env.NODE_ENV === "production" && !process.env.VERCEL && require.main === module) {
    app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Starting Mastra server on port ${port}...`);
        console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
        console.log(`✅ Health check endpoint: http://0.0.0.0:${port}/`);
        console.log(`✅ Detailed health check endpoint: http://0.0.0.0:${port}/health`);
    });
}
exports.default = mastra;
//# sourceMappingURL=index.js.map