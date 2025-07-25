const express = require('express');
const app = express();
const port = process.env.PORT || 4111;

app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});