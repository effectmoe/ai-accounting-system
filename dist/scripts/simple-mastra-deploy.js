#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const deployment_agent_1 = __importDefault(require("../src/agents/deployment-agent"));
async function simpleMastraDeploy() {
    console.log(chalk_1.default.blue.bold('🤖 Mastra Simple Deploy\n'));
    try {
        // 1. ビルド
        console.log(chalk_1.default.yellow('🔨 Building application...'));
        (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
        console.log(chalk_1.default.green('✅ Build completed\n'));
        // 2. Mastraエージェントでデプロイ
        console.log(chalk_1.default.yellow('🚀 Deploying with Mastra agent...'));
        const deployConfig = {
            platform: 'vercel',
            environment: 'production',
            buildCommand: 'npm run build'
        };
        const result = await deployment_agent_1.default.actions.deployToVercel(deployConfig);
        if (result.success) {
            console.log(chalk_1.default.green('✅ Deployment successful!'));
            console.log(chalk_1.default.cyan(`🌐 URL: ${result.url}`));
            console.log(chalk_1.default.gray(`⏱️  Duration: ${result.duration}ms`));
        }
        else {
            console.error(chalk_1.default.red('❌ Deployment failed:'));
            console.error(chalk_1.default.red(`Error: ${result.error}`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('💥 Error:'), error);
        process.exit(1);
    }
}
simpleMastraDeploy();
