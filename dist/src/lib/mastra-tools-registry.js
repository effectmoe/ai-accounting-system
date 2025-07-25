"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsRegistry = void 0;
exports.getTool = getTool;
exports.getAgentTools = getAgentTools;
const accounting_tools_1 = require("@/src/agents/tools/accounting-tools");
const customer_tools_1 = require("@/src/agents/tools/customer-tools");
exports.toolsRegistry = {
    accountingAgent: accounting_tools_1.accountingTools,
    customerAgent: customer_tools_1.customerTools,
    databaseAgent: [],
    deploymentAgent: [],
    japanTaxAgent: [],
    ocrAgent: [],
    problemSolvingAgent: [],
    productAgent: [],
    refactorAgent: [],
    uiAgent: [],
    constructionAgent: []
};
function getTool(agentName, toolName) {
    const agentTools = exports.toolsRegistry[agentName];
    if (!agentTools) {
        throw new Error(`Agent ${agentName} not found in registry`);
    }
    const tool = agentTools.find(t => t.name === toolName);
    if (!tool) {
        throw new Error(`Tool ${toolName} not found for agent ${agentName}`);
    }
    return tool;
}
function getAgentTools(agentName) {
    const agentTools = exports.toolsRegistry[agentName];
    if (!agentTools) {
        return [];
    }
    return agentTools.map(t => ({
        name: t.name,
        description: t.description
    }));
}
//# sourceMappingURL=mastra-tools-registry.js.map