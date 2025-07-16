const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/clients');

// Create or update player profile
router.post('/', async (req, res) => {
  try {
    const { id, email, username } = req.body;
    
    if (!id || !email) {
      return res.status(400).json({ 
        error: 'Player ID and email are required' 
      });
    }
    
    // Check if player exists
    let player = await prisma.player.findUnique({
      where: { email }
    });
    
    if (player) {
      // Update existing player
      player = await prisma.player.update({
        where: { id: player.id },
        data: {
          username: username || player.username
        }
      });
    } else {
      // Create new player
      player = await prisma.player.create({
        data: {
          id,
          email,
          username: username || `Player${Date.now()}`,
          totalCases: 0,
          totalPoints: 0
        }
      });
    }
    
    res.json(player);
    
  } catch (error) {
    console.error('Create/update player error:', error);
    res.status(500).json({ 
      error: 'Failed to create/update player',
      details: error.message
    });
  }
});

// Get player profile with statistics
router.get('/:playerId/profile', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        solvedCasesV2: {
          include: {
            gameV2: {
              select: {
                id: true,
                caseTitle: true,
                villainName: true,
                difficulty: true
              }
            }
          }
        }
      }
    });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Calculate statistics
    const completedCases = player.solvedCasesV2.filter(c => 
      c.solvedLocations && c.solvedFinal
    );
    
    const averageScore = completedCases.length > 0 
      ? Math.round(completedCases.reduce((sum, c) => sum + (c.pointsEarned || 0), 0) / completedCases.length)
      : 0;
    
    const bestScore = completedCases.length > 0
      ? Math.max(...completedCases.map(c => c.pointsEarned || 0))
      : 0;
    
    const averageTurns = completedCases.length > 0
      ? Math.round(completedCases.reduce((sum, c) => sum + (c.turnsUsed || 0), 0) / completedCases.length)
      : 0;
    
    res.json({
      ...player,
      statistics: {
        completedCases: completedCases.length,
        averageScore,
        bestScore,
        averageTurns,
        totalCasesStarted: player.solvedCasesV2.length
      }
    });
    
  } catch (error) {
    console.error('Get player profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player profile',
      details: error.message
    });
  }
});

// Get player's V2 game results
router.get('/:playerId/results', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const results = await prisma.playerCaseV2.findMany({
      where: { playerId },
      include: {
        gameV2: {
          select: {
            id: true,
            caseTitle: true,
            villainName: true,
            villainTitle: true,
            theme: true,
            difficulty: true
          }
        }
      },
      orderBy: { solvedAt: 'desc' }
    });
    
    res.json(results);
    
  } catch (error) {
    console.error('Get player results error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch player results',
      details: error.message
    });
  }
});

module.exports = router;