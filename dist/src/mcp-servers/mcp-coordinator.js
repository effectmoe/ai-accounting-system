#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPCoordinator = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const logger_1 = require("@/lib/logger");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const child_process_1 = require("child_process");
const events_1 = require("events");
const MCP_COORDINATOR_TOOLS = [
    {
        name: 'mcp_list_servers',
        description: '利用可能なMCPサーバーのリストを取得',
        inputSchema: {
            type: 'object',
            properties: {
                includeOffline: {
                    type: 'boolean',
                    optional: true,
                    description: 'オフラインサーバーも含める',
                },
            },
        },
    },
    {
        name: 'mcp_server_status',
        description: '特定のMCPサーバーのステータスを取得',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    description: 'サーバー名',
                },
            },
            required: ['serverName'],
        },
    },
    {
        name: 'mcp_start_server',
        description: 'MCPサーバーを開始',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    description: 'サーバー名',
                },
            },
            required: ['serverName'],
        },
    },
    {
        name: 'mcp_stop_server',
        description: 'MCPサーバーを停止',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    description: 'サーバー名',
                },
            },
            required: ['serverName'],
        },
    },
    {
        name: 'mcp_restart_server',
        description: 'MCPサーバーを再起動',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    description: 'サーバー名',
                },
            },
            required: ['serverName'],
        },
    },
    {
        name: 'mcp_health_check',
        description: '全MCPサーバーのヘルスチェックを実行',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    optional: true,
                    description: '特定のサーバーのみチェック',
                },
            },
        },
    },
    {
        name: 'mcp_route_request',
        description: '要求を適切なMCPサーバーにルーティング',
        inputSchema: {
            type: 'object',
            properties: {
                capability: {
                    type: 'string',
                    description: '必要な機能（例: ml_analysis, web_scraping, database）',
                },
                toolName: {
                    type: 'string',
                    optional: true,
                    description: '特定のツール名',
                },
                request: {
                    type: 'object',
                    description: '実際のリクエスト',
                },
                preferences: {
                    type: 'object',
                    optional: true,
                    properties: {
                        preferredServer: { type: 'string', optional: true },
                        timeout: { type: 'number', optional: true },
                        retries: { type: 'number', optional: true },
                    },
                },
            },
            required: ['capability', 'request'],
        },
    },
    {
        name: 'mcp_get_capabilities',
        description: '利用可能な機能とツールの一覧を取得',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    optional: true,
                    enum: ['ai', 'data', 'web', 'database', 'analysis', 'notification'],
                    description: '機能カテゴリでフィルタ',
                },
            },
        },
    },
    {
        name: 'mcp_system_overview',
        description: 'MCPシステム全体の概要を取得',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'mcp_configure_server',
        description: 'MCPサーバーの設定を更新',
        inputSchema: {
            type: 'object',
            properties: {
                serverName: {
                    type: 'string',
                    description: 'サーバー名',
                },
                config: {
                    type: 'object',
                    description: '新しい設定',
                },
            },
            required: ['serverName', 'config'],
        },
    },
];
class MCPCoordinator extends events_1.EventEmitter {
    server;
    servers = new Map();
    serverConfigs = new Map();
    healthCheckInterval = null;
    constructor() {
        super();
        this.server = new index_js_1.Server({
            name: 'mcp-coordinator',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.initializeServerConfigs();
        this.setupToolHandlers();
        this.startHealthCheckMonitoring();
    }
    initializeServerConfigs() {
        this.serverConfigs.set('ml-analytics', {
            name: 'ml-analytics',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/ml-analytics-mcp-server.ts'],
            env: { NODE_ENV: 'production' },
            capabilities: ['ml_analysis', 'anomaly_detection', 'prediction', 'clustering'],
            priority: 1,
            healthCheck: { interval: 30000, timeout: 5000, retries: 3 },
        });
        this.serverConfigs.set('websocket', {
            name: 'websocket',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/websocket-mcp-server.ts'],
            env: { WEBSOCKET_PORT: '3001' },
            capabilities: ['real_time_notifications', 'progress_updates', 'session_management'],
            priority: 1,
            healthCheck: { interval: 15000, timeout: 3000, retries: 2 },
        });
        this.serverConfigs.set('enhanced-firecrawl', {
            name: 'enhanced-firecrawl',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/enhanced-firecrawl-mcp-server.ts'],
            env: { FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '' },
            capabilities: ['web_scraping', 'competitor_analysis', 'data_extraction', 'sitemap_crawling'],
            priority: 2,
            healthCheck: { interval: 60000, timeout: 10000, retries: 3 },
        });
        this.serverConfigs.set('database', {
            name: 'database',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/database-mcp-server.ts'],
            env: { MONGODB_URI: process.env.MONGODB_URI || '' },
            capabilities: ['database', 'crud_operations', 'mongodb'],
            priority: 1,
            healthCheck: { interval: 30000, timeout: 5000, retries: 3 },
        });
        this.serverConfigs.set('accounting', {
            name: 'accounting',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/accounting-mcp-server.ts'],
            env: { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '' },
            capabilities: ['accounting', 'financial_analysis', 'invoice_processing'],
            priority: 1,
            healthCheck: { interval: 45000, timeout: 8000, retries: 3 },
        });
        this.serverConfigs.set('nlweb', {
            name: 'nlweb',
            command: 'npx',
            args: ['tsx', './src/mcp-servers/nlweb-mcp-server.ts'],
            env: {
                NLWEB_API_KEY: process.env.NLWEB_API_KEY || '',
                PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
                FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY || '',
                DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            },
            capabilities: ['web_development', 'ai_cascade', 'web_search', 'web_scraping'],
            priority: 2,
            healthCheck: { interval: 60000, timeout: 10000, retries: 3 },
        });
        this.serverConfigs.forEach((config, name) => {
            this.servers.set(name, {
                name,
                process: null,
                status: 'stopped',
                lastHealthCheck: new Date(),
                healthStatus: 'error',
                capabilities: config.capabilities,
                tools: [],
                restartCount: 0,
            });
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: MCP_COORDINATOR_TOOLS,
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'mcp_list_servers':
                        return await this.handleListServers(args);
                    case 'mcp_server_status':
                        return await this.handleServerStatus(args);
                    case 'mcp_start_server':
                        return await this.handleStartServer(args);
                    case 'mcp_stop_server':
                        return await this.handleStopServer(args);
                    case 'mcp_restart_server':
                        return await this.handleRestartServer(args);
                    case 'mcp_health_check':
                        return await this.handleHealthCheck(args);
                    case 'mcp_route_request':
                        return await this.handleRouteRequest(args);
                    case 'mcp_get_capabilities':
                        return await this.handleGetCapabilities(args);
                    case 'mcp_system_overview':
                        return await this.handleSystemOverview(args);
                    case 'mcp_configure_server':
                        return await this.handleConfigureServer(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async handleListServers(args) {
        const { includeOffline = false } = args;
        const serverList = Array.from(this.servers.values())
            .filter(server => includeOffline || server.status === 'running')
            .map(server => ({
            name: server.name,
            status: server.status,
            healthStatus: server.healthStatus,
            capabilities: server.capabilities,
            lastHealthCheck: server.lastHealthCheck.toISOString(),
            restartCount: server.restartCount,
            toolCount: server.tools.length,
        }));
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        servers: serverList,
                        summary: {
                            total: this.servers.size,
                            running: serverList.filter(s => s.status === 'running').length,
                            healthy: serverList.filter(s => s.healthStatus === 'healthy').length,
                        },
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleServerStatus(args) {
        const { serverName } = args;
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`Server '${serverName}' not found`);
        }
        const config = this.serverConfigs.get(serverName);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        name: server.name,
                        status: server.status,
                        healthStatus: server.healthStatus,
                        capabilities: server.capabilities,
                        tools: server.tools.length,
                        lastHealthCheck: server.lastHealthCheck.toISOString(),
                        restartCount: server.restartCount,
                        lastError: server.lastError,
                        config: config ? {
                            command: config.command,
                            args: config.args,
                            priority: config.priority,
                            healthCheck: config.healthCheck,
                        } : null,
                        processInfo: server.process ? {
                            pid: server.process.pid,
                            exitCode: server.process.exitCode,
                            signalCode: server.process.signalCode,
                        } : null,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleStartServer(args) {
        const { serverName } = args;
        try {
            await this.startServer(serverName);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Server '${serverName}' started successfully`,
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed to start server',
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleStopServer(args) {
        const { serverName } = args;
        try {
            await this.stopServer(serverName);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Server '${serverName}' stopped successfully`,
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed to stop server',
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleRestartServer(args) {
        const { serverName } = args;
        try {
            await this.restartServer(serverName);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Server '${serverName}' restarted successfully`,
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed to restart server',
                            serverName,
                            timestamp: new Date().toISOString(),
                        }, null, 2),
                    },
                ],
            };
        }
    }
    async handleHealthCheck(args) {
        const { serverName } = args;
        let healthResults;
        if (serverName) {
            const result = await this.checkServerHealth(serverName);
            healthResults = [result];
        }
        else {
            healthResults = await this.checkAllServersHealth();
        }
        const summary = {
            total: healthResults.length,
            healthy: healthResults.filter(r => r.status === 'healthy').length,
            warnings: healthResults.filter(r => r.status === 'warning').length,
            errors: healthResults.filter(r => r.status === 'error').length,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        summary,
                        healthResults,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleRouteRequest(args) {
        const { capability, toolName, request, preferences = {} } = args;
        const eligibleServers = Array.from(this.servers.values())
            .filter(server => server.status === 'running' &&
            server.healthStatus === 'healthy' &&
            server.capabilities.includes(capability))
            .sort((a, b) => {
            const configA = this.serverConfigs.get(a.name);
            const configB = this.serverConfigs.get(b.name);
            return (configA?.priority || 999) - (configB?.priority || 999);
        });
        if (eligibleServers.length === 0) {
            throw new Error(`No healthy servers available for capability: ${capability}`);
        }
        const targetServer = preferences.preferredServer ?
            eligibleServers.find(s => s.name === preferences.preferredServer) || eligibleServers[0] :
            eligibleServers[0];
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        routedTo: targetServer.name,
                        capability,
                        toolName,
                        eligibleServers: eligibleServers.length,
                        message: `Request would be routed to ${targetServer.name}`,
                        request,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleGetCapabilities(args) {
        const { category } = args;
        const allCapabilities = new Map();
        this.servers.forEach(server => {
            server.capabilities.forEach(cap => {
                if (!allCapabilities.has(cap)) {
                    allCapabilities.set(cap, []);
                }
                allCapabilities.get(cap).push(server.name);
            });
        });
        const capabilities = Array.from(allCapabilities.entries()).map(([cap, servers]) => ({
            name: cap,
            servers,
            category: this.getCapabilityCategory(cap),
            available: servers.some(serverName => {
                const server = this.servers.get(serverName);
                return server?.status === 'running' && server?.healthStatus === 'healthy';
            }),
        }));
        const filteredCapabilities = category ?
            capabilities.filter(cap => cap.category === category) :
            capabilities;
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        capabilities: filteredCapabilities,
                        categories: ['ai', 'data', 'web', 'database', 'analysis', 'notification'],
                        summary: {
                            total: filteredCapabilities.length,
                            available: filteredCapabilities.filter(c => c.available).length,
                        },
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleSystemOverview(args) {
        const overview = {
            coordinator: {
                version: '1.0.0',
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                pid: process.pid,
            },
            servers: {
                total: this.servers.size,
                running: Array.from(this.servers.values()).filter(s => s.status === 'running').length,
                healthy: Array.from(this.servers.values()).filter(s => s.healthStatus === 'healthy').length,
                configurations: this.serverConfigs.size,
            },
            capabilities: {
                total: new Set(Array.from(this.servers.values()).flatMap(s => s.capabilities)).size,
                byCategory: this.getCapabilitiesByCategory(),
            },
            performance: {
                averageHealthCheckInterval: 30,
                lastFullHealthCheck: new Date().toISOString(),
                restartCounts: Array.from(this.servers.values()).reduce((sum, s) => sum + s.restartCount, 0),
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        overview,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async handleConfigureServer(args) {
        const { serverName, config } = args;
        if (!this.serverConfigs.has(serverName)) {
            throw new Error(`Server '${serverName}' not found`);
        }
        const currentConfig = this.serverConfigs.get(serverName);
        const updatedConfig = { ...currentConfig, ...config };
        this.serverConfigs.set(serverName, updatedConfig);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Configuration updated for server '${serverName}'`,
                        serverName,
                        updatedConfig,
                        timestamp: new Date().toISOString(),
                    }, null, 2),
                },
            ],
        };
    }
    async startServer(serverName) {
        const config = this.serverConfigs.get(serverName);
        const server = this.servers.get(serverName);
        if (!config || !server) {
            throw new Error(`Server '${serverName}' not found`);
        }
        if (server.status === 'running') {
            throw new Error(`Server '${serverName}' is already running`);
        }
        server.status = 'starting';
        try {
            const serverProcess = (0, child_process_1.spawn)(config.command, config.args, {
                env: { ...process.env, ...config.env },
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            server.process = serverProcess;
            server.status = 'running';
            server.lastHealthCheck = new Date();
            serverProcess.on('exit', (code, signal) => {
                server.status = 'stopped';
                server.healthStatus = 'error';
                server.lastError = `Process exited with code ${code}, signal ${signal}`;
                this.emit('serverStopped', { serverName, code, signal });
            });
            serverProcess.on('error', (error) => {
                server.status = 'error';
                server.healthStatus = 'error';
                server.lastError = error.message;
                this.emit('serverError', { serverName, error: error.message });
            });
        }
        catch (error) {
            server.status = 'error';
            server.healthStatus = 'error';
            server.lastError = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    }
    async stopServer(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`Server '${serverName}' not found`);
        }
        if (server.status === 'stopped') {
            throw new Error(`Server '${serverName}' is already stopped`);
        }
        if (server.process) {
            server.process.kill('SIGTERM');
            server.status = 'stopped';
            server.healthStatus = 'error';
            server.process = null;
        }
    }
    async restartServer(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            throw new Error(`Server '${serverName}' not found`);
        }
        if (server.status === 'running') {
            await this.stopServer(serverName);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        server.restartCount++;
        await this.startServer(serverName);
    }
    async checkServerHealth(serverName) {
        const server = this.servers.get(serverName);
        if (!server) {
            return {
                serverName,
                status: 'error',
                message: 'Server not found',
            };
        }
        let status;
        let message;
        if (server.status !== 'running') {
            status = 'error';
            message = `Server is ${server.status}`;
        }
        else if (server.process && server.process.exitCode !== null) {
            status = 'error';
            message = `Process has exited with code ${server.process.exitCode}`;
        }
        else {
            status = 'healthy';
            message = 'Server is running normally';
        }
        server.healthStatus = status;
        server.lastHealthCheck = new Date();
        return {
            serverName,
            status,
            message,
            lastCheck: server.lastHealthCheck.toISOString(),
            restartCount: server.restartCount,
        };
    }
    async checkAllServersHealth() {
        const healthPromises = Array.from(this.servers.keys()).map(serverName => this.checkServerHealth(serverName));
        return await Promise.all(healthPromises);
    }
    startHealthCheckMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.checkAllServersHealth();
            }
            catch (error) {
                logger_1.logger.error('Health check monitoring error:', error);
            }
        }, 30000);
    }
    getCapabilityCategory(capability) {
        if (capability.includes('ml_') || capability.includes('ai_') || capability.includes('llm')) {
            return 'ai';
        }
        if (capability.includes('database') || capability.includes('crud') || capability.includes('mongodb')) {
            return 'database';
        }
        if (capability.includes('web_') || capability.includes('scraping') || capability.includes('crawl')) {
            return 'web';
        }
        if (capability.includes('analysis') || capability.includes('anomaly') || capability.includes('prediction')) {
            return 'analysis';
        }
        if (capability.includes('notification') || capability.includes('websocket') || capability.includes('progress')) {
            return 'notification';
        }
        return 'data';
    }
    getCapabilitiesByCategory() {
        const categories = ['ai', 'data', 'web', 'database', 'analysis', 'notification'];
        const result = {};
        categories.forEach(category => {
            const capabilities = Array.from(this.servers.values())
                .flatMap(s => s.capabilities)
                .filter(cap => this.getCapabilityCategory(cap) === category);
            result[category] = new Set(capabilities).size;
        });
        return result;
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        logger_1.logger.error('MCP Coordinator running on stdio');
    }
    async shutdown() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        const stopPromises = Array.from(this.servers.keys()).map(serverName => this.stopServer(serverName).catch(error => logger_1.logger.error(`Failed to stop server ${serverName}:`, error)));
        await Promise.all(stopPromises);
    }
}
exports.MCPCoordinator = MCPCoordinator;
if (require.main === module) {
    const coordinator = new MCPCoordinator();
    coordinator.run().catch((error) => {
        logger_1.logger.error('Failed to run MCP Coordinator:', error);
        process.exit(1);
    });
    process.on('SIGINT', async () => {
        logger_1.logger.debug('Shutting down MCP Coordinator...');
        await coordinator.shutdown();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger_1.logger.debug('Shutting down MCP Coordinator...');
        await coordinator.shutdown();
        process.exit(0);
    });
}
//# sourceMappingURL=mcp-coordinator.js.map