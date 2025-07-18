#!/usr/bin/env node

/**
 * Fix Turn 5 Country Clues - Proper Version
 * 
 * This script generates factually accurate country clues that don't give away
 * the country names or contain obvious giveaways.
 * 
 * The script:
 * 1. Finds all games with Turn 5 clues
 * 2. Uses OpenAI to generate subtle, accurate country clues
 * 3. Ensures clues are educational but not obvious
 * 4. Updates the database with proper mystery clues
 */

const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
require('dotenv').config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fixTurn5CluesProper() {
  console.log('🔍 Starting Turn 5 proper country clue generation...\n');

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
        // Generate proper mystery clues
        const newClues = await generateProperCountryClues(game.locationsV2, turn5.clues);

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

        console.log(`   ✅ Fixed ${newClues.length} clues with proper mystery content`);
        console.log(`   📍 Distribution: ${newClues.map(c => `Pos ${c.locationPositions[0]}`).join(', ')}`);
        console.log(`   📝 New clues: ${newClues.map(c => c.description.substring(0, 60) + '...').join(' | ')}\n`);
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

async function generateProperCountryClues(locations, existingClues) {
  const prompt = `You are generating mysterious country clues for Turn 5 of a geography detective game. These clues should be factually accurate but NOT give away the country names.

LOCATIONS:
${locations.map(loc => `Position ${loc.position}: ${loc.name}, ${loc.country}`).join('\n')}

TASK: Generate exactly 3 mysterious country clues - one for each location's country.

CRITICAL MYSTERY REQUIREMENTS:
🚨 DO NOT mention country names or obvious identifiers
🚨 DO NOT mention famous landmarks that immediately give away the country
🚨 DO NOT use currency names that contain country names
🚨 Use subtle, educational clues that require geographic knowledge

GOOD MYSTERY CLUE EXAMPLES:
- "This nation's currency features colorful banknotes with local wildlife"
- "This country spans multiple time zones from east to west"
- "The national language uses a unique writing system with characters"
- "This nation is famous for its ancient trading routes"
- "This country's flag features geometric patterns in primary colors"
- "This nation is known for its distinctive architectural style"

BAD EXAMPLES (TOO OBVIOUS):
- "This country uses the South African Rand currency" ❌
- "This country is famous for Mount Fuji" ❌
- "This country uses the Japanese Yen" ❌
- "This nation is home to the Eiffel Tower" ❌

COUNTRY-SPECIFIC GUIDELINES:
- South Africa: Focus on regional features, wildlife, or general African context
- Japan: Focus on island geography, technology, or cultural elements without naming landmarks
- China: Focus on vast size, population, or ancient history without specific names
- European countries: Focus on continental location, historical periods, or cultural elements

CLUE TYPES TO USE:
- Geographic features (without names): "mountainous regions", "coastal areas", "vast plains"
- Cultural elements: "ancient traditions", "distinctive cuisine", "unique festivals"
- General descriptions: "this island nation", "this landlocked country", "this tropical region"
- Historical periods: "ancient civilizations", "colonial history", "recent independence"

Return a JSON array with this exact format:
[
  {
    "position": 1,
    "description": "Mysterious clue about location 1's country without naming it",
    "content": "Brief content description",
    "locationPositions": [1]
  },
  {
    "position": 2,
    "description": "Mysterious clue about location 2's country without naming it",
    "content": "Brief content description", 
    "locationPositions": [2]
  },
  {
    "position": 3,
    "description": "Mysterious clue about location 3's country without naming it",
    "content": "Brief content description",
    "locationPositions": [3]
  }
]

CRITICAL: Each clue must be educational, factually accurate, but mysterious enough to not immediately reveal the country.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a geography expert creating mysterious but accurate country clues. Be subtle and educational without giving away obvious answers.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3
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
  fixTurn5CluesProper().catch(console.error);
}

module.exports = { fixTurn5CluesProper };