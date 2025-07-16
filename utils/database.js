const { prisma } = require('./clients');

// Update generation progress for V2 games
async function updateGenerationProgress(gameId, step, completedSteps) {
  try {
    await prisma.generationV2.upsert({
      where: { gameId },
      update: {
        step,
        completedSteps,
        updatedAt: new Date()
      },
      create: {
        gameId,
        step,
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
      by: ['city'],
      _count: {
        city: true
      },
      orderBy: {
        _count: {
          city: 'desc'
        }
      },
      take: limit
    });

    return cityUsage.map(item => ({
      city: item.city,
      count: item._count.city
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
        game: {
          difficulty: targetDifficulty
        },
        completed: true
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