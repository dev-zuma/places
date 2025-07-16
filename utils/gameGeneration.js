const { openai, prisma } = require('./clients');
const { updateGenerationProgress, getMostUsedCities } = require('./database');
const { calculateLocationDistances, calculateTimeDifferences } = require('./geoCalculations');
const { generateVillainPortraitV2, generateLocationImagesV2Individual, getSpecificVillainElement } = require('./imageGeneration');
const { uploadImageToS3 } = require('./imageUpload');

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

CRITICAL: Every clue MUST include a "data" field, even if it's just an empty object {}. Use specific geographic features for educational value.

Generate all 7 turns with appropriate clue distribution. Make sure to include:
- Turn 1: Theme + 3 country clues (one for each country the cities are in) - 4 clues total
- Turn 2-3 and 5: Various clues but NO distance/timezone clues (use cultural, terrain, climate, etc.)
- Turn 4: ALL 3 distance calculations + ALL 3 time differences ONLY - 6 clues total
- Turn 5: Focus ONLY on the 3 crime scenes - no hints about 4th location
- Images in the turns specified by imageStrategy (turns 2 and 3 ONLY)
- Final location clues ONLY in Turns 6-7

COUNTRY DATA REFERENCE:
Use the country names from the gameData.locations array to ensure accurate flag descriptions:
- Location 1 country: gameData.locations[0].country
- Location 2 country: gameData.locations[1].country  
- Location 3 country: gameData.locations[2].country
When creating flag clues, internally reference the actual country name to ensure accuracy, then describe the flag without mentioning the country name.`;

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

module.exports = {
  generateDiverseThemes,
  generateGameContentV2,
  generateTurnCluesV2,
  generateGameV2Async
};