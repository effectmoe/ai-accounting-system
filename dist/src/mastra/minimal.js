"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mastra = void 0;
const core_1 = require("@mastra/core");
const agent_1 = require("@mastra/core/agent");
const openai_1 = require("@ai-sdk/openai");
const simpleAgent = new agent_1.Agent({
    name: "Simple Assistant",
    instructions: "You are a helpful assistant. Answer concisely.",
    model: (0, openai_1.openai)("gpt-4o-mini"),
});
exports.mastra = new core_1.Mastra({
    name: "Minimal Example",
    agents: { simpleAgent },
});
exports.default = exports.mastra;
//# sourceMappingURL=minimal.js.map