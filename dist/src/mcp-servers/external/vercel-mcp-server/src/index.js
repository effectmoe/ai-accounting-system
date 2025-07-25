"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ACCESS_TOKEN = exports.BASE_URL = void 0;
exports.handleResponse = handleResponse;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const tool_manager_js_1 = require("./tool-manager.js");
const resources_js_1 = require("./resources.js");
const logger_1 = require("@/lib/logger");
exports.BASE_URL = "https://api.vercel.com";
exports.DEFAULT_ACCESS_TOKEN = "Your_Access_Token";
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    return response.json();
}
async function main() {
    try {
        const server = new mcp_js_1.McpServer({
            name: "vercel-tools",
            version: "1.0.0"
        });
        (0, resources_js_1.registerResources)(server);
        const toolManager = new tool_manager_js_1.ToolManager(server);
        await toolManager.loadGroup('projects');
        await toolManager.loadGroup('infrastructure');
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        logger_1.logger.error("Vercel MCP Server running on stdio");
        process.stdin.resume();
        process.on('SIGINT', () => {
            logger_1.logger.error("Shutting down...");
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.logger.error("Fatal error:", error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map