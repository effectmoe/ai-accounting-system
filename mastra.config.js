const { Mastra } = require('@mastra/core');

const mastra = new Mastra({
  name: 'accounting-automation',
  telemetry: {
    enabled: false
  }
});

module.exports = mastra;