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

    // Calculate leaderboard data for each player (V2 games only)
    const leaderboardData = players.map(player => {
      let totalScore = 0;
      let totalPlayed = 0;
      let solvedCount = 0;
      
      // Process V2 cases only
      player.solvedCasesV2.forEach(playerCase => {
        totalPlayed++;
        
        if (playerCase.solvedFinal) {
          solvedCount++;
          
          let baseScore = playerCase.pointsEarned || 150; // Default 150 for V2
          let difficultyMultiplier = 1.0;
          
          switch (playerCase.gameV2.difficulty) {
            case 'easy':
              difficultyMultiplier = 1.0;
              break;
            case 'medium':
              difficultyMultiplier = 1.25;
              break;
            case 'hard':
              difficultyMultiplier = 1.75;
              break;
          }
          
          // Bonus for solving locations quickly (under 5 turns)
          if (playerCase.turnsUsed && playerCase.turnsUsed <= 5) {
            baseScore += 75; // Quick location solve bonus
          }
          
          // Bonus for finding 4th location on 6th turn
          if (playerCase.turnsUsed && playerCase.turnsUsed === 6) {
            baseScore += 100; // Perfect final location bonus
          }
          
          totalScore += Math.round(baseScore * difficultyMultiplier);
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
    
    // Filter by difficulty type if specified
    let filteredData = leaderboardData;
    if (type !== 'overall') {
      const targetDifficulty = type.replace('Champions', '').replace('Masters', '').replace('Heroes', '').toLowerCase();
      
      // Filter players who have played the target difficulty
      const filteredPlayers = [];
      for (const player of leaderboardData) {
        const hasPlayed = await hasPlayedDifficulty(player.playerId, targetDifficulty);
        if (hasPlayed) {
          filteredPlayers.push(player);
        }
      }
      filteredData = filteredPlayers;
    }
    
    // Filter out players with no games played
    filteredData = filteredData.filter(player => player.totalPlayed > 0);
    
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