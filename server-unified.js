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

// API: Get all games
app.get('/api/games', async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// API: Get game by ID
app.get('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// API: Get cases (alias for games, used by game interface)
app.get('/api/cases', async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: { isPublished: true },
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform games to case format
    const cases = games.map(game => ({
      id: game.id,
      caseTitle: game.caseTitle,
      theme: game.theme,
      difficulty: game.difficulty,
      villainName: game.villainName,
      villainTitle: game.villainTitle,
      villainImageUrl: game.villainImageUrl,
      crimeSummary: game.crimeSummary,
      turn4Clue: game.turn4Clue,
      interestingFact: game.interestingFact,
      locations: game.locations.map(loc => ({
        position: loc.position,
        name: loc.name,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timezoneOffset: loc.timezoneOffset,
        images: {
          turn1: loc.image1Url,
          turn3: loc.image2Url,
          turn5: loc.image3Url
        }
      }))
    }));
    
    res.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// API: Update game
app.put('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const game = await prisma.game.update({
      where: { id },
      data: {
        isPublished: updateData.isPublished,
        theme: updateData.theme,
        difficulty: updateData.difficulty,
        caseTitle: updateData.caseTitle,
        villainName: updateData.villainName,
        villainTitle: updateData.villainTitle,
        villainImageUrl: updateData.villainImageUrl,
        crimeSummary: updateData.crimeSummary,
        turn4Clue: updateData.turn4Clue,
        interestingFact: updateData.interestingFact,
      },
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    res.json(game);
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// API: Delete game
app.delete('/api/games/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Attempting to delete game:', id);
    
    // Delete associated data first (due to foreign key constraints)
    await prisma.location.deleteMany({
      where: { gameId: id }
    });
    
    await prisma.generation.deleteMany({
      where: { gameId: id }
    });
    
    await prisma.playerCase.deleteMany({
      where: { gameId: id }
    });
    
    // Delete the game
    await prisma.game.delete({
      where: { id }
    });
    
    console.log('Successfully deleted game:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game', details: error.message });
  }
});

// API: Publish game
app.post('/api/games/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    
    const game = await prisma.game.update({
      where: { id },
      data: { isPublished: true },
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    res.json(game);
  } catch (error) {
    console.error('Error publishing game:', error);
    res.status(500).json({ error: 'Failed to publish game' });
  }
});

// API: Unpublish game
app.post('/api/games/:id/unpublish', async (req, res) => {
  try {
    const { id } = req.params;
    
    const game = await prisma.game.update({
      where: { id },
      data: { isPublished: false },
      include: {
        locations: {
          orderBy: { position: 'asc' }
        }
      }
    });
    
    res.json(game);
  } catch (error) {
    console.error('Error unpublishing game:', error);
    res.status(500).json({ error: 'Failed to unpublish game' });
  }
});

// API: Start game generation
app.post('/api/generate', async (req, res) => {
  try {
    const { theme, difficulty } = req.body;
    const userInput = req.body.userInput || theme;
    const specificLocations = req.body.specificLocations || null;
    const autoGenerateVillain = req.body.autoGenerateVillain !== false;
    const kidFriendly = req.body.kidFriendly || false;
    const crimeType = req.body.crimeType || 'theft';
    
    const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create initial game record
    const game = await prisma.game.create({
      data: {
        id: gameId,
        theme: theme || 'MYSTERY',
        phrase: 'Investigation in progress...',
        category: 'Geography',
        difficulty: difficulty || 'medium',
        caseTitle: `Operation ${theme || 'Mystery'}`,
        villainName: 'Unknown',
        villainTitle: 'International Criminal',
        crimeSummary: 'Details pending...',
        turn4Clue: 'Investigation in progress...',
        interestingFact: 'More information coming soon...',
        isPublished: false
      }
    });
    
    // Create generation record
    await prisma.generation.create({
      data: {
        gameId: gameId,
        status: 'in_progress',
        currentStep: 'Initializing',
        completedSteps: 0,
        totalSteps: 5
      }
    });
    
    res.json({ 
      gameId: gameId,
      message: 'Game generation started'
    });
    
    // Start async generation with OpenAI integration
    generateGameAsync(gameId, { userInput, specificLocations, difficulty, autoGenerateVillain, kidFriendly, crimeType }).catch(error => {
      console.error('Game generation failed:', error);
    });
  } catch (error) {
    console.error('Error starting game generation:', error);
    res.status(500).json({ error: 'Failed to start game generation' });
  }
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
4. All content must be appropriate for ages 8-16
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
  "crimeSummary": "Detailed crime story (3-4 sentences) that describes the villain's activities and modus operandi while hinting at cultural, geographical, or historical characteristics of the locations WITHOUT revealing their names. Include atmospheric details, the villain's motivations, and subtle clues about the types of places involved",
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
            content: 'You are a creative game designer specializing in educational geography games. Always return valid JSON only.'
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

async function generateLocationImage(location, theme, turn, difficulty) {
  const blurLevels = {
    1: { blur: "heavy", description: "extremely blurred and abstract, barely recognizable" },
    3: { blur: "medium", description: "partially clear with some identifiable features" },
    5: { blur: "clear", description: "sharp and detailed" }
  };

  const landmarkIndex = Math.floor((turn - 1) / 2);
  const landmark = location.landmarks[landmarkIndex];
  const { blur, description } = blurLevels[turn];

  let viewType, promptAdjustment;
  
  if (turn === 1) {
    const obscureViews = [
      "extreme close-up detail of architectural texture",
      "shadow pattern cast by building",
      "abstract architectural detail from unusual angle",
      "blurred motion view from moving vehicle",
      "silhouette against sky",
      "reflection in water or glass",
      "architectural pattern or geometric detail"
    ];
    viewType = obscureViews[Math.floor(Math.random() * obscureViews.length)];
    promptAdjustment = "Make this image very challenging to identify - avoid showing iconic or recognizable features directly. Focus on textures, patterns, shadows, or abstract elements that hint at the location without making it obvious.";
  } else if (turn === 3) {
    viewType = "mid-distance view showing some context";
    promptAdjustment = "Show more context but still maintain some mystery.";
  } else if (turn === 5) {
    viewType = difficulty === "easy" ? "clear tourist photo" : "clear identifying view";
    promptAdjustment = "Show clear identifying features to confirm the location.";
  }

  const prompt = `${viewType} of ${landmark} in ${location.name}, ${location.country}. Style: travel photography, ${description}. ${promptAdjustment} The image should be appropriate for a geography puzzle game.`;

  // Try to use OpenAI GPT-Image-1 if available
  if (openai && process.env.OPENAI_API_KEY) {
    try {
      console.log(`🖼️ ${location.name} image ${turn}/3`);
      
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
        n: 1,
      });
      
      // GPT-Image-1 returns base64, convert to data URL
      const base64Data = response.data[0].b64_json;
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      return {
        url: dataUrl,
        prompt,
        blurLevel: blur,
      };
    } catch (error) {
      console.error('GPT-Image-1 generation failed, using placeholder:', error);
    }
  }
  
  // Fallback: Use placeholder image service
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    url: `https://picsum.photos/1024/1024?random=${Date.now()}_${location.position}_${turn}`,
    prompt,
    blurLevel: blur,
  };
}

async function generateVillainPortrait(villainName, villainTitle, theme, villainDetails = {}) {
  // Use provided details or fall back to random generation
  const clothing = villainDetails.villainClothingDescription || `theme-related clothing inspired by ${theme}`;
  const age = villainDetails.villainAge || 'mid-40s';
  const ethnicity = villainDetails.villainEthnicity || 'varied ethnicity';
  const distinctiveFeature = villainDetails.villainDistinctiveFeature || 'confident expression';
  
  // Use provided gender or fall back to random assignment
  let gender = villainDetails.villainGender;
  if (!gender) {
    const genders = ['male', 'female'];
    gender = genders[Math.floor(Math.random() * genders.length)];
  }
  
  const prompt = `Create a digital painting of a fictional ${gender} villain, shown from the chest up in a 3/4 view. 

CHARACTER DETAILS:
- Age: ${age}
- Ethnicity: ${ethnicity}
- Distinctive feature: ${distinctiveFeature}
- Expression: confident and slightly mischievous

CLOTHING AND STYLE:
${clothing}

ARTISTIC STYLE:
The illustration should use soft brushstrokes, flat but textured color areas, and a lightly textured background. The overall look should resemble storybook illustrations or character art from a children's graphic novel. Use modern day clothing and fashion style.

Use a muted, elegant color palette. Make sure the portrait feels like it belongs in a vintage gallery or an illustrated villain dossier.

Style keywords: painterly, oil painting, storybook portrait, warm tone, museum-style, bust portrait.

Do not include any text, labels, or logos.

Villain info:
Villain is named ${villainName}, known as "${villainTitle}"
Theme: ${theme}`;

  // Try to use OpenAI GPT-Image-1 if available
  if (openai && process.env.OPENAI_API_KEY) {
    try {
      // Portrait generation logged in main flow
      
      const imageParams = {
        model: "gpt-image-1",
        prompt: prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
        n: 1,
      };
      
      const response = await openai.images.generate(imageParams);
      
      // GPT-Image-1 returns base64, convert to data URL
      const base64Data = response.data[0].b64_json;
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      return {
        url: dataUrl,
        prompt,
      };
    } catch (error) {
      console.error('DALL-E generation failed, using placeholder:', error);
    }
  }
  
  // Fallback: Use UI Avatars service
  await new Promise(resolve => setTimeout(resolve, 500));
  const colors = ['7F7FD5', 'E786D7', '86E7B8', 'FFD93D', 'FF6B6B', '4ECDC4'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const initials = villainName.split(' ').map(word => word[0]).join('').slice(0, 2);
  
  return {
    url: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=512&background=${color}&color=fff&bold=true&rounded=true`,
    prompt,
  };
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

// API: Generation status
app.get('/api/generate/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const generation = await prisma.generation.findFirst({
      where: { gameId: id },
      orderBy: { startedAt: 'desc' },
    });

    if (!generation) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    res.json({
      gameId: id,
      status: generation.status,
      currentStep: generation.currentStep,
      completedSteps: generation.completedSteps,
      totalSteps: generation.totalSteps,
      error: generation.error,
    });
  } catch (error) {
    console.error('Error fetching generation status:', error);
    res.status(500).json({ error: 'Failed to fetch generation status' });
  }
});

// API: Debug endpoint
app.get('/api/debug/test', async (req, res) => {
  try {
    const games = await prisma.game.findMany();
    const generations = await prisma.generation.findMany();
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
    
    // Clear all database tables
    await prisma.location.deleteMany();
    await prisma.game.deleteMany();
    await prisma.generation.deleteMany();
    
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