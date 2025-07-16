const express = require('express');
const router = express.Router();
const { prisma } = require('../utils/clients');
const { generateGameV2Async, generateDiverseThemes } = require('../utils/gameGeneration');

// Single game generation
router.post('/generate', async (req, res) => {
  try {
    const { userInput, specificLocations, difficulty, finalObjective } = req.body;
    
    // Randomly select values when not provided
    const difficultyOptions = ['easy', 'medium', 'hard'];
    const finalObjectiveOptions = [
      'WHERE_STASHED', 'NEXT_TARGET', 'VILLAIN_HIDEOUT', 'EVIDENCE_SOURCE',
      'VILLAIN_HOMETOWN', 'ACCOMPLICE_LOCATION', 'ESCAPE_ROUTE', 'TREASURE_DESTINATION',
      'VILLAIN_INSPIRATION', 'FINAL_HEIST', 'CRIME_ORIGIN', 'FAMILY_TIES', 'RETIREMENT_PLAN'
    ];
    
    const selectedDifficulty = difficulty || difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
    const selectedFinalObjective = finalObjective || finalObjectiveOptions[Math.floor(Math.random() * finalObjectiveOptions.length)];
    
    // Create initial game record
    const game = await prisma.gameV2.create({
      data: {
        theme: 'GENERATING...',
        phrase: 'Generation in progress',
        category: 'Geography',
        difficulty: selectedDifficulty,
        villainName: 'TBD',
        villainTitle: 'TBD',
        villainGender: 'TBD',
        villainAge: 'TBD',
        villainRace: 'TBD',
        villainEthnicity: 'TBD',
        villainDistinctiveFeature: 'TBD',
        villainClothingDescription: 'TBD',
        caseTitle: 'TBD',
        crimeSummary: 'TBD',
        interestingFact: 'TBD',
        finalLocationObjective: selectedFinalObjective,
        finalLocationNarrative: 'TBD',
        finalInterestingFact: 'TBD',
        gameCompletionMessage: 'TBD'
      }
    });
    
    // Create generation tracking record
    await prisma.generationV2.create({
      data: {
        gameV2Id: game.id,
        status: 'pending',
        currentStep: 'initialization',
        totalSteps: 20,
        completedSteps: 0
      }
    });
    
    // Start async generation
    generateGameV2Async(game.id, { userInput, specificLocations, difficulty: selectedDifficulty, finalObjective: selectedFinalObjective });
    
    res.json({ 
      gameId: game.id, 
      status: 'generating',
      message: 'V2 game generation started'
    });
    
  } catch (error) {
    console.error('V2 game creation error:', error);
    res.status(500).json({ 
      error: 'Failed to start V2 game generation',
      details: error.message
    });
  }
});

// Get generation status
router.get('/:id/status', async (req, res) => {
  try {
    const generation = await prisma.generationV2.findUnique({
      where: { gameV2Id: req.params.id },
      include: {
        gameV2: {
          select: {
            id: true,
            theme: true,
            caseTitle: true,
            difficulty: true,
            isPublished: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!generation) {
      return res.status(404).json({ error: 'Generation not found' });
    }
    
    res.json(generation);
    
  } catch (error) {
    console.error('V2 status fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to get generation status',
      details: error.message
    });
  }
});

// Bulk game generation
router.post('/bulk-generate', async (req, res) => {
  try {
    const { userInput, specificLocations, finalObjective, kidFriendly, villainIntegration, numberOfGames, bulkDifficulty } = req.body;
    
    const difficultyOptions = ['easy', 'medium', 'hard'];
    const finalObjectiveOptions = [
      'WHERE_STASHED', 'NEXT_TARGET', 'VILLAIN_HIDEOUT', 'EVIDENCE_SOURCE',
      'VILLAIN_HOMETOWN', 'ACCOMPLICE_LOCATION', 'ESCAPE_ROUTE', 'TREASURE_DESTINATION',
      'VILLAIN_INSPIRATION', 'FINAL_HEIST', 'CRIME_ORIGIN', 'FAMILY_TIES', 'RETIREMENT_PLAN'
    ];
    
    // Generate diverse themes for bulk generation
    console.log(`🎨 Generating ${numberOfGames} diverse themes for bulk generation...`);
    const diverseThemes = await generateDiverseThemes(numberOfGames, userInput);
    console.log(`✨ Generated themes: ${diverseThemes.join(', ')}`);
    
    const gameIds = [];
    
    // Create multiple games with different themes
    for (let i = 0; i < numberOfGames; i++) {
      // Determine difficulty for this game
      let gameDifficulty;
      if (bulkDifficulty && bulkDifficulty !== '') {
        gameDifficulty = bulkDifficulty;
      } else {
        // Random difficulty
        gameDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
      }
      
      // Random final objective if not specified
      const gameFinalObjective = finalObjective || finalObjectiveOptions[Math.floor(Math.random() * finalObjectiveOptions.length)];
      
      // Use diverse theme for this game
      const gameTheme = diverseThemes[i] || `mystery case ${i + 1}`;
      
      // Create initial game record
      const game = await prisma.gameV2.create({
        data: {
          theme: 'GENERATING...',
          phrase: 'Generation in progress',
          category: 'Geography',
          difficulty: gameDifficulty,
          villainName: 'TBD',
          villainTitle: 'TBD',
          villainGender: 'TBD',
          villainAge: 'TBD',
          villainRace: 'TBD',
          villainEthnicity: 'TBD',
          villainDistinctiveFeature: 'TBD',
          villainClothingDescription: 'TBD',
          caseTitle: 'TBD',
          crimeSummary: 'TBD',
          interestingFact: 'TBD',
          finalLocationObjective: gameFinalObjective,
          finalLocationNarrative: 'TBD',
          finalInterestingFact: 'TBD',
          gameCompletionMessage: 'TBD'
        }
      });
      
      // Create generation tracking record
      await prisma.generationV2.create({
        data: {
          gameV2Id: game.id,
          status: 'pending',
          currentStep: 'initialization',
          totalSteps: 20,
          completedSteps: 0
        }
      });
      
      gameIds.push(game.id);
    }
    
    // Start async generation for all games with their unique themes
    gameIds.forEach((gameId, index) => {
      const gameTheme = diverseThemes[index] || `mystery case ${index + 1}`;
      
      // Get the difficulty for this specific game (already stored in database)
      let gameDifficulty;
      if (bulkDifficulty && bulkDifficulty !== '') {
        gameDifficulty = bulkDifficulty;
      } else {
        // Random difficulty
        gameDifficulty = difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
      }
      
      // Random final objective if not specified
      const gameFinalObjective = finalObjective || finalObjectiveOptions[Math.floor(Math.random() * finalObjectiveOptions.length)];
      
      generateGameV2Async(gameId, { 
        userInput: gameTheme, // Use unique theme for each game
        specificLocations, 
        difficulty: gameDifficulty, // Use the actual difficulty
        finalObjective: gameFinalObjective // Use the actual final objective
      });
    });
    
    res.json({ 
      gameIds, 
      status: 'generating',
      message: `Bulk generation started for ${numberOfGames} games`
    });
    
  } catch (error) {
    console.error('Bulk V2 game creation error:', error);
    res.status(500).json({ 
      error: 'Failed to start bulk V2 game generation',
      details: error.message
    });
  }
});

// Get bulk generation status
router.post('/bulk-status', async (req, res) => {
  try {
    const { gameIds } = req.body;
    
    if (!gameIds || !Array.isArray(gameIds)) {
      return res.status(400).json({ error: 'gameIds array is required' });
    }
    
    const statuses = await prisma.generationV2.findMany({
      where: {
        gameV2Id: {
          in: gameIds
        }
      },
      include: {
        gameV2: {
          select: {
            id: true,
            theme: true,
            caseTitle: true,
            difficulty: true,
            isPublished: true,
            createdAt: true
          }
        }
      },
      orderBy: { gameV2Id: 'asc' }
    });
    
    res.json(statuses);
    
  } catch (error) {
    console.error('Bulk status fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to get bulk generation status',
      details: error.message
    });
  }
});

// Get all V2 games for admin
router.get('/', async (req, res) => {
  try {
    const games = await prisma.gameV2.findMany({
      include: {
        locationsV2: {
          select: {
            id: true,
            position: true,
            name: true,
            country: true,
            hasImage: true
          }
        },
        finalLocationV2: {
          select: {
            id: true,
            name: true,
            country: true
          }
        },
        generationV2: {
          select: {
            status: true,
            completedSteps: true,
            totalSteps: true
          }
        },
        _count: {
          select: {
            gameplayTurns: true,
            playerCasesV2: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(games);
    
  } catch (error) {
    console.error('V2 games fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch V2 games',
      details: error.message
    });
  }
});

// Get detailed game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await prisma.gameV2.findUnique({
      where: { id: req.params.id },
      include: {
        locationsV2: {
          orderBy: { position: 'asc' }
        },
        finalLocationV2: true,
        gameplayTurns: {
          include: {
            clues: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { turn: 'asc' }
        },
        generationV2: true,
        playerCasesV2: {
          include: {
            player: {
              select: {
                username: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!game) {
      return res.status(404).json({ error: 'V2 game not found' });
    }
    
    res.json(game);
    
  } catch (error) {
    console.error('V2 game fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch V2 game',
      details: error.message
    });
  }
});

// Fix missing phase timing data
router.post('/fix-completed', async (req, res) => {
  try {
    // Find all completed games that are missing phase timing data
    const completedGames = await prisma.generationV2.findMany({
      where: {
        status: 'completed',
        OR: [
          { completedAt: null },
          { phase1StartTime: null }
        ]
      },
      include: {
        gameV2: {
          select: {
            id: true,
            caseTitle: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
    
    console.log(`Found ${completedGames.length} completed games missing timing data`);
    
    // Update each completed game
    for (const generation of completedGames) {
      const gameCreatedAt = generation.gameV2.createdAt;
      const gameUpdatedAt = generation.gameV2.updatedAt;
      
      // Estimate phase timing based on creation and update times
      const totalDuration = new Date(gameUpdatedAt) - new Date(gameCreatedAt);
      const estimatedPhase1Duration = Math.floor(totalDuration * 0.15); // 15% of total time
      const estimatedPhase2Duration = Math.floor(totalDuration * 0.05); // 5% of total time
      const estimatedPhase3Duration = Math.floor(totalDuration * 0.20); // 20% of total time
      const estimatedPhase4Duration = Math.floor(totalDuration * 0.60); // 60% of total time
      
      const phase1Start = new Date(gameCreatedAt);
      const phase1End = new Date(phase1Start.getTime() + estimatedPhase1Duration);
      const phase2Start = new Date(phase1End);
      const phase2End = new Date(phase2Start.getTime() + estimatedPhase2Duration);
      const phase3Start = new Date(phase2End);
      const phase3End = new Date(phase3Start.getTime() + estimatedPhase3Duration);
      const phase4Start = new Date(phase3End);
      const phase4End = new Date(gameUpdatedAt);
      
      await prisma.generationV2.update({
        where: { id: generation.id },
        data: {
          completedAt: generation.completedAt || gameUpdatedAt,
          phase1StartTime: phase1Start,
          phase1EndTime: phase1End,
          phase2StartTime: phase2Start,
          phase2EndTime: phase2End,
          phase3StartTime: phase3Start,
          phase3EndTime: phase3End,
          phase4StartTime: phase4Start,
          phase4EndTime: phase4End
        }
      });
      
      console.log(`✅ Fixed ${generation.gameV2.caseTitle} - added phase timing data`);
    }
    
    res.json({ 
      success: true, 
      message: `Fixed ${completedGames.length} completed games`,
      fixedGames: completedGames.map(g => ({
        id: g.gameV2.id,
        title: g.gameV2.caseTitle,
        totalDuration: new Date(g.gameV2.updatedAt) - new Date(g.gameV2.createdAt)
      }))
    });
    
  } catch (error) {
    console.error('Fix completed games error:', error);
    res.status(500).json({ 
      error: 'Failed to fix completed games',
      details: error.message
    });
  }
});

// Publish/unpublish game
router.put('/:id/publish', async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    const updatedGame = await prisma.gameV2.update({
      where: { id: req.params.id },
      data: { 
        isPublished: isPublished,
        publishedAt: isPublished ? new Date() : null
      }
    });
    
    res.json({ 
      success: true, 
      game: updatedGame,
      message: `V2 game ${isPublished ? 'published' : 'unpublished'} successfully`
    });
    
  } catch (error) {
    console.error('V2 game publish error:', error);
    res.status(500).json({ 
      error: 'Failed to update V2 game publish status',
      details: error.message
    });
  }
});

// Delete game
router.delete('/:id', async (req, res) => {
  try {
    const gameId = req.params.id;
    
    // First, delete all player case data for this game
    await prisma.playerCaseV2.deleteMany({
      where: { gameV2Id: gameId }
    });
    
    // Then delete the game (this will cascade delete all related data)
    await prisma.gameV2.delete({
      where: { id: gameId }
    });
    
    res.json({ 
      success: true,
      message: 'V2 game and all user data deleted successfully'
    });
    
  } catch (error) {
    console.error('V2 game deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete V2 game',
      details: error.message
    });
  }
});

module.exports = router;