const fs = require('fs');
const path = require('path');

// .env.localファイルのパス
const envFilePath = path.join(__dirname, '..', '.env.local');

// ファイルを読み込む
const content = fs.readFileSync(envFilePath, 'utf8');

// 各行を処理して、値の末尾の\nを削除
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  // 空行やコメント行は変更しない
  if (!line.trim() || line.trim().startsWith('#')) {
    return line;
  }
  
  // KEY="value\n" パターンを KEY="value" に修正
  const match = line.match(/^([^=]+)="(.*)\\n"$/);
  if (match) {
    const key = match[1];
    const value = match[2];
    console.log(`Fixing ${key}: removing \\n from end of value`);
    return `${key}="${value}"`;
  }
  
  return line;
});

// バックアップを作成
fs.writeFileSync(envFilePath + '.backup', content);
console.log('Backup created: .env.local.backup');

// 修正したコンテンツを書き戻す
fs.writeFileSync(envFilePath, fixedLines.join('\n'));
console.log('.env.local file has been fixed');

// 修正後のMONGODB_URI値を確認
const fixedContent = fs.readFileSync(envFilePath, 'utf8');
const mongoUriLine = fixedContent.split('\n').find(line => line.startsWith('MONGODB_URI='));
if (mongoUriLine) {
  console.log('\nFixed MONGODB_URI line:');
  console.log(mongoUriLine);
}