import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  name: "AI Accounting System",
  telemetry: { enabled: false }
});

export const telemetry = { enabled: false };
export default mastra;
