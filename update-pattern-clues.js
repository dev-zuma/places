// Script to update existing games with enhanced pattern recognition clues
// Updates Turn 1 clues to use 2 emojis with descriptive terms

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function updatePatternClues() {
  try {
    console.log('Starting pattern clue update process...\n');
    
    // Get all published games
    const games = await prisma.gameV2.findMany({
      where: { isPublished: true },
      include: {
        locationsV2: {
          orderBy: { position: 'asc' }
        },
        gameplayTurns: {
          where: { turn: 1 },
          include: {
            clues: {
              where: { type: 'pattern_recognition' },
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${games.length} published games to update.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const game of games) {
      console.log(`\nProcessing game: ${game.caseTitle} (${game.id})`);
      console.log(`Theme: ${game.theme}`);
      console.log(`Locations: ${game.locationsV2.map(l => l.name).join(', ')}`);
      
      const turn1 = game.gameplayTurns[0];
      if (!turn1 || !turn1.clues || turn1.clues.length === 0) {
        console.log('❌ No Turn 1 clues found, skipping...');
        continue;
      }

      const patternClues = turn1.clues.filter(c => c.type === 'pattern_recognition');
      if (patternClues.length !== 3) {
        console.log(`❌ Expected 3 pattern clues, found ${patternClues.length}, skipping...`);
        continue;
      }

      try {
        // Generate new pattern clues using OpenAI
        const prompt = `You are enhancing pattern recognition clues for a geography detective game.

Current Game Information:
- Theme: ${game.theme}
- Category: ${game.category}
- Locations:
  1. ${game.locationsV2[0].name}, ${game.locationsV2[0].country} (landmarks: ${game.locationsV2[0].landmarks})
  2. ${game.locationsV2[1].name}, ${game.locationsV2[1].country} (landmarks: ${game.locationsV2[1].landmarks})
  3. ${game.locationsV2[2].name}, ${game.locationsV2[2].country} (landmarks: ${game.locationsV2[2].landmarks})

Current pattern clues:
${patternClues.map((c, i) => `Location ${i + 1}: ${c.content}`).join('\n')}

Task: Create NEW enhanced pattern clues following these EXACT requirements:
- Each pattern uses EXACTLY 2 emojis
- One emoji MUST be a specific local food, the other MUST be a unique cultural symbol
- Each emoji MUST have 1-2 word description after it
- Focus on lesser-known cultural symbols specific to that city
- Avoid generic symbols (🏢 for buildings, 🌊 for any coastal city)

Examples of good patterns:
- "🐉 Wawel Dragon 🥟 Pierogi" (Krakow)
- "🛺 Tuk-tuk 🍜 Tom Yum" (Bangkok)
- "⚪ White Tower 🥙 Gyros" (Thessaloniki)

Return response in JSON format:
{
  "location1": "[emoji] [description] [emoji] [description]",
  "location2": "[emoji] [description] [emoji] [description]",
  "location3": "[emoji] [description] [emoji] [description]"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 500
        });

        const newPatterns = JSON.parse(response.choices[0].message.content);
        
        // Update each clue
        for (let i = 0; i < 3; i++) {
          const clue = patternClues[i];
          const newContent = newPatterns[`location${i + 1}`];
          
          console.log(`  Location ${i + 1}: ${game.locationsV2[i].name}`);
          console.log(`    Old: ${clue.content}`);
          console.log(`    New: ${newContent}`);
          
          await prisma.clue.update({
            where: { id: clue.id },
            data: { 
              content: newContent,
              description: `Enhanced pattern for ${game.locationsV2[i].name}` 
            }
          });
        }
        
        console.log('✅ Successfully updated pattern clues!');
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error updating game: ${error.message}`);
        errorCount++;
      }

      // Rate limiting - avoid hitting OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n\n========== Update Complete ==========`);
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`=====================================\n`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add command line argument handling
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg) : null;
const testMode = args.includes('--test');

async function main() {
  console.log('=== Pattern Clue Update Script ===\n');
  
  if (testMode) {
    console.log('🧪 TEST MODE - Updating only one recent game for testing\n');
    await updateSingleGameForTesting();
  } else {
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    
    if (limit) {
      console.log(`📊 LIMIT MODE - Processing only ${limit} games\n`);
    }
    
    await updatePatternClues();
  }
}

async function updateSingleGameForTesting() {
  try {
    // Get the most recent published game
    const game = await prisma.gameV2.findFirst({
      where: { isPublished: true },
      include: {
        locationsV2: {
          orderBy: { position: 'asc' }
        },
        gameplayTurns: {
          where: { turn: 1 },
          include: {
            clues: {
              where: { type: 'pattern_recognition' },
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!game) {
      console.log('No published games found!');
      return;
    }

    console.log(`Testing with game: ${game.caseTitle} (${game.id})`);
    console.log(`Theme: ${game.theme}`);
    console.log(`Locations: ${game.locationsV2.map(l => l.name).join(', ')}`);
    
    const turn1 = game.gameplayTurns[0];
    const patternClues = turn1?.clues.filter(c => c.type === 'pattern_recognition') || [];
    
    console.log('\nCurrent pattern clues:');
    patternClues.forEach((c, i) => {
      console.log(`  Location ${i + 1}: ${c.content}`);
    });

    // Generate new patterns
    const prompt = `You are enhancing pattern recognition clues for a geography detective game.

Current Game Information:
- Theme: ${game.theme}
- Category: ${game.category}
- Locations:
  1. ${game.locationsV2[0].name}, ${game.locationsV2[0].country} (landmarks: ${game.locationsV2[0].landmarks})
  2. ${game.locationsV2[1].name}, ${game.locationsV2[1].country} (landmarks: ${game.locationsV2[1].landmarks})
  3. ${game.locationsV2[2].name}, ${game.locationsV2[2].country} (landmarks: ${game.locationsV2[2].landmarks})

Task: Create NEW enhanced pattern clues following these EXACT requirements:
- Each pattern uses EXACTLY 2 emojis
- One emoji MUST be a specific local food, the other MUST be a unique cultural symbol
- Each emoji MUST have 1-2 word description after it
- Focus on lesser-known cultural symbols specific to that city
- Avoid generic symbols (🏢 for buildings, 🌊 for any coastal city)

Examples of good patterns:
- "🐉 Wawel Dragon 🥟 Pierogi" (Krakow)
- "🛺 Tuk-tuk 🍜 Tom Yum" (Bangkok)
- "⚪ White Tower 🥙 Gyros" (Thessaloniki)

Return response in JSON format:
{
  "location1": "[emoji] [description] [emoji] [description]",
  "location2": "[emoji] [description] [emoji] [description]",
  "location3": "[emoji] [description] [emoji] [description]"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 500
    });

    const newPatterns = JSON.parse(response.choices[0].message.content);
    
    console.log('\nGenerated new patterns:');
    console.log(`  Location 1 (${game.locationsV2[0].name}): ${newPatterns.location1}`);
    console.log(`  Location 2 (${game.locationsV2[1].name}): ${newPatterns.location2}`);
    console.log(`  Location 3 (${game.locationsV2[2].name}): ${newPatterns.location3}`);
    
    // Actually update in database
    for (let i = 0; i < 3; i++) {
      const clue = patternClues[i];
      const newContent = newPatterns[`location${i + 1}`];
      
      await prisma.clue.update({
        where: { id: clue.id },
        data: { 
          content: newContent,
          description: `Enhanced pattern for ${game.locationsV2[i].name}` 
        }
      });
    }
    
    console.log('\n✅ Test update successful! Check the game in the browser to verify.');
    console.log(`   URL: http://localhost:9091/game/detective.html?gameId=${game.id}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Update the main function to respect limit
async function updatePatternClues() {
  try {
    console.log('Starting pattern clue update process...\n');
    
    // Get games with optional limit
    const queryOptions = {
      where: { isPublished: true },
      include: {
        locationsV2: {
          orderBy: { position: 'asc' }
        },
        gameplayTurns: {
          where: { turn: 1 },
          include: {
            clues: {
              where: { type: 'pattern_recognition' },
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    };
    
    if (limit) {
      queryOptions.take = limit;
    }
    
    const games = await prisma.gameV2.findMany(queryOptions);

    console.log(`Found ${games.length} published games to update.\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const game of games) {
      console.log(`\nProcessing game: ${game.caseTitle} (${game.id})`);
      console.log(`Theme: ${game.theme}`);
      console.log(`Locations: ${game.locationsV2.map(l => l.name).join(', ')}`);
      
      const turn1 = game.gameplayTurns[0];
      if (!turn1 || !turn1.clues || turn1.clues.length === 0) {
        console.log('❌ No Turn 1 clues found, skipping...');
        continue;
      }

      const patternClues = turn1.clues.filter(c => c.type === 'pattern_recognition');
      if (patternClues.length !== 3) {
        console.log(`❌ Expected 3 pattern clues, found ${patternClues.length}, skipping...`);
        continue;
      }

      try {
        // Generate new pattern clues using OpenAI (even in dry-run to show what would be generated)
        const prompt = `You are enhancing pattern recognition clues for a geography detective game.

Current Game Information:
- Theme: ${game.theme}
- Category: ${game.category}
- Locations:
  1. ${game.locationsV2[0].name}, ${game.locationsV2[0].country} (landmarks: ${game.locationsV2[0].landmarks})
  2. ${game.locationsV2[1].name}, ${game.locationsV2[1].country} (landmarks: ${game.locationsV2[1].landmarks})
  3. ${game.locationsV2[2].name}, ${game.locationsV2[2].country} (landmarks: ${game.locationsV2[2].landmarks})

Current pattern clues:
${patternClues.map((c, i) => `Location ${i + 1}: ${c.content}`).join('\n')}

Task: Create NEW enhanced pattern clues following these EXACT requirements:
- Each pattern uses EXACTLY 2 emojis
- One emoji MUST be a specific local food, the other MUST be a unique cultural symbol
- Each emoji MUST have 1-2 word description after it
- Focus on lesser-known cultural symbols specific to that city
- Avoid generic symbols (🏢 for buildings, 🌊 for any coastal city)

Examples of good patterns:
- "🐉 Wawel Dragon 🥟 Pierogi" (Krakow)
- "🛺 Tuk-tuk 🍜 Tom Yum" (Bangkok)
- "⚪ White Tower 🥙 Gyros" (Thessaloniki)

Return response in JSON format:
{
  "location1": "[emoji] [description] [emoji] [description]",
  "location2": "[emoji] [description] [emoji] [description]",
  "location3": "[emoji] [description] [emoji] [description]"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 500
        });

        const newPatterns = JSON.parse(response.choices[0].message.content);
        
        // Show the changes that would be made
        console.log('\n  Current pattern clues:');
        for (let i = 0; i < 3; i++) {
          const clue = patternClues[i];
          console.log(`    Location ${i + 1} (${game.locationsV2[i].name}): ${clue.content}`);
        }
        
        console.log('\n  NEW pattern clues that would be generated:');
        for (let i = 0; i < 3; i++) {
          const newContent = newPatterns[`location${i + 1}`];
          console.log(`    Location ${i + 1} (${game.locationsV2[i].name}): ${newContent}`);
        }
        
        if (dryRun) {
          console.log('\n  [DRY RUN] No changes made - showing preview only');
          successCount++;
          continue;
        }
        
        // Update each clue (only if not dry-run)
        for (let i = 0; i < 3; i++) {
          const clue = patternClues[i];
          const newContent = newPatterns[`location${i + 1}`];
          
          await prisma.clue.update({
            where: { id: clue.id },
            data: { 
              content: newContent,
              description: `Enhanced pattern for ${game.locationsV2[i].name}` 
            }
          });
        }
        
        console.log('\n✅ Successfully updated pattern clues!');
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing game: ${error.message}`);
        errorCount++;
      }

      // Rate limiting - avoid hitting OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n\n========== Update Complete ==========`);
    console.log(`Total games processed: ${games.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`=====================================\n`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();