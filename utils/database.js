const { prisma } = require('./clients');

// Update generation progress for V2 games
async function updateGenerationProgress(gameId, step, completedSteps) {
  try {
    const updateData = {
      currentStep: step,
      completedSteps
    };
    
    // Set status and completedAt when generation is complete
    if (step === 'completed') {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    }
    
    await prisma.generationV2.upsert({
      where: { gameV2Id: gameId },
      update: updateData,
      create: {
        gameV2Id: gameId,
        status: step === 'completed' ? 'completed' : 'generating',
        currentStep: step,
        completedSteps,
        totalSteps: 20
      }
    });
  } catch (error) {
    console.error(`Failed to update generation progress for game ${gameId}:`, error);
  }
}

// Get most frequently used cities for theme diversity
async function getMostUsedCities(limit = 20) {
  try {
    const cityUsage = await prisma.locationV2.groupBy({
      by: ['name'],
      _count: {
        name: true
      },
      orderBy: {
        _count: {
          name: 'desc'
        }
      },
      take: limit
    });

    return cityUsage.map(item => ({
      city: item.name,
      count: item._count.name
    }));
  } catch (error) {
    console.error('Error getting most used cities:', error);
    return [];
  }
}

// Determine player's most played difficulty
function getMostPlayedDifficulty(player) {
  if (!player.easyCompletions && !player.mediumCompletions && !player.hardCompletions) {
    return null;
  }
  
  const difficulties = [
    { name: 'easy', count: player.easyCompletions || 0 },
    { name: 'medium', count: player.mediumCompletions || 0 },
    { name: 'hard', count: player.hardCompletions || 0 }
  ];
  
  return difficulties.reduce((prev, current) => 
    (current.count > prev.count) ? current : prev
  ).name;
}

// Check if player has played a specific difficulty
async function hasPlayedDifficulty(playerId, targetDifficulty) {
  try {
    const completions = await prisma.playerCaseV2.count({
      where: {
        playerId: playerId,
        gameV2: {
          difficulty: targetDifficulty
        },
        solvedFinal: true  // Player completed the case (solved all 4 locations)
      }
    });
    
    return completions > 0;
  } catch (error) {
    console.error(`Error checking if player ${playerId} has played ${targetDifficulty}:`, error);
    return false;
  }
}

module.exports = {
  updateGenerationProgress,
  getMostUsedCities,
  getMostPlayedDifficulty,
  hasPlayedDifficulty
};