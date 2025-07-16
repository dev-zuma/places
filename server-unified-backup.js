require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const OpenAI = require('openai');

const app = express();
const prisma = new PrismaClient();

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 9091;
const productionDomain = process.env.PRODUCTION_DOMAIN || 'https://worldwidechase.onrender.com';

// Initialize OpenAI client with error handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI client initialization failed:', error.message);
}

// Initialize S3 client with error handling
let s3Client = null;
try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
} catch (error) {
  console.warn('S3 client initialization failed:', error.message);
}

// Middleware
const corsOptions = {
  origin: isProduction 
    ? [productionDomain, 'https://worldwidechase.onrender.com']
    : ['http://localhost:9091', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Serve static files from multiple directories
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/game', express.static(path.join(__dirname, 'game')));
app.use('/history', express.static(path.join(__dirname, 'history')));
app.use('/result', express.static(path.join(__dirname, 'result')));
app.use('/mockups', express.static(path.join(__dirname, 'mockups')));

// Serve test files from root
app.get('/villain-style-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'villain-style-test.html'));
});

app.get('/test-villain-styles.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-villain-styles.html'));
});

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root redirect - go to game gallery
app.get('/', (req, res) => {
  res.redirect('/game/');
});

// API: Google Client ID configuration
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});








// OpenAI-powered game generation
async function generateGameAsync(gameId, context) {
  try {
    console.log(`🎮 GENERATION START | Game: ${gameId}`);

    // Generate game content first
    const gameContent = await generateGameContent(context);
    console.log(`📋 Game content: ${gameContent.caseTitle} | Theme: ${gameContent.theme}`);
    
    // Update game record with generated content
    const game = await prisma.game.update({
      where: { id: gameId },
      data: {
        theme: gameContent.theme,
        phrase: gameContent.phrase,
        category: gameContent.category || 'Geography',
        difficulty: gameContent.difficulty,
        // Crime wrapper fields
        villainName: gameContent.villainName,
        villainTitle: gameContent.villainTitle,
        caseTitle: gameContent.caseTitle,
        crimeSummary: gameContent.crimeSummary,
        villainImageUrl: gameContent.villainImageUrl,
        turn4Clue: gameContent.turn4Clue,
        interestingFact: gameContent.interestingFact,
      },
    });
    
    // Update generation record
    await prisma.generation.updateMany({
      where: { gameId },
      data: {
        status: 'generating',
        currentStep: 'crime_wrapper',
        totalSteps: 15,
        completedSteps: 1,
      },
    });

    // Generate villain portrait
    console.log(`👤 Generating villain: ${gameContent.villainName}`);
    await prisma.generation.updateMany({
      where: { gameId },
      data: { currentStep: 'villain_portrait' },
    });
    
    const villainPortrait = await generateVillainPortrait(
      gameContent.villainName,
      gameContent.villainTitle,
      gameContent.theme,
      {
        villainClothingDescription: gameContent.villainClothingDescription,
        villainAge: gameContent.villainAge,
        villainGender: gameContent.villainGender,
        villainEthnicity: gameContent.villainEthnicity,
        villainDistinctiveFeature: gameContent.villainDistinctiveFeature
      }
    );
    
    // Upload villain portrait to S3
    const s3VillainUrl = await uploadImageToS3(
      villainPortrait.url,
      game.id,
      'villain',
      'portrait'
    );
    
    // Update game with villain portrait URL
    await prisma.game.update({
      where: { id: game.id },
      data: { villainImageUrl: s3VillainUrl },
    });
    
    await prisma.generation.updateMany({
      where: { gameId },
      data: { completedSteps: 2 },
    });

    // Create location records first
    const locationRecords = await Promise.all(
      gameContent.locations.map(location => 
        prisma.location.create({
          data: {
            gameId: game.id,
            position: location.position,
            name: location.name,
            country: location.country,
            latitude: location.latitude,
            longitude: location.longitude,
            timezoneOffset: location.timezoneOffset,
            timezoneName: location.timezoneName,
            landmarks: JSON.stringify(location.landmarks),
          },
        })
      )
    );

    // Generate all images in parallel using 3 concurrent threads (one per location)
    console.log('🚀 Starting parallel image generation for all locations...');
    await generateAllLocationImagesParallel(gameId, gameContent, locationRecords, game.id);

    // Complete generation
    await prisma.generation.updateMany({
      where: { gameId },
      data: {
        status: 'completed',
        completedSteps: 15,
        currentStep: 'completed'
      },
    });

    console.log(`✅ GENERATION COMPLETE | ${gameId} | ${gameContent.caseTitle}`);
  } catch (error) {
    console.error('Error generating game:', error);
    await prisma.generation.updateMany({
      where: { gameId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });
  }
}

// Parallel image generation function
async function generateAllLocationImagesParallel(gameId, gameContent, locationRecords, dbGameId) {
  try {
    // Create parallel tasks for each location (3 concurrent threads)
    const locationTasks = gameContent.locations.map(async (location, index) => {
      const locationRecord = locationRecords[index];
      const results = [];
      
      console.log(`🎨 Thread ${location.position}: Starting ${location.name}`);
      
      // Generate all 3 images for this location in sequence (within this thread)
      for (const turn of [1, 3, 5]) {
        try {
          // Update generation step
          await prisma.generation.updateMany({
            where: { gameId },
            data: { currentStep: `image_${location.position}_${turn}` },
          });

          // Generate image
          const imageData = await generateLocationImage(location, gameContent.theme, turn, gameContent.difficulty);
          
          // Upload to S3
          const s3Url = await uploadImageToS3(
            imageData.url,
            dbGameId,
            location.position,
            turn
          );

          // Store result for batch update
          const imageField = turn === 1 ? 'image1Url' : turn === 3 ? 'image2Url' : 'image3Url';
          results.push({ turn, imageField, s3Url });

          // Update progress
          const completed = 2 + ((location.position - 1) * 3) + (turn === 1 ? 1 : turn === 3 ? 2 : 3);
          await prisma.generation.updateMany({
            where: { gameId },
            data: { completedSteps: completed },
          });

        } catch (error) {
          console.error(`❌ Error generating image for ${location.name} turn ${turn}:`, error);
          throw error;
        }
      }

      // Batch update all images for this location
      const updateData = {};
      results.forEach(result => {
        updateData[result.imageField] = result.s3Url;
      });

      await prisma.location.update({
        where: { id: locationRecord.id },
        data: updateData,
      });

      console.log(`✅ Thread ${location.position}: Completed ${location.name}`);
      return results;
    });

    // Execute all location tasks in parallel
    await Promise.all(locationTasks);
    console.log('🏁 All location images generated successfully');
    
  } catch (error) {
    console.error('❌ Parallel image generation failed:', error);
    throw error;
  }
}

async function generateGameContent(context) {
  // Use OpenAI to generate game content if API key is available
  if (openai && process.env.OPENAI_API_KEY) {
    try {
      console.log('🎯 Generating game content with OpenAI...');
      
      // Build the prompt based on user input
      let prompt = `Generate a geography-based detective game where players track a villain across 3 connected locations.

User Input:`;
      
      if (context.userInput) {
        prompt += `\nTheme/Description: ${context.userInput}`;
      }
      
      if (context.specificLocations) {
        prompt += `\nSpecific Locations Requested: ${context.specificLocations}`;
      }
      
      if (!context.userInput && !context.specificLocations) {
        prompt += `\nNo specific input - please choose an interesting theme and 3 diverse locations.`;
      }
      
      prompt += `\nDifficulty: ${context.difficulty === 'auto' ? 'Choose appropriate difficulty based on locations' : context.difficulty}`;
      
      prompt += `

CRITICAL: The theme "${context.userInput || 'general'}" should directly influence:
1. Location selection - choose either ALL 3 CITIES or ALL 3 COUNTRIES (never mix and match)
2. Villain character - make them thematically appropriate 
3. Crime story - relate the crime to the theme
4. Educational fact - explain the theme connection

LOCATION SELECTION RULES:
- Pick EITHER all 3 cities OR all 3 countries (never mix)
- ONLY use cities or countries - DO NOT use counties, parks, rivers, states, provinces, regions, landmarks, or other geographic entities
- Cities must be major cities that are well-known internationally (e.g., London, Tokyo, New York)
- Countries must be sovereign nations (e.g., France, Japan, Brazil)
- The "landmarks" field should contain famous landmarks/attractions WITHIN each city/country, not separate locations

For example:
- "space exploration" → Houston, Cape Canaveral, Baikonur (ALL CITIES - space centers)
- "jazz music" → New Orleans, Chicago, Kansas City (ALL CITIES - jazz history)
- "ancient civilizations" → Egypt, Greece, Peru (ALL COUNTRIES - ancient sites)
- "coastal cities" → Barcelona, Sydney, Rio (ALL CITIES - coastal locations)

Requirements:
1. Create a kid-friendly villain with a playful name and title that relates to the theme
2. Choose a gender (male or female) that fits naturally with the villain name you create
3. Write a crime story that connects the 3 locations WITHOUT revealing their names but hints at the thematic connection
4. All content must be appropriate for ages 10+ (elementary school and up)
   - Use clear, simple language that 10-year-olds can understand
   - Avoid complex vocabulary or concepts that require advanced education
   - Keep crime stories lighthearted and non-violent (theft, mischief, puzzles)
   - No mentions of weapons, violence, or scary themes
   - Focus on adventure, mystery, and learning
5. Locations must be either ALL cities OR ALL countries that genuinely relate to the theme
6. Include accurate timezone and coordinate data
7. Create an educational interesting fact that explains the thematic connection between all locations
8. Generate unique physical characteristics for the villain to create visual variety

Return ONLY valid JSON in this exact format:
{
  "theme": "THEME (1-3 words maximum)",
  "phrase": "Short descriptive phrase",
  "category": "Geography",
  "difficulty": "easy/medium/hard",
  "villainName": "Fun villain name",
  "villainTitle": "The [Title]",
  "caseTitle": "Catchy case title (max 6 words)",
  "crimeSummary": "Kid-friendly crime story (3-4 sentences) using simple language appropriate for ages 10+. Describe the villain's lighthearted mischief and adventures while hinting at cultural, geographical, or historical characteristics of the locations WITHOUT revealing their names. Focus on puzzles, treasure hunts, or harmless pranks rather than serious crimes. Include fun details and subtle clues about the types of places involved",
  "turn4Clue": "CLUE (1-2 words that help identify the connection)",
  "interestingFact": "Educational fact connecting all 3 locations",
  "villainClothingDescription": "Detailed description of villain's outfit with subtle hints related to 1 or more locations",
  "villainAge": "Age range (e.g., mid-40s, early 30s, late 50s)",
  "villainGender": "male or female",
  "villainEthnicity": "Ethnic background (e.g., Mediterranean, South American, half Japanese half African)",
  "villainDistinctiveFeature": "Unique physical trait (e.g., beauty spot on right cheek, piercing blue eyes, silver-streaked hair)",
  "locations": [
    {
      "position": 1,
      "name": "CITY_NAME or COUNTRY_NAME",
      "country": "Country Name (if location is a city) or same as name (if location is a country)",
      "latitude": 0.0,
      "longitude": 0.0,
      "timezoneOffset": 0,
      "timezoneName": "TZ",
      "landmarks": ["Famous landmark/attraction within this location", "Another landmark", "Third landmark"]
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a creative game designer specializing in educational geography games for children ages 10+. Use simple, clear language appropriate for elementary school students. Create lighthearted, non-violent adventure stories focused on learning and fun. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const gameData = JSON.parse(response.choices[0].message.content);
      
      // Ensure villain image URL is null (will be generated separately)
      gameData.villainImageUrl = null;
      
      return gameData;
      
    } catch (error) {
      console.error('OpenAI generation failed:', error);
      throw new Error('OpenAI game generation failed: ' + error.message);
    }
  }
  
  throw new Error('OpenAI is not configured. Please check your API key settings.');
}

// =============================================================================
// GEOGRAPHIC CALCULATION HELPERS
// =============================================================================

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance); // Return rounded to nearest km
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function kilometersToMiles(km) {
  return Math.round(km * 0.621371);
}

// Calculate all distances between locations
function calculateLocationDistances(locations) {
  const distances = [];
  
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];
      
      const distanceKm = calculateDistance(
        loc1.latitude, loc1.longitude,
        loc2.latitude, loc2.longitude
      );
      
      distances.push({
        between: [loc1.position, loc2.position],
        kilometers: distanceKm,
        miles: kilometersToMiles(distanceKm)
      });
    }
  }
  
  return distances;
}

// Calculate time differences between locations
function calculateTimeDifferences(locations) {
  const timeDiffs = [];
  
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];
      
      // Time difference is loc2 offset - loc1 offset
      const hoursDiff = loc2.timezoneOffset - loc1.timezoneOffset;
      
      timeDiffs.push({
        between: [loc1.position, loc2.position],
        hours: hoursDiff
      });
    }
  }
  
  return timeDiffs;
}

// =============================================================================
// V2 GAME GENERATION FUNCTIONS (3+1 FORMAT)
// =============================================================================

async function generateGameV2Async(gameId, context) {
  try {
    console.log(`🎯 Starting V2 game generation | ${gameId} | ${context.userInput || 'auto-theme'}`);
    
    // Phase 1: Generate core game content
    console.log('📝 Phase 1: Generating core game content...');
    const phase1Start = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { 
        phase1StartTime: phase1Start,
        currentStep: 'generating_content'
      }
    });
    await updateGenerationProgress(gameId, 'generating_content', 1);
    
    const gameContent = await generateGameContentV2(context);
    
    // Pre-determine specific items for villain elements to ensure coordination
    gameContent.imageStrategy.placements.forEach(placement => {
      if (placement.specificItem === "DETERMINE_FROM_VILLAIN_AND_THEME") {
        placement.specificItem = getSpecificVillainElement(placement, gameContent);
      }
    });
    
    // Update game with generated content
    await prisma.gameV2.update({
      where: { id: gameId },
      data: {
        theme: gameContent.theme,
        phrase: gameContent.phrase,
        difficulty: gameContent.difficulty,
        villainName: gameContent.villainProfile.name,
        villainTitle: gameContent.villainProfile.title,
        villainGender: gameContent.villainProfile.gender,
        villainAge: gameContent.villainProfile.age,
        villainEthnicity: gameContent.villainProfile.ethnicity,
        villainDistinctiveFeature: gameContent.villainProfile.distinctiveFeature,
        villainClothingDescription: gameContent.villainProfile.clothingDescription,
        caseTitle: gameContent.caseDetails.title,
        crimeSummary: gameContent.caseDetails.summary,
        interestingFact: gameContent.caseDetails.interestingFact,
        finalLocationObjective: gameContent.finalLocation.objective,
        finalLocationNarrative: gameContent.finalLocation.narrative,
        finalInterestingFact: gameContent.caseDetails.finalInterestingFact,
        gameCompletionMessage: gameContent.caseDetails.gameCompletionMessage
      }
    });
    
    const phase1End = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { phase1EndTime: phase1End }
    });
    await updateGenerationProgress(gameId, 'content_generated', 3);
    
    // Phase 2: Create locations
    console.log('🌍 Phase 2: Creating location records...');
    const phase2Start = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { 
        phase2StartTime: phase2Start,
        currentStep: 'creating_locations'
      }
    });
    
    const locationRecords = await Promise.all(
      gameContent.locations.map(async (location, index) => {
        const imageStrategy = gameContent.imageStrategy.placements.find(p => p.location === location.position);
        
        // Ensure timezone offset is a number
        let timezoneOffset = location.timezoneOffset;
        if (typeof timezoneOffset === 'string') {
          // Parse string like "+10.0" or "-5" to number
          timezoneOffset = parseFloat(timezoneOffset.replace(/[^-+0-9.]/g, ''));
        }
        
        return prisma.locationV2.create({
          data: {
            gameV2Id: gameId,
            position: location.position,
            name: location.name,
            country: location.country,
            latitude: parseFloat(location.latitude) || 0.0,
            longitude: parseFloat(location.longitude) || 0.0,
            timezoneOffset: timezoneOffset,
            timezoneName: location.timezoneName,
            landmarks: JSON.stringify(location.landmarks),
            additionalData: JSON.stringify(location.additionalData || {}),
            hasImage: !!imageStrategy,
            imageTurn: imageStrategy?.turn || null,
            imageLevel: imageStrategy?.level || null,
            villainElement: imageStrategy?.villainElement || null
          }
        });
      })
    );
    
    // Create final location
    await prisma.finalLocationV2.create({
      data: {
        gameV2Id: gameId,
        name: gameContent.finalLocation.location.name,
        country: gameContent.finalLocation.location.country,
        latitude: parseFloat(gameContent.finalLocation.location.latitude) || 0.0,
        longitude: parseFloat(gameContent.finalLocation.location.longitude) || 0.0,
        reason: gameContent.finalLocation.location.reason,
        clueConnections: JSON.stringify(gameContent.finalLocation.location.connections)
      }
    });
    
    const phase2End = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { phase2EndTime: phase2End }
    });
    await updateGenerationProgress(gameId, 'locations_created', 5);
    
    // Phase 3: Generate turn-by-turn clues
    console.log('🎮 Phase 3: Generating turn-by-turn clues...');
    const phase3Start = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { 
        phase3StartTime: phase3Start,
        currentStep: 'generating_turn_clues'
      }
    });
    
    // Calculate real distances and time differences
    const calculatedDistances = calculateLocationDistances(gameContent.locations);
    const calculatedTimeDiffs = calculateTimeDifferences(gameContent.locations);
    
    console.log('📏 Calculated distances:', calculatedDistances);
    console.log('⏰ Calculated time differences:', calculatedTimeDiffs);
    
    const turnClues = await generateTurnCluesV2(gameContent, calculatedDistances, calculatedTimeDiffs);
    
    // Create gameplay turns and clues
    for (const turnData of turnClues.turns) {
      const gameplayTurn = await prisma.gameplayTurn.create({
        data: {
          gameV2Id: gameId,
          turn: turnData.turn,
          narrative: turnData.narrative,
          isFinalLocation: turnData.turn > 5
        }
      });
      
      // Create clues for this turn
      for (let i = 0; i < turnData.clues.length; i++) {
        const clue = turnData.clues[i];
        await prisma.clue.create({
          data: {
            gameplayTurnId: gameplayTurn.id,
            orderIndex: i,
            type: clue.type,
            content: clue.content || null,
            description: clue.description || null,
            data: JSON.stringify(clue.data || {}),
            locationPositions: clue.locationPositions ? JSON.stringify(clue.locationPositions) : null
          }
        });
      }
    }
    
    const phase3End = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { phase3EndTime: phase3End }
    });
    await updateGenerationProgress(gameId, 'turns_generated', 10);
    
    // Phase 4: Generate images (villain portrait + location images)
    console.log('🎨 Phase 4: Generating images...');
    const phase4Start = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { 
        phase4StartTime: phase4Start,
        currentStep: 'generating_villain_portrait'
      }
    });
    
    // Phase 4a: Generate villain portrait
    console.log('🎭 Phase 4a: Generating villain portrait...');
    const villainImageStart = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { 
        villainImageStartTime: villainImageStart,
        currentStep: 'generating_villain_portrait'
      }
    });
    
    const villainPortrait = await generateVillainPortraitV2(gameContent);
    
    // Upload villain portrait to S3
    const s3VillainUrl = await uploadImageToS3(
      villainPortrait.url,
      gameId,
      'villain',
      'portrait'
    );
    
    // Update game with villain portrait URL
    await prisma.gameV2.update({
      where: { id: gameId },
      data: { villainImageUrl: s3VillainUrl }
    });
    
    const villainImageEnd = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { villainImageEndTime: villainImageEnd }
    });
    await updateGenerationProgress(gameId, 'villain_generated', 12);
    
    // Phase 4b-4d: Generate location images individually
    await generateLocationImagesV2Individual(gameId, gameContent, locationRecords);
    
    const phase4End = new Date();
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: { phase4EndTime: phase4End }
    });
    await updateGenerationProgress(gameId, 'images_generated', 18);
    
    // Complete generation
    await updateGenerationProgress(gameId, 'completed', 20);
    
    console.log(`✅ V2 GENERATION COMPLETE | ${gameId} | ${gameContent.caseDetails.title}`);
    
  } catch (error) {
    console.error('V2 generation error:', error);
    await prisma.generationV2.updateMany({
      where: { gameV2Id: gameId },
      data: {
        status: 'failed',
        error: error.message
      }
    });
  }
}

// Get most used cities from existing games to encourage diversity
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
    
    const mostUsedCities = cityUsage.map(city => city.name);
    console.log(`📊 Most used cities: ${mostUsedCities.slice(0, 10).join(', ')}...`);
    return mostUsedCities;
  } catch (error) {
    console.error('Error getting most used cities:', error);
    return [];
  }
}

async function generateGameContentV2(context) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('🎯 Generating V2 game content with OpenAI...');
    
    // Get most used cities for diversity guidance
    const mostUsedCities = await getMostUsedCities(20);
    
    const prompt = `Generate a REALISTIC, MODERN-DAY geography-based detective game using the new 3+1 format where players track a villain across 3 connected locations, then use those to deduce a 4th final location.

User Input:
${context.userInput ? `Theme/Description: ${context.userInput}` : 'No specific input - choose an interesting theme'}
${context.specificLocations ? `Specific Locations: ${context.specificLocations}` : ''}
Difficulty: ${context.difficulty || 'medium'}
Final Objective: ${context.finalObjective || 'WHERE_STASHED'}

CITY DIVERSITY GUIDANCE:
${mostUsedCities.length > 0 ? 
  `The following cities have been used most frequently in recent games, so please prioritize using DIFFERENT cities to provide players with diverse geography experiences: ${mostUsedCities.join(', ')}. 
  
Try to choose cities that are NOT in this list, while still meeting the difficulty requirements. This helps ensure players learn about a wider variety of locations around the world.` : 
  'No prior city usage data available - choose diverse cities from different continents.'}

GAME STRUCTURE:
- Turns 1-5: Players identify 3 crime scene locations
- Turns 6-7: Players deduce the 4th "final" location

CRITICAL LOCATION RULES:
- ONLY use cities (never countries, states, regions, or other geographic entities)
- ALL 4 locations (including final location) must be major cities
- The 4th location should connect thematically/narratively (NOT geographically equidistant)

LOCATION DIFFICULTY REQUIREMENTS:
- EASY: All 3 locations must be well-known capital cities or major international cities (London, Paris, NYC, Tokyo, Rome, Berlin, Madrid, etc.)
- MEDIUM: 2 locations are well-known major cities + 1 location is less well-known but still an important city
- HARD: 1 location is well-known major city + 2 locations are less well-known but still major cities
- Prioritize geographic diversity across different continents and regions when possible
- Balance recognizable landmarks with educational discovery opportunities
- Examples: Easy = London + Paris + Tokyo; Medium = Berlin + Singapore + Krakow; Hard = Madrid + Almaty + Montevideo
- Encourage learning about different cultures, climate zones, and geographic features

GEOGRAPHIC ACCURACY REQUIREMENTS:
- Provide REAL latitude/longitude coordinates for all locations (decimal degrees format as NUMBERS)
- Use ACTUAL timezone offsets (UTC+/-) for each location based on real world data (as NUMBERS)
- Coordinates must be accurate to the actual location names you choose
- Verify timezone offsets match the real timezone for each location
- Example: London = 51.5074, -0.1278, timezoneOffset: 0; Tokyo = 35.6762, 139.6503, timezoneOffset: 9
- CRITICAL: All latitude, longitude, and timezoneOffset values must be NUMBERS, not strings
- timezoneOffset examples: 0 (UTC), -5 (EST), 9 (JST), 10 (AEST) - NO plus signs or quotes
- Double-check that your coordinates and timezones are geographically correct

REALISTIC MODERN-DAY REQUIREMENTS:
- ALL stories must be set in present-day Earth (2024)
- NO sci-fi, fantasy, space, futuristic, or supernatural elements
- Villains are normal humans in realistic modern clothing
- Crimes involve real-world activities (art theft, treasure hunting, pranks, etc.)
- No space suits, alien technology, magical powers, or fictional gadgets
- Focus on actual geography, real landmarks, and genuine cultural connections

LANGUAGE REQUIREMENTS (AGES 10+):
- Use simple, clear language appropriate for elementary school students
- Avoid complex vocabulary or concepts requiring advanced education
- Keep crime stories lighthearted and non-violent (theft, mischief, puzzles, treasure hunts)
- No mentions of weapons, violence, or scary themes
- Focus on adventure, mystery, and learning
- Create fun, engaging villains that kids would enjoy, not fear

FINAL INTERESTING FACT REQUIREMENTS:
- Create a surprising "aha moment" that connects all 4 locations (including the final one)
- Go deeper than the basic theme - reveal a fascinating connection players wouldn't expect
- Make it educational and age-appropriate for elementary school students
- Examples: geological formations, historical events, cultural traditions, scientific discoveries
- Should make players say "Wow, I never knew that!" and feel smart for solving the case

FINAL LOCATION OBJECTIVES:
- WHERE_STASHED: Where villain hid stolen goods
- NEXT_TARGET: Where villain will strike next
- VILLAIN_HIDEOUT: Where villain is hiding
- EVIDENCE_SOURCE: Where key evidence originated
- VILLAIN_HOMETOWN: Where the villain is originally from
- ACCOMPLICE_LOCATION: Where the villain's partner/helper is located
- ESCAPE_ROUTE: Where the villain plans to flee/escape to
- TREASURE_DESTINATION: Where the villain plans to sell/deliver stolen items
- VILLAIN_INSPIRATION: Location that inspired the villain's crime spree
- FINAL_HEIST: The villain's ultimate target (biggest score)
- CRIME_ORIGIN: Where the villain first learned their criminal skills
- FAMILY_TIES: Where the villain's family/personal connections are
- RETIREMENT_PLAN: Where the villain plans to retire with their loot

IMAGE STRATEGY REQUIREMENTS:
- Use exactly 2 images placed in turns 2 and 3 ONLY
- First image MUST be in turn 2, second image MUST be in turn 3
- NO images in turns 1, 4, 5, 6, or 7
- villainElement can be: security_footage, belongings, reflection, shadow
- level can be: obscured, medium, clear
- specificItem should be "security camera footage" for security_footage, otherwise "DETERMINE_FROM_VILLAIN_AND_THEME"

Return a complete game structure in JSON format:

{
  "theme": "THEME (1-3 words)",
  "phrase": "Descriptive phrase",
  "difficulty": "easy/medium/hard",
  "villainProfile": {
    "name": "Full villain name with nickname",
    "title": "The [Title]",
    "gender": "male/female",
    "age": "age range",
    "ethnicity": "ethnic background",
    "distinctiveFeature": "unique physical trait",
    "clothingDescription": "detailed modern everyday clothing (jeans, t-shirt, jacket, sneakers, etc. - NO costumes, uniforms, or sci-fi outfits)"
  },
  "caseDetails": {
    "title": "Case title (max 6 words)",
    "summary": "Kid-friendly crime story (3-4 sentences) using simple language appropriate for ages 10+. Focus on puzzles, treasure hunts, or harmless pranks rather than serious crimes.",
    "interestingFact": "Educational fact about the 3 locations",
    "finalInterestingFact": "Ultimate 'aha moment' fact revealed after solving the entire case - a deeper, more surprising connection between all 4 locations (including the final one) that provides educational value and a satisfying conclusion",
    "gameCompletionMessage": "Congratulatory message that ties the villain's story to the geographic/thematic connections"
  },
  "locations": [
    {
      "position": 1,
      "name": "City/Country name",
      "country": "Country name (same as name if country-level game)",
      "latitude": -27.4698,
      "longitude": 153.0251,
      "timezoneOffset": 10,
      "timezoneName": "Australia/Brisbane",
      "landmarks": ["landmark1", "landmark2", "landmark3"],
      "additionalData": {}
    },
    {
      "position": 2,
      "name": "City/Country name",
      "country": "Country name",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "timezoneOffset": 0,
      "timezoneName": "Europe/London",
      "landmarks": ["landmark1", "landmark2", "landmark3"],
      "additionalData": {}
    },
    {
      "position": 3,
      "name": "City/Country name",
      "country": "Country name",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "timezoneOffset": 9,
      "timezoneName": "Asia/Tokyo",
      "landmarks": ["landmark1", "landmark2", "landmark3"],
      "additionalData": {}
    }
  ],
  "finalLocation": {
    "objective": "${context.finalObjective || 'WHERE_STASHED'}",
    "narrative": "What the player needs to find",
    "location": {
      "name": "City/Country name",
      "country": "Country name",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "reason": "Why this location makes sense",
      "connections": ["How it connects to crime pattern", "Thematic link", "Character motivation"]
    }
  },
  "imageStrategy": {
    "totalImages": 2,
    "placements": [
      {"turn": 2, "location": 1, "level": "obscured", "villainElement": "security_footage", "specificItem": "security camera footage"},
      {"turn": 3, "location": 2, "level": "medium", "villainElement": "belongings", "specificItem": "DETERMINE_FROM_VILLAIN_AND_THEME"}
    ]
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative game designer specializing in educational geography games for children ages 10+. Create REALISTIC, MODERN-DAY detective stories set in present-day Earth. CRITICAL: Provide ACCURATE latitude/longitude coordinates and timezone offsets for all locations - these must match real-world geographic data. NO sci-fi, fantasy, space, or supernatural elements. Use simple, clear language appropriate for elementary school students. Create lighthearted, non-violent adventure stories focused on learning and fun. Villains wear normal modern clothing and commit realistic crimes. Always return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const gameData = JSON.parse(response.choices[0].message.content);
    console.log('✅ V2 game content generated successfully');
    return gameData;
    
  } catch (error) {
    console.error('V2 OpenAI generation failed:', error);
    throw new Error('V2 OpenAI game generation failed: ' + error.message);
  }
}

async function generateTurnCluesV2(gameData, calculatedDistances, calculatedTimeDiffs) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('🎮 Generating turn-by-turn clues with OpenAI...');
    
    // Add calculated distances and time differences to the game data
    const enhancedGameData = {
      ...gameData,
      calculatedDistances,
      calculatedTimeDiffs
    };
    
    const prompt = `Generate turn-by-turn clues for this 3+1 detective game. Create engaging narratives and varied clue types.

Game Data:
${JSON.stringify(enhancedGameData, null, 2)}

REQUIREMENTS:
- Turn 1 MUST include: theme reveal + one clue about each country (currency, flag, geography, history, etc.)
- Turn 4 MUST include: ALL distance calculations between all 3 locations + ALL time differences between all 3 locations
- Turns 2-3 and 5 MUST NOT include any distance or timezone/time difference clues
- Turn 5 MUST focus exclusively on the 3 crime scene locations - NO hints about a 4th location
- Exactly 2 images in turns 2 and 3 ONLY (as specified in imageStrategy)
- Distribute clues strategically across turns
- Build suspense and difficulty appropriately
- Final 2 turns (6-7) focus on deducing the 4th location
- Use simple, clear language appropriate for ages 10+ (elementary school level)
- Keep narratives fun and engaging, avoid scary or violent themes
- Focus on adventure, mystery, and learning
- CRITICAL: NEVER mention specific location names in clues - use geographically specific but non-revealing terms
- Use specific geographic features instead of generic terms: "this Atlantic coastal city", "this Himalayan capital", "this port on the Baltic Sea"
- Include educational geographic details: ocean names, mountain ranges, rivers, climate zones, cultural regions
- Examples: "this city on the Ring of Fire", "this capital in the Sahel region", "this port where the Amazon meets the Atlantic"
- Clues should help players deduce locations without giving away the answers while teaching geography

CRITICAL LOCATION-SPECIFIC CLUE REQUIREMENTS:
- EACH NON-DISTANCE/NON-TIME CLUE MUST specify which location(s) it applies to using "locationPositions"
- locationPositions should be an array of position numbers (1, 2, or 3) that the clue helps identify
- Examples:
  * A clue about mountains might apply to locations [2, 3] if those locations are mountainous
  * A clue about a specific cultural event applies to location [1] if only location 1 has that event
  * A climate clue might apply to [1, 2] if those locations share similar climate
- Theme clues apply to ALL locations, so use locationPositions: [1, 2, 3]
- Image clues apply to the specific location where the image was taken
- Distance/time clues don't need locationPositions (they specify "between" instead)
- Make clues strategic - some should help narrow down to 1 location, others help eliminate possibilities
- Ensure each location gets helpful clues across the turns to make it identifiable

CRITICAL DISTANCE AND TIME REQUIREMENTS:
- USE THE PROVIDED calculatedDistances ARRAY - DO NOT CALCULATE YOUR OWN
- USE THE PROVIDED calculatedTimeDiffs ARRAY - DO NOT CALCULATE YOUR OWN
- The distances have been pre-calculated using the Haversine formula and are accurate
- The time differences have been pre-calculated from the timezone offsets
- For Turn 1 distance clues, use the exact values from calculatedDistances
- For Turn 1 time clues, use the exact values from calculatedTimeDiffs

EXAMPLE: If calculatedDistances contains:
  {"between": [1, 2], "kilometers": 11234, "miles": 6982}
Then your distance clue MUST use exactly these values:
  {"type": "distance", "content": "11,234 km / 6,982 miles", "data": {"between": [1, 2], "kilometers": 11234, "miles": 6982}}
- IMAGE CLUE DESCRIPTIONS MUST MATCH THE EXACT SPECIFIC ITEMS IN THE IMAGE STRATEGY:
  - security_footage: Describe seeing security camera footage with timestamp showing the villain in their clothing
  - belongings: Use the EXACT specificItem from the imageStrategy for this turn. DO NOT choose independently:
    * Look at imageStrategy.placements to find the placement for this turn
    * Use the specificItem field exactly as provided (e.g., "brown hoodie with cocoa bean design")
    * Your description must mention finding this EXACT item, not any other item
    * Example: If specificItem is "green t-shirt with tree logo", describe finding "a green t-shirt with a tree logo lying on the ground"
  - reflection: Describe seeing the villain's reflection in glass/water/mirror showing their clothing and appearance
  - shadow: Describe seeing the villain's distinctive shadow showing their silhouette
- CRITICAL: You must use the pre-determined specificItem from imageStrategy, not create your own item descriptions
- CRITICAL: For belongings clues, describe finding the EXACT item specified in imageStrategy.placements[].specificItem

CLUE DISTRIBUTION RULES:
- Turn 1 MUST have 4 clues: 1 theme + 3 country clues (one for each country the cities are in)
- Turn 4 MUST have 6 clues: 3 distance clues (for each location pair) + 3 time difference clues
- Turns 2-3 and 5: Distribute remaining clues (images, cultural, terrain, etc.) but NO distance/timezone clues
- Turn 6-7 clues based on difficulty:
  - Easy: 2 clues in both turns 6 and 7
  - Medium: 2 clues in turn 6, 1 clue in turn 7
  - Hard: 1 clue each in turns 6 and 7
- NO images in turns 1, 4, 5, 6, or 7

TURN 1 SPECIFIC REQUIREMENTS:
- MUST include theme clue
- MUST include 3 country clues: one clue about each country the cities are in
- Country clues can be about currency, flag features, geography, history, culture, language, or other well-known country facts
- Examples: "This country uses the Euro currency", "This nation's flag features a red maple leaf", "This country is famous for its fjords"
- DO NOT mention specific country names - use descriptive clues about the countries
- CRITICAL: When describing flags, use the EXACT country names from the location data to ensure accuracy

TURN 4 SPECIFIC REQUIREMENTS:
- MUST include 3 distance clues: Location 1↔2, Location 1↔3, Location 2↔3
- MUST include 3 time difference clues showing hours between each location pair
- NO other clues in Turn 4 - only distances and time differences

TURN STRUCTURE:
- Turn 1: Theme reveal + country clues (one for each country the cities are in) - NO images
- Turn 2: First image (as per imageStrategy) + other clues (NO distance/timezone)
- Turn 3: Second image (as per imageStrategy) + additional clues (NO distance/timezone)
- Turn 4: ALL distances between locations + ALL time differences (NO other clues, NO images)
- Turn 5: Final clues for the 3 crime scenes ONLY (NO 4th location hints, NO images)
- Turn 6: First clues about the 4th location - NO images
- Turn 7: Decisive clues for the final location - NO images

CLUE TYPES TO USE:
- theme, distance, timezone, time_difference, image (required)
- climate, terrain, borders, language, cultural_event, physical_evidence
- witness, comparison, elimination, location_puzzle, educational
- triangulation, psychological_profile, intercepted_communication
- historical_connection, final_evidence

For each turn, generate:
{
  "turns": [
    {
      "turn": 1,
      "narrative": "Opening narrative using kid-friendly language",
      "clues": [
        {
          "type": "clue_type",
          "content": "Main content (can be null)",
          "description": "Context/description (can be null)",
          "locationPositions": [1, 2, 3],
          "data": {
            "locationPosition": 1,
            "between": [1, 2],
            "kilometers": 1000,
            "miles": 621,
            "hours": 2,
            "offset": 5,
            "imageLevel": "obscured",
            "villainElement": "security_footage"
          }
        }
      ]
    }
  ]
}

CRITICAL: Every clue MUST include a "data" field, even if it's just an empty object {}. Use specific geographic features for educational value:

ENHANCED GEOGRAPHIC CLUE EXAMPLES:
- terrain: {"feature": "Andes mountains", "seaAccess": "Pacific coastline", "elevation": "3,500m above sea level"}
- climate: {"condition": "Mediterranean", "season": "dry summer", "zone": "subtropical"}
- cultural_event: {"event": "Independence Day celebration", "region": "South American nation", "timeOfYear": "July"}
- borders: {"neighbors": "three landlocked countries", "continent": "Africa", "region": "East Africa"}
- waterBody: {"type": "confluence", "description": "where two major rivers meet", "importance": "shipping hub"}
- language: {"family": "Romance languages", "script": "Latin alphabet", "uniqueFeature": "tonal variations"}
- economic: {"industry": "diamond mining", "export": "precious minerals", "significance": "major global supplier"}
- historical: {"era": "colonial period", "significance": "former spice trade hub", "influence": "Dutch architecture"}

GEOGRAPHIC SPECIFICITY GUIDELINES:
- Use ocean/sea names: "Indian Ocean", "Caribbean Sea", "North Sea"
- Reference mountain ranges: "Himalayas", "Rockies", "Atlas Mountains"  
- Include climate zones: "tropical rainforest", "Mediterranean", "continental"
- Mention geographic features: "fjords", "archipelago", "delta", "plateau"
- Reference cultural regions: "Scandinavia", "Maghreb", "Balkans", "Caucasus"

Generate all 7 turns with appropriate clue distribution. Make sure to include:
- Turn 1: Theme + 3 country clues (one for each country the cities are in) - 4 clues total
- Turn 2-3 and 5: Various clues but NO distance/timezone clues (use cultural, terrain, climate, etc.)
- Turn 4: ALL 3 distance calculations + ALL 3 time differences ONLY - 6 clues total
- Turn 5: Focus ONLY on the 3 crime scenes - no hints about 4th location
- Images in the turns specified by imageStrategy (turns 2 and 3 ONLY)
- Final location clues ONLY in Turns 6-7

CALCULATION INSTRUCTIONS:
For distances: Use Haversine formula: 
- distance = 2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)))
- Where R = 6371 km (Earth's radius)
For time differences: Subtract timezoneOffset values (location2.timezoneOffset - location1.timezoneOffset)

DISTANCE VERIFICATION CHECKLIST:
✓ Beijing to San Jose should be ~11,000 km (not 1,000 km!)
✓ Intercontinental distances are typically 8,000+ km
✓ Convert to miles by multiplying km by 0.621371

EXAMPLE TURN 1 STRUCTURE (with country clues):
{
  "turn": 1,
  "narrative": "Welcome, young detectives! A mysterious case has landed on our desk...",
  "clues": [
    {"type": "theme", "content": "Art Museums", "description": "The villain has been targeting famous art museums!", "locationPositions": [1, 2, 3]},
    {"type": "country", "content": "This country uses the Euro currency", "description": "The first location is in a country that adopted the Euro.", "locationPositions": [1], "data": {"locationPosition": 1}},
    {"type": "country", "content": "This nation's flag features a red maple leaf", "description": "The second location is in a country known for its distinctive flag.", "locationPositions": [2], "data": {"locationPosition": 2}},
    {"type": "country", "content": "This country is famous for its cherry blossoms", "description": "The third location is in a country known for seasonal flowers.", "locationPositions": [3], "data": {"locationPosition": 3}}
  ]
}

COUNTRY DATA REFERENCE:
Use the country names from the gameData.locations array to ensure accurate flag descriptions:
- Location 1 country: gameData.locations[0].country
- Location 2 country: gameData.locations[1].country  
- Location 3 country: gameData.locations[2].country
When creating flag clues, internally reference the actual country name to ensure accuracy, then describe the flag without mentioning the country name.

EXAMPLE TURN 4 STRUCTURE (with distance and time calculations):
{
  "turn": 4,
  "narrative": "Our investigation has revealed crucial geographic connections...",
  "clues": [
    {"type": "distance", "content": "11,000 km / 6,835 miles", "description": "The first location is 11,000 kilometers from the second location.", "data": {"between": [1, 2], "kilometers": 11000, "miles": 6835}},
    {"type": "distance", "content": "6,700 km / 4,163 miles", "description": "The first location is 6,700 kilometers from the third location.", "data": {"between": [1, 3], "kilometers": 6700, "miles": 4163}},
    {"type": "distance", "content": "8,900 km / 5,530 miles", "description": "The second location is 8,900 kilometers from the third location.", "data": {"between": [2, 3], "kilometers": 8900, "miles": 5530}},
    {"type": "time_difference", "content": "15 hours", "description": "The first city is 15 hours ahead of the second city.", "data": {"between": [1, 2], "hours": 15}},
    {"type": "time_difference", "content": "6 hours", "description": "The first city is 6 hours ahead of the third city.", "data": {"between": [1, 3], "hours": 6}},
    {"type": "time_difference", "content": "9 hours", "description": "The second city is 9 hours behind the third city.", "data": {"between": [2, 3], "hours": 9}}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative game designer specializing in educational geography games for children ages 10+. Create engaging turn-by-turn clues that build suspense while teaching geography. CRITICAL: Use specific geographic features (oceans, mountain ranges, climate zones) instead of generic terms. Examples: "this Atlantic coastal city", "this Himalayan capital", "this port on the Baltic Sea". Mix well-known and lesser-known locations for educational diversity. Calculate REAL distances using Haversine formula and REAL time differences using actual timezone offsets. NEVER mention specific location names - use geographically specific but non-revealing terms. Always return valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      response_format: { type: "json_object" }
    });

    const turnData = JSON.parse(response.choices[0].message.content);
    console.log('✅ V2 turn clues generated successfully');
    return turnData;
    
  } catch (error) {
    console.error('V2 turn clues generation failed:', error);
    throw new Error('V2 turn clues generation failed: ' + error.message);
  }
}

async function generateVillainPortraitV2(gameData) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('🎨 Generating V2 villain portrait...');
    
    const prompt = `Create a clean painterly storybook-style portrait of a person with the following characteristics:
    
Character Details:
- Gender: ${gameData.villainProfile.gender}
- Age: ${gameData.villainProfile.age}
- Ethnicity: ${gameData.villainProfile.ethnicity}
- Distinctive Feature: ${gameData.villainProfile.distinctiveFeature}
- Clothing: ${gameData.villainProfile.clothingDescription}

CRITICAL REQUIREMENTS:
- MODERN-DAY REALISTIC CLOTHING ONLY (jeans, t-shirts, jackets, sneakers, etc.)
- NO sci-fi outfits, space suits, costumes, or fantasy clothing
- The character must look like a normal person you'd meet on the street today
- NO futuristic, alien, or supernatural elements
- NO text, labels, signs, or written words anywhere in the image
- NO other objects, props, or items beyond the person themselves
- CLEAN portrait with minimal background elements

Style Requirements:
- Painterly storybook illustration style
- 3/4 view portrait, chest-up
- Confident expression (not scary or threatening)
- Muted, elegant color palette
- Plain solid background (no detailed backgrounds)
- Size: 1024x1024
- Kid-friendly appearance - charming and mischievous rather than menacing
- Focus entirely on the person's face and upper body

The portrait should show only the person against a simple background with no additional elements, text, or objects.`;

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png'
    });

    console.log('✅ V2 villain portrait generated successfully');
    
    // GPT-Image-1 returns base64, convert to data URL
    const base64Data = response.data[0].b64_json;
    const dataUrl = `data:image/png;base64,${base64Data}`;
    
    return {
      url: dataUrl,
      prompt: prompt
    };
    
  } catch (error) {
    console.error('V2 villain portrait generation failed:', error);
    throw new Error('V2 villain portrait generation failed: ' + error.message);
  }
}

async function generateLocationImagesV2Individual(gameId, gameData, locationRecords) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('📸 Generating V2 location images individually...');
    
    // Generate only the images specified in the strategy, with individual timing
    let imageNumber = 1;
    for (const placement of gameData.imageStrategy.placements) {
      const location = gameData.locations.find(l => l.position === placement.location);
      const locationRecord = locationRecords.find(r => r.position === placement.location);
      
      if (!location || !locationRecord) {
        console.error(`Location not found for position ${placement.location}`);
        continue;
      }
      
      console.log(`🎨 Phase 4${String.fromCharCode(97 + imageNumber)}: Generating image ${imageNumber} for ${location.name} (Turn ${placement.turn}, ${placement.level})`);
      
      // Track individual image generation timing
      const imageStartTime = new Date();
      const phaseFields = {
        1: { start: 'locationImage1StartTime', end: 'locationImage1EndTime' },
        2: { start: 'locationImage2StartTime', end: 'locationImage2EndTime' },
        3: { start: 'locationImage3StartTime', end: 'locationImage3EndTime' }
      };
      
      if (phaseFields[imageNumber]) {
        await prisma.generationV2.updateMany({
          where: { gameV2Id: gameId },
          data: { 
            [phaseFields[imageNumber].start]: imageStartTime,
            currentStep: `generating_location_image_${imageNumber}`
          }
        });
      }
      
      const landmarkIndex = Math.floor(Math.random() * location.landmarks.length);
      const landmark = location.landmarks[landmarkIndex];
      
      // Create image prompt with villain integration
      const imagePrompt = generateImagePromptV2(location, landmark, placement, gameData);
      
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'png'
      });
      
      // GPT-Image-1 returns base64, convert to data URL
      const base64Data = response.data[0].b64_json;
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      // Upload to S3
      const s3Url = await uploadImageToS3(
        dataUrl,
        gameId,
        `location_${placement.location}`,
        `turn_${placement.turn}`
      );
      
      // Update location record with image URL
      await prisma.locationV2.update({
        where: { id: locationRecord.id },
        data: { imageUrl: s3Url }
      });
      
      // Record end time
      const imageEndTime = new Date();
      if (phaseFields[imageNumber]) {
        await prisma.generationV2.updateMany({
          where: { gameV2Id: gameId },
          data: { [phaseFields[imageNumber].end]: imageEndTime }
        });
      }
      
      const duration = ((imageEndTime - imageStartTime) / 1000).toFixed(1);
      console.log(`✅ Image ${imageNumber} generated for ${location.name} (${duration}s)`);
      
      // Update progress
      await updateGenerationProgress(gameId, `location_image_${imageNumber}_generated`, 12 + imageNumber * 2);
      
      imageNumber++;
    }
    
    console.log('✅ All V2 location images generated individually');
    
  } catch (error) {
    console.error('V2 location images generation failed:', error);
    throw new Error('V2 location images generation failed: ' + error.message);
  }
}

// Keep the original function for backward compatibility
async function generateLocationImagesV2(gameId, gameData, locationRecords) {
  return generateLocationImagesV2Individual(gameId, gameData, locationRecords);
}

// Function to determine specific items for villain elements
function getSpecificVillainElement(placement, gameData) {
  switch(placement.villainElement) {
    case 'belongings':
      // Parse clothing description to find droppable items
      const clothingItems = gameData.villainProfile.clothingDescription.toLowerCase();
      const possibleItems = [];
      
      if (clothingItems.includes('jacket') || clothingItems.includes('coat')) possibleItems.push('jacket');
      if (clothingItems.includes('hat') || clothingItems.includes('cap')) possibleItems.push('hat');
      if (clothingItems.includes('scarf')) possibleItems.push('scarf');
      if (clothingItems.includes('gloves')) possibleItems.push('glove');
      if (clothingItems.includes('bag') || clothingItems.includes('backpack')) possibleItems.push('bag');
      
      // If no obvious items, use shirt/t-shirt based on theme
      if (possibleItems.length === 0) {
        const theme = gameData.theme.toLowerCase();
        if (theme.includes('environment') || theme.includes('tree') || theme.includes('forest') || theme.includes('deforestation')) {
          return 'green t-shirt with tree logo';
        } else if (theme.includes('chocolate') || theme.includes('cocoa') || theme.includes('candy')) {
          return 'brown hoodie with cocoa bean design';
        } else if (theme.includes('space')) {
          return 'space-themed t-shirt';
        } else if (theme.includes('art')) {
          return 'paint-splattered shirt';
        } else {
          return 'distinctive t-shirt related to ' + gameData.theme;
        }
      }
      
      return possibleItems[Math.floor(Math.random() * possibleItems.length)];
      
    case 'security_footage':
      return 'security camera footage';
      
    case 'reflection':
      return 'reflection in glass/water';
      
    case 'shadow':
      return 'distinctive shadow';
      
    default:
      return placement.villainElement;
  }
}

function generateImagePromptV2(location, landmark, placement, gameData) {
  // Use the pre-determined specific item from the placement
  const specificItem = placement.specificItem || getSpecificVillainElement(placement, gameData);
  
  // Map villain elements to more detailed, specific prompts
  const villainIntegration = {
    'security_footage': `CRITICAL REQUIREMENT: This MUST be a security camera footage screenshot. Include:
    - Black and white or grainy color security camera view
    - Timestamp overlay in corner (e.g., "2024-01-15 14:32:17")
    - Security camera UI elements (REC indicator, camera ID)
    - A person matching this description visible in the scene: ${gameData.villainProfile.clothingDescription}
    - The person should be walking through or standing in ${landmark}
    - The distinctive feature (${gameData.villainProfile.distinctiveFeature}) should be somewhat visible
    - Wide-angle security camera perspective showing the location`,
    
    'belongings': `CRITICAL REQUIREMENT: Show a close-up of a dropped/forgotten ${specificItem}. Include:
    - Main focus: The ${specificItem} lying on the ground at ${landmark}
    - The item should be prominently displayed in foreground  
    - Background should clearly show ${landmark} to establish location
    - Make the ${specificItem} the clear focal point of the image
    - The item should look accidentally dropped or left behind
    - Show the exact item: ${specificItem}`,
    
    'reflection': `CRITICAL REQUIREMENT: Show a clear reflection revealing the villain. Include:
    - A reflective surface (window, water, mirror, glass door) at ${landmark}
    - In the reflection: clearly show a person wearing ${gameData.villainProfile.clothingDescription}
    - The ${gameData.villainProfile.distinctiveFeature} should be visible in the reflection
    - The reflection should be the main focus while still showing the location
    - Make it look like surveillance evidence capturing the villain unknowingly`,
    
    'shadow': `CRITICAL REQUIREMENT: Show a distinctive shadow cast by the villain. Include:
    - A clear shadow on ground/wall at ${landmark}
    - Shadow should show silhouette of person in ${gameData.villainProfile.clothingDescription}
    - If possible, the shadow should hint at ${gameData.villainProfile.distinctiveFeature}
    - Strong lighting to create dramatic shadow
    - Location should be clearly identifiable despite focus on shadow`,
    
    'location_specific': `Show evidence of ${gameData.theme}-related activity at ${landmark}, with signs that someone was recently there conducting suspicious activity related to ${gameData.theme}`
  };
  
  const obscurityLevels = {
    'obscured': 'heavily obscured and mysterious, location barely recognizable but villain element still visible',
    'medium': 'moderately clear, location features visible but not immediately obvious',
    'clear': 'clear and detailed view of the location'
  };
  
  const villainHint = villainIntegration[placement.villainElement] || villainIntegration['location_specific'];
  const obscurity = obscurityLevels[placement.level] || obscurityLevels['medium'];
  
  return `Create a ${obscurity} detective evidence photograph.

${villainHint}

LOCATION CONTEXT:
- Primary location: ${landmark} in ${location.name}, ${location.country}
- This is evidence from a ${gameData.theme}-related crime investigation
- The image should tell a story about the villain's presence at this location

CRITICAL COMPOSITION RULES:
1. The villain element (${placement.villainElement}) MUST be the primary focus
2. The location should provide context but not overshadow the evidence
3. Even if the location is obscured, the villain element must remain clear
4. Style: Realistic crime scene/surveillance photography
5. Appropriate for children ages 10+ (no violence or scary content)
6. The image must match what will be described in clues about this evidence

IMPORTANT: The villain element is MORE important than the location obscurity. Prioritize showing clear evidence of the villain's presence.`;
}

async function updateGenerationProgress(gameId, step, completedSteps) {
  const isCompleted = completedSteps >= 20;
  await prisma.generationV2.updateMany({
    where: { gameV2Id: gameId },
    data: {
      currentStep: step,
      completedSteps: completedSteps,
      status: isCompleted ? 'completed' : 'generating',
      ...(isCompleted && { completedAt: new Date() })
    }
  });
}



async function uploadImageToS3(imageUrl, gameId, locationPosition, turn) {
  // If S3 client is available, upload to S3
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    try {
      // Determine which bucket to use based on environment
      const bucketName = isProduction && process.env.AWS_S3_PROD_BUCKET_NAME 
        ? process.env.AWS_S3_PROD_BUCKET_NAME 
        : process.env.AWS_S3_BUCKET_NAME;
      
      console.log(`Uploading image to S3 bucket: ${bucketName}`);
      
      // Download the image
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      
      // Create S3 key based on type
      let s3Key;
      if (locationPosition === 'villain') {
        s3Key = `games/${gameId}/villain-portrait.png`;
      } else {
        s3Key = `games/${gameId}/location-${locationPosition}/turn-${turn}.png`;
      }
      
      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png',
      });
      
      await s3Client.send(uploadCommand);
      
      // Return the S3 URL
      const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      console.log(`Image uploaded to S3: ${s3Url}`);
      return s3Url;
      
    } catch (error) {
      console.error('S3 upload failed, using original URL:', error);
      return imageUrl;
    }
  }
  
  // Mock delay and return original URL if S3 not configured
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('S3 not configured, using original URL:', imageUrl);
  return imageUrl;
}


// API: Debug endpoint
app.get('/api/debug/test', async (req, res) => {
  try {
    const games = await prisma.gameV2.findMany();
    const generations = await prisma.generationV2.findMany();
    res.json({
      games: games.length,
      generations: generations.length,
      database_connected: true
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      database_connected: false
    });
  }
});

// API: Test villain portrait generation
app.post('/api/test-villain-portrait', async (req, res) => {
  try {
    const { prompt, model = 'dall-e-3', quality = 'standard' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI not configured' });
    }
    
    console.log(`Testing villain portrait with model: ${model}, quality: ${quality}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    
    const imageParams = {
      model: model,
      prompt: prompt,
      size: "1024x1024",
      n: 1,
    };
    
    // Handle different model parameters
    if (model === 'gpt-image-1') {
      // GPT-Image-1 specific parameters
      imageParams.quality = quality === 'hd' ? 'high' : (quality === 'standard' ? 'medium' : quality);
      imageParams.output_format = 'png'; // png, jpeg, or webp (only supported by gpt-image-1)
      // Note: No background parameter - using default solid background
    } else if (model === 'dall-e-3') {
      // DALL-E 3 supports hd/standard quality
      imageParams.quality = quality; // 'hd' or 'standard'
    } else if (model === 'dall-e-2') {
      // DALL-E 2 only supports 'standard' quality
      imageParams.quality = 'standard';
    }
    
    const response = await openai.images.generate(imageParams);
    
    let imageUrl;
    if (model === 'gpt-image-1') {
      // GPT-Image-1 always returns base64
      const base64Data = response.data[0].b64_json;
      imageUrl = `data:image/png;base64,${base64Data}`;
    } else {
      // DALL-E 2 and 3 return URLs
      imageUrl = response.data[0].url;
    }
    
    res.json({
      imageUrl: imageUrl,
      model: model,
      quality: quality,
      promptUsed: prompt
    });
    
  } catch (error) {
    console.error('Test villain portrait generation failed:', error);
    res.status(500).json({ 
      error: 'Failed to generate test portrait',
      details: error.message 
    });
  }
});

// API: Admin database cleanup
app.post('/api/admin/clear-database', async (req, res) => {
  try {
    const { adminEmail, confirmation } = req.body;
    
    // Verify admin email and confirmation
    if (adminEmail !== 'adnanzuma@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }
    
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Invalid confirmation. Type "DELETE" to confirm.' });
    }
    
    console.log('ADMIN DATABASE CLEANUP INITIATED by:', adminEmail);
    
    // Clear all database tables (V2 models only)
    await prisma.clue.deleteMany();
    await prisma.gameplayTurn.deleteMany();
    await prisma.finalLocationV2.deleteMany();
    await prisma.locationV2.deleteMany();
    await prisma.playerCaseV2.deleteMany();
    await prisma.gameV2.deleteMany();
    await prisma.generationV2.deleteMany();
    await prisma.player.deleteMany();
    
    console.log('Database cleanup completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to clear database',
      details: error.message
    });
  }
});

// =============================================================================
// V2 GAME API ENDPOINTS (3+1 FORMAT)
// =============================================================================

// Create new V2 game
app.post('/api/v2/games/generate', async (req, res) => {
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

// Get V2 game generation status
app.get('/api/v2/games/:id/status', async (req, res) => {
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

// Function to generate diverse themes using OpenAI
async function generateDiverseThemes(numberOfGames, baseTheme = '') {
  try {
    // Get existing themes from published games to avoid overlap
    const existingGames = await prisma.gameV2.findMany({
      where: { isPublished: true },
      select: { theme: true },
      take: 50, // Get recent themes
      orderBy: { createdAt: 'desc' }
    });
    
    const existingThemes = existingGames.map(game => game.theme).filter(theme => theme && theme !== 'GENERATING...');
    
    let prompt = `Generate ${numberOfGames} diverse and creative themes for a geography detective game. Each theme should connect 3 locations worldwide through a compelling criminal case.

REQUIREMENTS:
- Each theme should be unique and engaging
- Themes should span different categories (heists, mysteries, espionage, historical crimes, etc.)
- Each theme should naturally connect to 3 major cities OR 3 countries
- Themes should be appropriate for ages 10+ (educational and fun)
- Avoid repetitive or similar themes

EXISTING THEMES TO AVOID OVERLAP:
${existingThemes.length > 0 ? existingThemes.slice(0, 20).join(', ') : 'None'}

FORMAT: Return as a JSON array of strings, each being a concise theme description (2-4 words).

EXAMPLES:
["ancient artifact smuggling", "space technology theft", "diamond heist network", "art forgery ring", "cyber espionage case", "treasure hunt mystery"]`;

    if (baseTheme) {
      prompt += `\n\nBASE THEME INSPIRATION: ${baseTheme} (create variations and related themes)`;
    }

    if (openai && process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      
      // Parse JSON response
      try {
        const themes = JSON.parse(content);
        if (Array.isArray(themes) && themes.length >= numberOfGames) {
          return themes.slice(0, numberOfGames);
        }
      } catch (parseError) {
        console.log('Failed to parse OpenAI themes, using fallback');
      }
    }
    
    // Fallback themes if OpenAI fails
    const fallbackThemes = [
      "ancient artifact smuggling", "space technology theft", "diamond heist network", 
      "art forgery ring", "cyber espionage case", "treasure hunt mystery",
      "oil drilling conspiracy", "pharmaceutical espionage", "cultural relic theft",
      "international money laundering", "wildlife trafficking", "nuclear secrets theft",
      "fashion industry espionage", "archaeological discovery theft", "shipping container mystery",
      "tech startup sabotage", "royal jewel heist", "music industry scandal",
      "food supply chain conspiracy", "renewable energy sabotage"
    ];
    
    // Shuffle and return required number
    const shuffled = fallbackThemes.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numberOfGames);
    
  } catch (error) {
    console.error('Error generating diverse themes:', error);
    // Return basic fallback
    return Array(numberOfGames).fill(0).map((_, i) => `mystery case ${i + 1}`);
  }
}

// Bulk generate V2 games
app.post('/api/v2/games/bulk-generate', async (req, res) => {
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
app.post('/api/v2/games/bulk-status', async (req, res) => {
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

// Get all V2 games
app.get('/api/v2/games', async (req, res) => {
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

// Get detailed V2 game by ID
app.get('/api/v2/games/:id', async (req, res) => {
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

// Fix completed V2 games missing phase timing data
app.post('/api/v2/games/fix-completed', async (req, res) => {
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

// Publish/unpublish V2 game
app.put('/api/v2/games/:id/publish', async (req, res) => {
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

// Delete V2 game
app.delete('/api/v2/games/:id', async (req, res) => {
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

// Get published V2 games for players
app.get('/api/v2/cases', async (req, res) => {
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

// =============================================================================
// PLAYER RESULT TRACKING ENDPOINTS
// =============================================================================

// Submit V2 game result
app.post('/api/v2/games/:id/submit-result', async (req, res) => {
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

// Get player's V2 game results
app.get('/api/v2/players/:playerId/results', async (req, res) => {
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

// Get player profile with statistics
app.get('/api/players/:playerId/profile', async (req, res) => {
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

// Create or update player profile
app.post('/api/players', async (req, res) => {
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

// API: Leaderboard data with weighted scoring
app.get('/api/leaderboard', async (req, res) => {
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

// Helper function to get most played difficulty for a player (V2 only)
function getMostPlayedDifficulty(player) {
  const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
  
  player.solvedCasesV2.forEach(playerCase => {
    const difficulty = playerCase.gameV2.difficulty;
    if (difficultyCounts[difficulty] !== undefined) {
      difficultyCounts[difficulty]++;
    }
  });
  
  // Return the difficulty with the highest count, default to 'easy' if none played
  const maxDifficulty = Object.keys(difficultyCounts).reduce((a, b) => 
    difficultyCounts[a] > difficultyCounts[b] ? a : b
  );
  
  // If all counts are 0, return 'easy' as default
  return Object.values(difficultyCounts).every(count => count === 0) ? 'easy' : maxDifficulty;
}

// Helper function to check if player has played specific difficulty (V2 only)
async function hasPlayedDifficulty(playerId, targetDifficulty) {
  const v2Cases = await prisma.playerCaseV2.findMany({
    where: { playerId },
    include: { gameV2: { select: { difficulty: true } } }
  });
  
  return v2Cases.some(pc => pc.gameV2.difficulty === targetDifficulty);
}

// Start server
app.listen(port, () => {
  console.log(`\n🚀 Unified server running on port ${port}`);
  console.log(`📍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`\n🎮 Game gallery: ${isProduction ? productionDomain : `http://localhost:${port}`}/game/`);
  console.log(`🔧 Admin portal: ${isProduction ? productionDomain : `http://localhost:${port}`}/admin/`);
  
  if (isProduction) {
    console.log(`\n🌐 Production URL: ${productionDomain}`);
    console.log(`📦 S3 Bucket: ${process.env.AWS_S3_PROD_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`💾 Database: ${process.env.DATABASE_URL || 'file:/db/production.db'}`);
  } else {
    console.log(`\n🎨 Mockups: http://localhost:${port}/mockups/`);
  }
});