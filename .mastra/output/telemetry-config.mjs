// テレメトリーを完全に無効化
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
