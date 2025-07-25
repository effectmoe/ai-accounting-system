const express = require('express');
const app = express();
const port = process.env.PORT || 4111;

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Mastra Cloud Readiness Check' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});