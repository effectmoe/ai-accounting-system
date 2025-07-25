#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/lib/logger");
const serverPath = path_1.default.join(__dirname, 'external/vercel-mcp-server');
const env = {
    ...process.env,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
    VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || '',
};
const vercelServer = (0, child_process_1.spawn)('node', [path_1.default.join(serverPath, 'dist/index.js')], {
    env,
    stdio: 'inherit',
});
vercelServer.on('error', (error) => {
    logger_1.logger.error('Failed to start Vercel MCP server:', error);
    process.exit(1);
});
vercelServer.on('exit', (code) => {
    logger_1.logger.debug(`Vercel MCP server exited with code ${code}`);
    process.exit(code || 0);
});
process.on('SIGINT', () => {
    vercelServer.kill();
    process.exit(0);
});
process.on('SIGTERM', () => {
    vercelServer.kill();
    process.exit(0);
});
//# sourceMappingURL=vercel-mcp-wrapper.js.map