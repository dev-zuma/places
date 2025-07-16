const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/clients');

// Get published games for players
router.get('/', async (req, res) => {
  try {
    const cases = await prisma.gameV2.findMany({
      where: { isPublished: true },
      include: {
        locationsV2: {
          select: {
            id: true,
            position: true,
            name: true,
            country: true
          }
        },
        finalLocationV2: {
          select: {
            id: true,
            name: true,
            country: true
          }
        },
        _count: {
          select: {
            playerCasesV2: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' }
    });
    
    res.json(cases);
    
  } catch (error) {
    console.error('V2 cases fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch V2 cases',
      details: error.message
    });
  }
});

// Submit game result (this will be mounted at /api/v2/games/:id/submit-result)
router.post('/:id/submit-result', async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const { 
      playerId, 
      playerEmail, 
      playerUsername,
      solvedLocations, 
      solvedFinal, 
      pointsEarned, 
      turnsUsed,
      timeTaken 
    } = req.body;
    
    if (!playerId || !playerEmail) {
      return res.status(400).json({ 
        error: 'Player ID and email are required' 
      });
    }
    
    // Find or create player
    let player = await prisma.player.findUnique({
      where: { email: playerEmail }
    });
    
    if (!player) {
      // Create new player
      player = await prisma.player.create({
        data: {
          id: playerId,
          email: playerEmail,
          username: playerUsername || `Player${Date.now()}`,
          totalCases: 0,
          totalPoints: 0
        }
      });
    }
    
    // Check if player already has a result for this game
    const existingResult = await prisma.playerCaseV2.findUnique({
      where: {
        playerId_gameV2Id: {
          playerId: player.id,
          gameV2Id: gameId
        }
      }
    });
    
    if (existingResult) {
      // Update existing result with better score if applicable
      const shouldUpdate = pointsEarned > (existingResult.pointsEarned || 0);
      
      if (shouldUpdate) {
        const updatedResult = await prisma.playerCaseV2.update({
          where: { id: existingResult.id },
          data: {
            solvedLocations: solvedLocations || existingResult.solvedLocations,
            solvedFinal: solvedFinal || existingResult.solvedFinal,
            pointsEarned: pointsEarned,
            turnsUsed: turnsUsed,
            solvedAt: new Date()
          }
        });
        
        return res.json({ 
          message: 'Result updated with better score',
          result: updatedResult,
          newRecord: true
        });
      } else {
        return res.json({ 
          message: 'Existing result is better',
          result: existingResult,
          newRecord: false
        });
      }
    }
    
    // Create new result
    const gameResult = await prisma.playerCaseV2.create({
      data: {
        playerId: player.id,
        gameV2Id: gameId,
        solvedLocations: solvedLocations || false,
        solvedFinal: solvedFinal || false,
        pointsEarned: pointsEarned || 0,
        turnsUsed: turnsUsed || 0,
        solvedAt: new Date()
      }
    });
    
    // Update player totals
    const isGameCompleted = solvedLocations && solvedFinal;
    if (isGameCompleted) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          totalCases: { increment: 1 },
          totalPoints: { increment: pointsEarned || 0 }
        }
      });
    }
    
    res.json({ 
      message: 'Game result saved successfully',
      result: gameResult,
      newRecord: true
    });
    
  } catch (error) {
    console.error('Submit V2 result error:', error);
    res.status(500).json({ 
      error: 'Failed to save game result',
      details: error.message
    });
  }
});

module.exports = router;