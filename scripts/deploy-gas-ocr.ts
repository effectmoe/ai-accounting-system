import { MCPService } from '@/services/mcp-service';
import { initializeMCPServers } from '@/lib/mcp-config';
import fs from 'fs/promises';
import path from 'path';

async function deployGASOCR() {
  console.log('🚀 GAS OCR Web Apps デプロイを開始します...');
  
  try {
    // MCPサーバーを初期化
    await initializeMCPServers();
    console.log('✅ MCPサーバーを初期化しました');
    
    // 1. 新規プロジェクトを作成
    console.log('📝 新規GASプロジェクトを作成中...');
    const project = await MCPService.gas.createProject('AI会計OCR Web Apps');
    console.log('✅ プロジェクトを作成しました:', project);
    
    const scriptId = (project as any).scriptId;
    console.log('📋 Script ID:', scriptId);
    
    // 2. OCRコードを読み込み
    const ocrCodePath = path.join(process.cwd(), 'docs/gas-ocr-script.gs');
    const ocrCode = await fs.readFile(ocrCodePath, 'utf-8');
    console.log('📄 OCRコードを読み込みました');
    
    // 3. コードを書き込み
    console.log('✍️ コードを書き込み中...');
    await MCPService.gas.writeFile(`${scriptId}/Code`, ocrCode);
    console.log('✅ コードを書き込みました');
    
    // 4. プロジェクト情報を保存
    const projectInfo = {
      scriptId,
      projectName: 'AI会計OCR Web Apps',
      createdAt: new Date().toISOString(),
      status: 'created'
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'gas-ocr-project.json'),
      JSON.stringify(projectInfo, null, 2)
    );
    
    console.log('✅ プロジェクト情報を保存しました');
    console.log('\n📌 次のステップ:');
    console.log('1. Google Apps Scriptエディタで以下のプロジェクトを開く:');
    console.log(`   https://script.google.com/d/${scriptId}/edit`);
    console.log('2. サービス → Drive API を追加');
    console.log('3. デプロイ → 新しいデプロイ → ウェブアプリ');
    console.log('4. アクセス権: 全員、実行: 自分');
    console.log('5. デプロイURLを環境変数 GAS_OCR_URL に設定');
    
    return projectInfo;
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// スクリプトを実行
if (require.main === module) {
  deployGASOCR()
    .then(() => {
      console.log('\n✅ デプロイスクリプトが完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ デプロイに失敗しました:', error);
      process.exit(1);
    });
}

export { deployGASOCR };