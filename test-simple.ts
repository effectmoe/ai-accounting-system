// APIキーのテスト
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 環境設定を確認中...\n');

// APIキーの存在確認（値は表示しない）
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;

console.log('APIキーの設定状況:');
console.log(`- OpenAI: ${hasOpenAI ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`- Anthropic: ${hasAnthropic ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`- Google: ${hasGoogle ? '✅ 設定済み' : '❌ 未設定'}`);

if (!hasOpenAI && !hasAnthropic && !hasGoogle) {
  console.log('\n⚠️  少なくとも1つのAPIキーを設定してください。');
  console.log('詳細は .env.example を参照してください。');
} else {
  console.log('\n✨ APIキーが設定されています！');
  console.log('エージェントを実行できます。');
}