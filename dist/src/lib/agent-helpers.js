"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
function createAgent(config) {
    return {
        id: config.id,
        name: config.name,
        description: config.description,
        inputSchema: config.inputSchema,
        tools: config.tools || {},
        execute: async (input) => {
            return config.execute({ input, tools: config.tools });
        },
        getName: () => config.name,
        getDescription: () => config.description,
        getVersion: () => '1.0.0',
    };
}
//# sourceMappingURL=agent-helpers.js.map