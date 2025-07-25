#!/usr/bin/env tsx
"use strict";
/**
 * GAS Pull Script
 *
 * Pull Google Apps Script files to local directory using Mastra agents
 */
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
const gas_update_agent_1 = __importDefault(require("../src/agents/gas-update-agent"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config();
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
Usage: npm run gas:pull <directory> [options]

Options:
  --script-id <id>       Override default script ID
  --dry-run              Show what would be pulled without pulling
  --help                 Show this help message

Examples:
  npm run gas:pull ./gas-src
  npm run gas:pull ./gas-backup --script-id ABC123
  npm run gas:pull ./gas-src --dry-run
    `);
        process.exit(0);
    }
    try {
        const directory = args[0];
        // Parse options
        const options = {
            directory,
            syncMode: 'pull',
            dryRun: false,
        };
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
                case '--script-id':
                    options.scriptId = args[++i];
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
            }
        }
        console.log(`📥 Pulling GAS project to ${directory}...`);
        if (options.dryRun) {
            console.log('🔍 Running in dry-run mode (no files will be saved)');
        }
        const result = await gas_update_agent_1.default.execute(options);
        if (result.status === 'success' || result.status === 'dry-run') {
            console.log(`✅ Pull ${result.status === 'dry-run' ? 'preview' : 'successful'}!`);
            console.log(`\n📊 Summary:`);
            console.log(`  Total files: ${result.totalFiles}`);
            console.log(`  New files: ${result.filesAdded}`);
            console.log(`  Updated files: ${result.filesModified}`);
            console.log(`  Unchanged files: ${result.filesUnchanged}`);
            if (result.changes.length > 0) {
                console.log('\n📋 Files:');
                for (const change of result.changes) {
                    const icon = {
                        added: '➕',
                        modified: '📝',
                        deleted: '❌',
                        unchanged: '✓',
                    }[change.type];
                    const ext = change.name.endsWith('.html') ? '.html' : '.gs';
                    console.log(`  ${icon} ${change.name}${ext} (${change.type})`);
                }
            }
            if (!options.dryRun) {
                console.log(`\n✨ Files saved to: ${path.resolve(directory)}`);
            }
        }
        else {
            console.error('❌ Pull failed:', result.message);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
main();
