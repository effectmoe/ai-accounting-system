import { Mastra } from '@mastra/core';

const mastra = new Mastra({
  name: 'accounting-automation',
  telemetry: {
    enabled: false  // Disable telemetry to fix deployment
  }
});

export default mastra;