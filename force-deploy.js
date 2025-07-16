const { exec } = require('child_process');
const path = require('path');

console.log('🚀 強制デプロイを開始します...\n');

// プロジェクトディレクトリに移動
process.chdir('/Users/tonychustudio/Documents/aam-orchestration/accounting-automation');

// Git コマンドを実行
const commands = [
  'git add .',
  'git commit -m "Fix: FAQ保存・履歴表示・Deploy Agent の3つの重要問題を修正" || true',
  'git push origin main'
];

let index = 0;

function executeCommand() {
  if (index >= commands.length) {
    console.log('\n✅ デプロイが完了しました！');
    console.log('🔗 Vercelダッシュボードで確認: https://vercel.com/dashboard');
    return;
  }

  const cmd = commands[index];
  console.log(`実行中: ${cmd}`);
  
  exec(cmd, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('nothing to commit')) console.error(stderr);
    
    index++;
    executeCommand();
  });
}

executeCommand();