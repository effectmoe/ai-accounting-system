#!/usr/bin/env tsx
/**
 * GAS Update Script
 * 
 * Update Google Apps Script project files using Mastra agents
 */

import gasUpdateAgent from '../src/agents/gas-update-agent';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Usage: npm run gas:update [options]

Options:
  --directory <path>     Local directory with GAS files
  --file <name> <path>   Add/update single file
  --backup               Create backup before updating
  --validate             Validate JavaScript syntax
  --dry-run              Show changes without applying
  --script-id <id>       Override default script ID
  --help                 Show this help message

Examples:
  npm run gas:update --directory ./gas-src
  npm run gas:update --file Code.gs ./src/code.js --backup
  npm run gas:update --directory ./gas-src --validate --dry-run
    `);
    process.exit(0);
  }

  try {
    // Parse arguments
    const options: any = {
      createBackup: false,
      validateSyntax: false,
      dryRun: false,
      syncMode: 'push',
    };
    
    const files: any[] = [];
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--directory':
          options.directory = args[++i];
          break;
        case '--file':
          const name = args[++i];
          const filePath = args[++i];
          const content = fs.readFileSync(filePath, 'utf8');
          const type = filePath.endsWith('.html') ? 'HTML' : 'SERVER_JS';
          files.push({ name: path.basename(name, path.extname(name)), type, source: content });
          break;
        case '--backup':
          options.createBackup = true;
          break;
        case '--validate':
          options.validateSyntax = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--script-id':
          options.scriptId = args[++i];
          break;
      }
    }
    
    if (files.length > 0) {
      options.files = files;
    }

    console.log('📝 Updating GAS project...');
    
    if (options.dryRun) {
      console.log('🔍 Running in dry-run mode (no changes will be made)');
    }
    
    const result = await gasUpdateAgent.execute(options);
    
    if (result.status === 'success' || result.status === 'dry-run') {
      console.log(`✅ Update ${result.status === 'dry-run' ? 'preview' : 'successful'}!`);
      console.log(`\n📊 Summary:`);
      console.log(`  Total files: ${result.totalFiles}`);
      console.log(`  Added: ${result.filesAdded}`);
      console.log(`  Modified: ${result.filesModified}`);
      console.log(`  Deleted: ${result.filesDeleted}`);
      console.log(`  Unchanged: ${result.filesUnchanged}`);
      
      if (result.backupLocation) {
        console.log(`\n💾 Backup saved to: ${result.backupLocation}`);
      }
      
      if (result.changes.length > 0) {
        console.log('\n📋 Changes:');
        for (const change of result.changes) {
          const icon = {
            added: '➕',
            modified: '📝',
            deleted: '❌',
            unchanged: '✓',
          }[change.type];
          console.log(`  ${icon} ${change.name} (${change.type})`);
        }
      }
      
      console.log(`\n💬 ${result.message}`);
    } else {
      console.error('❌ Update failed:', result.message);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();