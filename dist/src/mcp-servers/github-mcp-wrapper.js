#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/lib/logger");
const serverPath = path_1.default.join(__dirname, 'external/github-mcp-server');
const env = {
    ...process.env,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};
const githubServer = (0, child_process_1.spawn)('node', [path_1.default.join(serverPath, 'dist/index.js')], {
    env,
    stdio: 'inherit',
});
githubServer.on('error', (error) => {
    logger_1.logger.error('Failed to start GitHub MCP server:', error);
    process.exit(1);
});
githubServer.on('exit', (code) => {
    logger_1.logger.debug(`GitHub MCP server exited with code ${code}`);
    process.exit(code || 0);
});
process.on('SIGINT', () => {
    githubServer.kill();
    process.exit(0);
});
process.on('SIGTERM', () => {
    githubServer.kill();
    process.exit(0);
});
//# sourceMappingURL=github-mcp-wrapper.js.map