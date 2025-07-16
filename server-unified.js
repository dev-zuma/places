require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import utilities and clients
const { corsOptions, port } = require('./utils/clients');
const { setupStaticRoutes } = require('./routes/static');

// Import route modules
const configRoutes = require('./routes/config');
const adminRoutes = require('./routes/admin');
const gamesRoutes = require('./routes/games');
const casesRoutes = require('./routes/cases');
const playersRoutes = require('./routes/players');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Setup static file serving and root routes
setupStaticRoutes(app);

// API Routes
app.use('/api', configRoutes);
app.use('/api', adminRoutes);
app.use('/api/v2/games', gamesRoutes);
app.use('/api/v2/cases', casesRoutes);
app.use('/api/v2/games', casesRoutes); // For submit-result endpoint (:id/submit-result)
app.use('/api/players', playersRoutes);
app.use('/api/v2/players', playersRoutes); // For v2 player results endpoint
app.use('/api/leaderboard', leaderboardRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 Worldwide Chase server running on port ${port}`);
  console.log(`📍 Local game: http://localhost:${port}/game/`);
  console.log(`🔧 Admin panel: http://localhost:${port}/admin/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down server...');
  process.exit(0);
});