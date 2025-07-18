#!/usr/bin/env node

/**
 * Fix Turn 5 Country Clues Content and Location Assignment
 * 
 * This script not only fixes location assignments but also regenerates
 * factually correct country clues to replace any incorrect information.
 * 
 * The script:
 * 1. Finds all games with Turn 5 clues
 * 2. Uses OpenAI to generate new, factually correct country clues
 * 3. Assigns them to proper locations
 * 4. Updates the database with accurate content
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fixTurn5CluesContent() {
  console.log('🔍 Starting Turn 5 clue content and location assignment fix...\n');

  try {
    // Find all games with Turn 5 clues
    const gamesWithTurn5 = await prisma.gameV2.findMany({
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
            clues: true
          }
        }
      }
    });

    console.log(`📊 Found ${gamesWithTurn5.length} games to process\n`);

    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const game of gamesWithTurn5) {
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
        // Generate new factually correct clues
        const newClues = await generateCorrectCountryClues(game.locationsV2, turn5.clues);

        if (newClues.length !== turn5.clues.length) {
          console.log(`   ❌ Error: Expected ${turn5.clues.length} clues, got ${newClues.length}`);
          totalErrors++;
          continue;
        }

        // Update database with new clues
        for (let i = 0; i < newClues.length; i++) {
          const originalClue = turn5.clues[i];
          const newClue = newClues[i];

          await prisma.clue.update({
            where: { id: originalClue.id },
            data: {
              description: newClue.description,
              content: newClue.content,
              locationPositions: JSON.stringify(newClue.locationPositions)
            }
          });
        }

        console.log(`   ✅ Fixed ${newClues.length} clues with new content`);
        console.log(`   📍 Distribution: ${newClues.map(c => `Pos ${c.locationPositions[0]}`).join(', ')}`);
        console.log(`   📝 New clues: ${newClues.map(c => c.description.substring(0, 50) + '...').join(' | ')}\n`);
        totalFixed++;

      } catch (error) {
        console.log(`   ❌ Error processing game ${game.id}: ${error.message}\n`);
        totalErrors++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
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

async function generateCorrectCountryClues(locations, existingClues) {
  const prompt = `You are generating factually correct country clues for Turn 5 of a geography detective game.

LOCATIONS:
${locations.map(loc => `Position ${loc.position}: ${loc.name}, ${loc.country}`).join('\n')}

TASK: Generate exactly 3 factually correct country clues - one for each location's country.

CRITICAL ACCURACY REQUIREMENTS:
🚨 Flag descriptions MUST be 100% accurate or avoided entirely
🚨 Currency information MUST be current and correct
🚨 Geographic features MUST be factually verified
🚨 Historical facts MUST be accurate

SAFE COUNTRY CLUE TYPES:
- Currency: "This country uses the [currency name] currency"
- Geography: "This country is located in [continent]" 
- Well-known features: "This country is famous for [verified landmark/feature]"
- Language: "The official language of this country is [language]"

AVOID RISKY CLUES:
- Detailed flag descriptions (unless 100% certain)
- Specific historical dates or events
- Cultural generalizations
- Economic statistics

EXAMPLES OF GOOD CLUES:
- "This country uses the Euro currency"
- "This country is located in South America"
- "The official language of this country is Portuguese"
- "This country is famous for its maple syrup"

COUNTRY-SPECIFIC ACCURACY NOTES:
- South Africa: Y-shaped flag design with six colors (avoid detailed descriptions)
- Brazil: Uses the Real currency, Portuguese language
- Japan: Uses the Yen currency, located in East Asia
- France: Uses the Euro currency, located in Western Europe

Return a JSON array with this exact format:
[
  {
    "position": 1,
    "description": "Factually correct clue about location 1's country",
    "content": "Brief content description",
    "locationPositions": [1]
  },
  {
    "position": 2,
    "description": "Factually correct clue about location 2's country",
    "content": "Brief content description", 
    "locationPositions": [2]
  },
  {
    "position": 3,
    "description": "Factually correct clue about location 3's country",
    "content": "Brief content description",
    "locationPositions": [3]
  }
]

CRITICAL: Each position (1, 2, 3) must appear exactly once and clues must be factually accurate.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a geography expert generating factually accurate country clues. Return only valid JSON with verified facts.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1
  });

  let content = response.choices[0].message.content;
  
  // Remove markdown code blocks if present
  if (content.includes('```json')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  
  const result = JSON.parse(content.trim());
  
  // Validate the result
  if (!Array.isArray(result) || result.length !== 3) {
    throw new Error(`Invalid response format: expected array of 3 items, got ${result.length}`);
  }

  for (const item of result) {
    if (!item.position || !item.description || !item.content || !Array.isArray(item.locationPositions) || item.locationPositions.length !== 1) {
      throw new Error(`Invalid clue format: ${JSON.stringify(item)}`);
    }
  }

  return result;
}

// Run the script
if (require.main === module) {
  fixTurn5CluesContent().catch(console.error);
}

module.exports = { fixTurn5CluesContent };