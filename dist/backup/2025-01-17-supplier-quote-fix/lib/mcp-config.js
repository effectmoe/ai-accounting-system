"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpServers = void 0;
exports.initializeMCPServers = initializeMCPServers;
const path_1 = __importDefault(require("path"));
const projectRoot = path_1.default.resolve(process.cwd());
exports.mcpServers = {
    gas: {
        command: 'node',
        args: [path_1.default.join(projectRoot, 'gas-mcp-server/dist/src/index.js')],
        env: {
            NODE_ENV: 'production'
        }
    },
    gdrive: {
        command: 'npx',
        args: ['-y', '@isaacphi/mcp-gdrive'],
        env: {
            CLIENT_ID: process.env.GDRIVE_CLIENT_ID || '',
            CLIENT_SECRET: process.env.GDRIVE_CLIENT_SECRET || '',
            GDRIVE_CREDS_DIR: path_1.default.join(process.env.HOME || '', '.config/mcp-gdrive')
        }
    },
    supabase: {
        command: 'npx',
        args: [
            '-y',
            '@supabase/mcp-server-supabase@latest',
            '--project-ref=clqpfmroqcnvyxdzadln'
        ],
        env: {
            SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || ''
        }
    }
};
// MCPサーバーの初期化関数
async function initializeMCPServers() {
    const { mcpManager } = await Promise.resolve().then(() => __importStar(require('./mcp-client')));
    // 環境変数チェック
    const requiredEnvVars = {
        gdrive: ['GDRIVE_CLIENT_ID', 'GDRIVE_CLIENT_SECRET'],
        supabase: ['SUPABASE_ACCESS_TOKEN']
    };
    // 各サーバーを接続
    for (const [name, config] of Object.entries(exports.mcpServers)) {
        try {
            // 環境変数チェック
            const required = requiredEnvVars[name];
            if (required) {
                const missing = required.filter(v => !process.env[v]);
                if (missing.length > 0) {
                    console.warn(`Skipping ${name} MCP server: Missing environment variables: ${missing.join(', ')}`);
                    continue;
                }
            }
            await mcpManager.connectServer(name, config);
        }
        catch (error) {
            console.error(`Failed to initialize ${name} MCP server:`, error);
        }
    }
}
