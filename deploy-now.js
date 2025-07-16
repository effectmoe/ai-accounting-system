const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting deployment of debug changes...');

try {
  // Change to project directory
  const projectDir = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation';
  process.chdir(projectDir);
  
  console.log('📂 Current directory:', process.cwd());
  
  // Check git status
  console.log('📋 Checking git status...');
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log('Git status:', gitStatus);
  
  // Add the modified file
  console.log('📁 Adding modified files...');
  execSync('git add app/api/knowledge/analyze-chat-stream/route.ts');
  
  // Check what will be committed
  console.log('📄 Changes to be committed:');
  const gitDiff = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  console.log(gitDiff);
  
  // Create commit
  console.log('💾 Creating commit...');
  const commitMessage = `Debug: conversationデータ構造の詳細ログ追加

- searchTextがundefinedになる原因を特定するため
- conversationの型、配列状態、実際のデータを出力
- lastMessageの構造も詳細ログに追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
  
  execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
  
  // Push to main branch
  console.log('📤 Pushing to main branch...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('✅ Successfully pushed to main branch!');
  console.log('🌐 Vercel will automatically deploy the changes');
  console.log('📊 You can monitor the deployment at: https://vercel.com/dashboard');
  console.log('🎉 Deployment process completed!');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}