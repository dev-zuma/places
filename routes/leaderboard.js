const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/clients');
const { getMostPlayedDifficulty, hasPlayedDifficulty } = require('../utils/database');

// Get leaderboard data with weighted scoring
router.get('/', async (req, res) => {
  try {
    const { type = 'overall' } = req.query;
    
    // Fetch all players with their V2 solved cases only
    const players = await prisma.player.findMany({
      include: {
        solvedCasesV2: {
          include: {
            gameV2: {
              select: {
                difficulty: true
              }
            }
          }
        }
      }
    });

    // Determine target difficulty for filtering
    const targetDifficulty = type !== 'overall' ? type : null;
    console.log('🎯 Leaderboard request - Type:', type, 'Target Difficulty:', targetDifficulty);
    
    // Calculate leaderboard data for each player (V2 games only)
    const leaderboardData = players.map(player => {
      let totalScore = 0;
      let totalPlayed = 0;
      let solvedCount = 0;
      
      // Process V2 cases only
      player.solvedCasesV2.forEach(playerCase => {
        // If filtering by difficulty, only count games of that difficulty
        if (targetDifficulty && playerCase.gameV2.difficulty !== targetDifficulty) {
          return; // Skip this game
        }
        
        totalPlayed++;
        
        if (playerCase.solvedFinal) {
          solvedCount++;
          
          // Use the score calculated by the frontend (new scoring system)
          // The frontend now calculates the complete score including all bonuses
          let finalScore = playerCase.pointsEarned || 0;
          
          totalScore += finalScore;
        }
      });
      
      const solveRate = totalPlayed > 0 ? Math.round((solvedCount / totalPlayed) * 100) : 0;
      
      return {
        username: player.username,
        totalScore,
        totalPlayed,
        solvedCount,
        solveRate,
        difficulty: getMostPlayedDifficulty(player),
        playerId: player.id
      };
    });
    
    // Filter out players with no games played (important for difficulty-specific views)
    let filteredData = leaderboardData.filter(player => player.totalPlayed > 0);
    
    // Sort by total score descending, then by solve rate descending
    filteredData.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.solveRate - a.solveRate;
    });
    
    res.json(filteredData);
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

module.exports = router;