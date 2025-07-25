
const express = require('express');
const app = express();
const port = process.env.PORT || 4111;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mastra-accounting-automation',
    timestamp: new Date().toISOString()
  });
});

// Agents info
app.get('/agents', (req, res) => {
  res.json({
    agents: [
      'accountingAgent',
      'customerAgent',
      'databaseAgent',
      'deploymentAgent',
      'japanTaxAgent',
      'ocrAgent',
      'problemSolvingAgent',
      'productAgent',
      'refactorAgent',
      'uiAgent',
      'constructionAgent'
    ],
    count: 11
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Mastra server running on http://0.0.0.0:${port}`);
});
