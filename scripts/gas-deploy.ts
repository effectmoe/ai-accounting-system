#!/usr/bin/env tsx
/**
 * GAS Deploy Script
 * 
 * Deploy Google Apps Script projects using Mastra agents
 */

import gasDeployAgent from '../src/agents/gas-deploy-agent';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
    const options: any = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      options[key] = value;
    }

    // Validate deployment
    if (options['script-id'] || options['deployment-id']) {
      const isValid = await gasDeployAgent.validateDeployment({
        scriptId: options['script-id'],
        deploymentId: options['deployment-id'],
      });
      
      if (!isValid) {
        console.error('❌ Deployment validation failed');
        process.exit(1);
      }
    }

    console.log('🚀 Starting GAS deployment...');
    
    const result = await gasDeployAgent.execute({
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
    } else {
      console.error('❌ Deployment failed:', result.message);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();