#!/usr/bin/env tsx

import { execSync } from 'child_process';
import chalk from 'chalk';
import deploymentAgent from '../src/agents/deployment-agent';

async function simpleMastraDeploy() {
  console.log(chalk.blue.bold('🤖 Mastra Simple Deploy\n'));
  
  try {
    // 1. ビルド
    console.log(chalk.yellow('🔨 Building application...'));
    execSync('npm run build', { stdio: 'inherit' });
    console.log(chalk.green('✅ Build completed\n'));
    
    // 2. Mastraエージェントでデプロイ
    console.log(chalk.yellow('🚀 Deploying with Mastra agent...'));
    
    const deployConfig = {
      platform: 'vercel' as const,
      environment: 'production' as const,
      buildCommand: 'npm run build'
    };
    
    const result = await deploymentAgent.actions.deployToVercel(deployConfig);
    
    if (result.success) {
      console.log(chalk.green('✅ Deployment successful!'));
      console.log(chalk.cyan(`🌐 URL: ${result.url}`));
      console.log(chalk.gray(`⏱️  Duration: ${result.duration}ms`));
    } else {
      console.error(chalk.red('❌ Deployment failed:'));
      console.error(chalk.red(`Error: ${result.error}`));
    }
    
  } catch (error) {
    console.error(chalk.red('💥 Error:'), error);
    process.exit(1);
  }
}

simpleMastraDeploy();