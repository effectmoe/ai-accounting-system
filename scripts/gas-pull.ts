#!/usr/bin/env tsx
/**
 * GAS Pull Script
 * 
 * Pull Google Apps Script files to local directory using Mastra agents
 */

import gasUpdateAgent from '../src/agents/gas-update-agent';
import * as dotenv from 'dotenv';
import * as path from 'path';

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
    const options: any = {
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
    
    const result = await gasUpdateAgent.execute(options);
    
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
    } else {
      console.error('❌ Pull failed:', result.message);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();