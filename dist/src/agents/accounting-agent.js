"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastra = void 0;
const core_1 = require("@mastra/core");
const simple_accounting_agent_1 = require("../agents/simple-accounting-agent");
exports.mastra = new core_1.Mastra({
    agents: {
        accountingAgent: simple_accounting_agent_1.accountingAgent,
    },
    workflows: {},
});
exports.default = exports.mastra;
//# sourceMappingURL=accounting-agent.js.map