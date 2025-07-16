const express = require('express');
const path = require('path');

function setupStaticRoutes(app) {
  // Serve static files from multiple directories
  app.use('/admin', express.static(path.join(__dirname, '../admin')));
  app.use('/game', express.static(path.join(__dirname, '../game')));
  app.use('/history', express.static(path.join(__dirname, '../history')));
  app.use('/result', express.static(path.join(__dirname, '../result')));
  app.use('/mockups', express.static(path.join(__dirname, '../mockups')));

  // Serve test files from root
  app.get('/villain-style-test.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../villain-style-test.html'));
  });

  app.get('/test-villain-styles.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../test-villain-styles.html'));
  });

  // Serve static assets from public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // Root redirect - go to game gallery
  app.get('/', (req, res) => {
    res.redirect('/game/');
  });
}

module.exports = { setupStaticRoutes };