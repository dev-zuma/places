const express = require('express');
const router = express.Router();

// API: Google Client ID configuration
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});

// Debug endpoint for testing
router.get('/debug/test', async (req, res) => {
  try {
    res.json({ 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;