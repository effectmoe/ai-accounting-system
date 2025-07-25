"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
const core_1 = require("@mastra/core");
function createAgent(config) {
    class CustomAgent extends core_1.Agent {
        constructor() {
            super({
                id: config.id,
                name: config.name,
                description: config.description,
                model: {
                    provider: 'DEEPSEEK',
                    name: 'deepseek-chat',
                    toolChoice: 'auto',
                },
            });
        }
        async execute(input) {
            const tools = {};
            for (const [toolName, tool] of Object.entries(config.tools)) {
                tools[toolName] = tool.execute;
            }
            return config.execute({ input, tools });
        }
    }
    const agent = new CustomAgent();
    Object.assign(agent, {
        id: config.id,
        name: config.name,
        description: config.description,
        inputSchema: config.inputSchema,
        tools: config.tools,
        execute: async (input) => agent.execute(input),
        getName: () => config.name,
        getDescription: () => config.description,
        getVersion: () => '1.0.0',
    });
    return agent;
}
exports.default = createAgent;
//# sourceMappingURL=mastra-polyfill.js.map