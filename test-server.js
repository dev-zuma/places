const express = require('express');
const app = express();
const port = 9091;

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working' });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});