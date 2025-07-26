const fs = require('fs');
const path = require('path');

// telemetry-config.mjsファイルの修正
const telemetryPath = path.join(__dirname, '../.mastra/output/telemetry-config.mjs');

// テレメトリーを無効化する内容
const telemetryContent = `// テレメトリーを完全に無効化
export const telemetry = {
  enabled: false,
  serviceName: 'accounting-automation',
  sampling: {
    type: 'always_off'
  }
};

// mastraをimportしてからexport
import { mastra } from './index.mjs';
export default mastra;
`;

// ファイルを書き込み
if (fs.existsSync(telemetryPath)) {
  fs.writeFileSync(telemetryPath, telemetryContent);
  console.log('✓ telemetry-config.mjs updated to disable telemetry');
}

// 環境変数の設定
process.env.DO_NOT_TRACK = '1';
console.log('✓ Telemetry disabled via environment variable');