#!/usr/bin/env node

/**
 * Fix Turn 5 Country Clues Location Assignment
 * 
 * This script fixes existing games in the database where Turn 5 country clues
 * are marked as "general" instead of being tied to specific locations.
 * 
 * The script:
 * 1. Finds all games with Turn 5 clues that have null locationPositions
 * 2. Uses OpenAI to analyze each country clue and determine which location it applies to
 * 3. Updates the database with proper locationPositions arrays
 * 4. Validates that each location gets exactly one country clue
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fixTurn5Clues() {
  console.log('🔍 Starting Turn 5 clue location assignment fix...\n');

  try {
    // Find all games with Turn 5 clues that need fixing
    const gamesWithTurn5Issues = await prisma.gameV2.findMany({
      where: {
        isPublished: true
      },
      include: {
        locationsV2: {
          orderBy: { position: 'asc' }
        },
        gameplayTurns: {
          where: { turn: 5 },
          include: {
            clues: {
              where: {
                locationPositions: null  // These are the broken clues
              }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${gamesWithTurn5Issues.length} games to analyze\n`);

    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const game of gamesWithTurn5Issues) {
      const turn5 = game.gameplayTurns[0];
      if (!turn5 || turn5.clues.length === 0) {
        console.log(`⏭️  Skipping game ${game.id} - no Turn 5 clues found`);
        totalSkipped++;
        continue;
      }

      console.log(`🎮 Processing game: ${game.caseTitle}`);
      console.log(`   Game ID: ${game.id}`);
      console.log(`   Locations: ${game.locationsV2.map(l => `${l.name}, ${l.country}`).join(' | ')}`);
      console.log(`   Turn 5 clues to fix: ${turn5.clues.length}`);

      try {
        // Prepare data for OpenAI analysis
        const locationData = game.locationsV2.map(loc => ({
          position: loc.position,
          name: loc.name,
          country: loc.country
        }));

        const clueData = turn5.clues.map(clue => ({
          id: clue.id,
          type: clue.type,
          content: clue.content,
          description: clue.description
        }));

        // Use OpenAI to analyze and assign clues to locations
        const fixedClues = await analyzeAndFixClues(locationData, clueData);

        if (fixedClues.length !== turn5.clues.length) {
          console.log(`   ❌ Error: Expected ${turn5.clues.length} clues, got ${fixedClues.length}`);
          totalErrors++;
          continue;
        }

        // Validate that each location gets exactly one clue
        const locationCounts = {};
        for (const clue of fixedClues) {
          for (const pos of clue.locationPositions) {
            locationCounts[pos] = (locationCounts[pos] || 0) + 1;
          }
        }

        const expectedPositions = [1, 2, 3];
        const allPositionsHaveOneClue = expectedPositions.every(pos => locationCounts[pos] === 1);
        
        if (!allPositionsHaveOneClue) {
          console.log(`   ❌ Error: Invalid location distribution: ${JSON.stringify(locationCounts)}`);
          totalErrors++;
          continue;
        }

        // Update database with fixed clues
        for (const fixedClue of fixedClues) {
          await prisma.clue.update({
            where: { id: fixedClue.id },
            data: {
              locationPositions: JSON.stringify(fixedClue.locationPositions)
            }
          });
        }

        console.log(`   ✅ Fixed ${fixedClues.length} clues successfully`);
        console.log(`   📍 Distribution: ${fixedClues.map(c => `Pos ${c.locationPositions[0]}`).join(', ')}\n`);
        totalFixed++;

      } catch (error) {
        console.log(`   ❌ Error processing game ${game.id}: ${error.message}\n`);
        totalErrors++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Fix operation completed!');
    console.log(`✅ Games fixed: ${totalFixed}`);
    console.log(`⏭️  Games skipped: ${totalSkipped}`);
    console.log(`❌ Games with errors: ${totalErrors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function analyzeAndFixClues(locations, clues) {
  const prompt = `You are analyzing Turn 5 country clues from a geography game that need to be properly assigned to specific locations.

LOCATIONS:
${locations.map(loc => `Position ${loc.position}: ${loc.name}, ${loc.country}`).join('\n')}

CLUES TO FIX:
${clues.map((clue, idx) => `Clue ${idx + 1} (ID: ${clue.id}): "${clue.description}"`).join('\n')}

TASK: Analyze each clue and determine which location (1, 2, or 3) it applies to based on the country information.

RULES:
- Each clue should be about ONE specific location's country
- Each location should get exactly ONE clue
- Use the country information to match clues to locations
- Country clues can be about currency, flag, geography, history, culture, etc.

IMPORTANT: If a clue contains factually incorrect information (like wrong flag descriptions), still assign it to the most logical location based on the intended country.

Return a JSON array with this exact format:
[
  {
    "id": "clue_id_1",
    "locationPositions": [1]
  },
  {
    "id": "clue_id_2", 
    "locationPositions": [2]
  },
  {
    "id": "clue_id_3",
    "locationPositions": [3]
  }
]

CRITICAL: Each location (1, 2, 3) must appear exactly once in the locationPositions arrays.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a geography expert helping to fix database clue assignments. Return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1
  });

  const result = JSON.parse(response.choices[0].message.content);
  
  // Validate the result
  if (!Array.isArray(result) || result.length !== clues.length) {
    throw new Error(`Invalid response format: expected array of ${clues.length} items`);
  }

  for (const item of result) {
    if (!item.id || !Array.isArray(item.locationPositions) || item.locationPositions.length !== 1) {
      throw new Error(`Invalid clue format: ${JSON.stringify(item)}`);
    }
  }

  return result;
}

// Run the script
if (require.main === module) {
  fixTurn5Clues().catch(console.error);
}

module.exports = { fixTurn5Clues };