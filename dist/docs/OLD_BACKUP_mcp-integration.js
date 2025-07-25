"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_MCP_CONFIGS = exports.McpClientFactory = exports.MCP_SERVERS = void 0;
exports.executeMcpTool = executeMcpTool;
exports.executeMcpToolsBatch = executeMcpToolsBatch;
exports.validateMcpConfiguration = validateMcpConfiguration;
const core_1 = require("@mastra/core");
// 全MCPサーバーの設定
exports.MCP_SERVERS = {
    // カスタムMCPサーバー
    nlweb: {
        name: 'NLWeb Tax Information Server',
        command: 'node',
        args: ['./docs/nlweb-mcp-server.js'],
        env: {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        description: '動的な税制情報提供と税務判断',
        required: true,
    },
    ocr: {
        name: 'OCR Processing Server',
        command: 'node',
        args: ['./docs/ocr-mcp-server.js'],
        env: {
            GAS_OCR_URL: process.env.GAS_OCR_URL,
            GOOGLE_CLOUD_API_KEY: process.env.GOOGLE_CLOUD_API_KEY,
        },
        description: '領収書・請求書のOCR処理',
        required: true,
    },
    // 外部MCPサーバー
    supabase: {
        name: 'Supabase Database Server',
        command: 'npx',
        args: [
            'mcp-server-supabase',
            '--supabase-url', process.env.SUPABASE_URL,
            '--supabase-api-key', process.env.SUPABASE_SERVICE_ROLE_KEY,
        ],
        description: 'データベース操作とベクトル検索',
        required: true,
    },
    gdrive: {
        name: 'Google Drive Server',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-gdrive'],
        env: {
            GOOGLE_DRIVE_CLIENT_ID: process.env.GOOGLE_DRIVE_CLIENT_ID,
            GOOGLE_DRIVE_CLIENT_SECRET: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
            GOOGLE_DRIVE_REDIRECT_URI: process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
        },
        description: 'ファイルストレージとバックアップ',
        required: true,
    },
    perplexity: {
        name: 'Perplexity AI Server',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-perplexity'],
        env: {
            PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
        },
        description: 'リアルタイム情報検索',
        required: false,
    },
    'google-sheets': {
        name: 'Google Sheets Server',
        command: 'node',
        args: [process.env.GOOGLE_SHEETS_MCP_PATH || '/path/to/mcp-google-sheets/dist/index.js'],
        env: {
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
        },
        description: 'スプレッドシート操作とレポート出力',
        required: false,
    },
    excel: {
        name: 'Excel Server',
        command: 'node',
        args: [process.env.EXCEL_MCP_PATH || '/path/to/excel-mcp-server/dist/index.js'],
        description: 'Excel形式でのレポート生成',
        required: false,
    },
    gas: {
        name: 'Google Apps Script Server',
        command: 'node',
        args: [process.env.GAS_MCP_PATH || '/path/to/gas-mcp-server/index.js'],
        env: {
            GAS_SCRIPT_ID: process.env.GAS_SCRIPT_ID,
            GAS_CLIENT_ID: process.env.GAS_CLIENT_ID,
            GAS_CLIENT_SECRET: process.env.GAS_CLIENT_SECRET,
        },
        description: 'GASスクリプト実行とOCR連携',
        required: false,
    },
    github: {
        name: 'GitHub Server',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
        },
        description: 'コード管理とバージョン管理',
        required: false,
    },
};
// MCPクライアントファクトリー
class McpClientFactory {
    static instance;
    clients = new Map();
    constructor() { }
    static getInstance() {
        if (!McpClientFactory.instance) {
            McpClientFactory.instance = new McpClientFactory();
        }
        return McpClientFactory.instance;
    }
    // MCPクライアントの作成
    async createClient(config) {
        const clientId = config.servers.join('-');
        // キャッシュチェック
        if (this.clients.has(clientId)) {
            return this.clients.get(clientId);
        }
        // 必須サーバーのチェック
        const requiredServers = Object.entries(exports.MCP_SERVERS)
            .filter(([_, config]) => config.required)
            .map(([name, _]) => name);
        const missingRequired = requiredServers.filter(server => !config.servers.includes(server));
        if (missingRequired.length > 0) {
            throw new Error(`Missing required MCP servers: ${missingRequired.join(', ')}`);
        }
        // MCPクライアントの初期化
        const mcpClient = await (0, core_1.createMcpClient)({
            servers: config.servers.map(serverName => {
                const serverConfig = exports.MCP_SERVERS[serverName];
                if (!serverConfig) {
                    throw new Error(`Unknown MCP server: ${serverName}`);
                }
                return {
                    name: serverName,
                    ...serverConfig,
                };
            }),
            options: {
                timeout: config.timeout || 30000,
                retryAttempts: config.retryAttempts || 3,
                logLevel: config.logLevel || 'info',
            },
        });
        // キャッシュに保存
        this.clients.set(clientId, mcpClient);
        return mcpClient;
    }
    // 特定のサーバーが利用可能かチェック
    async checkServerHealth(serverName) {
        try {
            const client = await this.createClient({ servers: [serverName] });
            const result = await client.callTool(serverName, 'health_check', {});
            return result.status === 'ok';
        }
        catch (error) {
            console.error(`Health check failed for ${serverName}:`, error);
            return false;
        }
    }
    // 全サーバーのヘルスチェック
    async checkAllServersHealth() {
        const results = {};
        for (const serverName of Object.keys(exports.MCP_SERVERS)) {
            results[serverName] = await this.checkServerHealth(serverName);
        }
        return results;
    }
}
exports.McpClientFactory = McpClientFactory;
// エージェント用のMCPクライアント設定
exports.AGENT_MCP_CONFIGS = {
    // OCRエージェント
    'ocr-agent': {
        servers: ['ocr', 'gdrive', 'supabase', 'gas'],
        timeout: 60000, // OCR処理は時間がかかる
    },
    // 会計エージェント
    'accounting-agent': {
        servers: ['nlweb', 'perplexity', 'supabase', 'google-sheets', 'excel'],
    },
    // データベースエージェント
    'database-agent': {
        servers: ['supabase', 'gdrive'],
    },
    // 顧客管理エージェント
    'customer-agent': {
        servers: ['supabase', 'nlweb', 'google-sheets', 'excel'],
    },
    // 商品管理エージェント
    'product-agent': {
        servers: ['supabase', 'nlweb'],
    },
    // 日本税務エージェント
    'japan-tax-agent': {
        servers: ['nlweb', 'supabase', 'excel', 'perplexity'],
    },
};
// MCPツール実行のヘルパー関数
async function executeMcpTool(serverName, toolName, params, config) {
    const factory = McpClientFactory.getInstance();
    const client = await factory.createClient({
        servers: [serverName],
        ...config,
    });
    return client.callTool(serverName, toolName, params);
}
// バッチMCPツール実行
async function executeMcpToolsBatch(operations) {
    const factory = McpClientFactory.getInstance();
    const servers = [...new Set(operations.map(op => op.server))];
    const client = await factory.createClient({ servers });
    return Promise.all(operations.map(op => client.callTool(op.server, op.tool, op.params)));
}
// MCPサーバー設定の検証
function validateMcpConfiguration() {
    const errors = [];
    const warnings = [];
    // 必須環境変数のチェック
    const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'GAS_OCR_URL',
        'GOOGLE_CLOUD_API_KEY',
        'GOOGLE_DRIVE_CLIENT_ID',
        'GOOGLE_DRIVE_CLIENT_SECRET',
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            errors.push(`Missing required environment variable: ${envVar}`);
        }
    }
    // オプション環境変数のチェック
    const optionalEnvVars = [
        'PERPLEXITY_API_KEY',
        'GOOGLE_SHEETS_MCP_PATH',
        'EXCEL_MCP_PATH',
        'GAS_MCP_PATH',
        'GITHUB_PERSONAL_ACCESS_TOKEN',
    ];
    for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) {
            warnings.push(`Optional environment variable not set: ${envVar}`);
        }
    }
    // カスタムMCPサーバーファイルの存在チェック
    const customServers = ['./docs/nlweb-mcp-server.js', './docs/ocr-mcp-server.js'];
    for (const serverPath of customServers) {
        // ファイル存在チェックのロジック（実際の実装では fs.existsSync を使用）
        warnings.push(`Ensure custom MCP server exists: ${serverPath}`);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
// エクスポート
exports.default = {
    MCP_SERVERS: exports.MCP_SERVERS,
    AGENT_MCP_CONFIGS: exports.AGENT_MCP_CONFIGS,
    McpClientFactory,
    executeMcpTool,
    executeMcpToolsBatch,
    validateMcpConfiguration,
};
