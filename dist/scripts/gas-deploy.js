#!/usr/bin/env tsx
"use strict";
/**
 * GAS Deploy Script
 *
 * Deploy Google Apps Script projects using Mastra agents
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
const gas_deploy_agent_1 = __importDefault(require("../src/agents/gas-deploy-agent"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
Usage: npm run gas:deploy [options]

Options:
  --directory <path>     Deploy from local directory
  --description <text>   Deployment description
  --script-id <id>       Override default script ID
  --deployment-id <id>   Update existing deployment
  --dry-run             Show what would be deployed without deploying
  --help                Show this help message

Examples:
  npm run gas:deploy --directory ./gas-src --description "Initial deployment"
  npm run gas:deploy --deployment-id ABC123 --description "Bug fixes"
    `);
        process.exit(0);
    }
    try {
        // Parse arguments
        const options = {};
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];
            options[key] = value;
        }
        // Validate deployment
        if (options['script-id'] || options['deployment-id']) {
            const isValid = await gas_deploy_agent_1.default.validateDeployment({
                scriptId: options['script-id'],
                deploymentId: options['deployment-id'],
            });
            if (!isValid) {
                console.error('❌ Deployment validation failed');
                process.exit(1);
            }
        }
        console.log('🚀 Starting GAS deployment...');
        const result = await gas_deploy_agent_1.default.execute({
            scriptId: options['script-id'],
            directory: options['directory'],
            description: options['description'],
            deploymentId: options['deployment-id'],
            manifestEnabled: true,
        });
        if (result.status === 'success') {
            console.log('✅ Deployment successful!');
            console.log(`📦 Deployment ID: ${result.deploymentId}`);
            console.log(`📌 Version: ${result.deploymentConfig.versionNumber}`);
            if (result.webAppUrl) {
                console.log(`🌐 Web App URL: ${result.webAppUrl}`);
            }
            console.log(`📝 ${result.message}`);
        }
        else {
            console.error('❌ Deployment failed:', result.message);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
main();
