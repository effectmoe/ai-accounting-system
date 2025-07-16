const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting deployment process...');

try {
  // Change to project directory
  const projectDir = '/Users/tonychustudio/Documents/aam-orchestration/accounting-automation';
  process.chdir(projectDir);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Check git status
  console.log('\n📊 Git status:');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  console.log(status || 'No changes detected');

  // Add all changes
  console.log('\n➕ Adding all changes...');
  execSync('git add .');
  console.log('✅ Files staged');

  // Create commit
  console.log('\n💾 Creating commit...');
  const commitMessage = `Fix: FAQ保存・履歴表示・Deploy Agent の3つの重要問題を修正

🔧 FAQ保存機能の修正:
- MongoDB URI環境変数設定とAPI実装
- デバッグログとエラーハンドリング強化
- FAQ保存・一覧取得機能の実装

🔧 履歴表示機能の修正:
- データベース名統一とAPIレスポンス形式統一
- セッションID検索ロジック改善
- クライアント側UI実装とデータアクセス修正

🔧 Vercel Deploy Agentの修正:
- Mastraランタイム基盤整備
- GitHubIntegration API実装
- Mastra 0.10.10対応とログ機能追加

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

  execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });
  console.log('✅ Commit created');

  // Push to main branch
  console.log('\n📤 Pushing to GitHub...');
  const pushResult = execSync('git push origin main 2>&1', { encoding: 'utf8' });
  console.log(pushResult);
  
  console.log('\n✅ Deployment successful!');
  console.log('🔗 Check Vercel dashboard for deployment status');
  console.log('📱 https://vercel.com/dashboard');

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  if (error.stdout) console.log('stdout:', error.stdout.toString());
  if (error.stderr) console.log('stderr:', error.stderr.toString());
  process.exit(1);
}