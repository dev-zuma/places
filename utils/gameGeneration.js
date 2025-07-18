const { openai, prisma } = require('./clients');
const { updateGenerationProgress, getMostUsedCities } = require('./database');
const { calculateLocationDistances, calculateTimeDifferences } = require('./geoCalculations');
const { generateVillainPortraitV2, generateLocationImagesV2Individual, getSpecificVillainElement } = require('./imageGeneration');
const { uploadImageToS3 } = require('./imageUpload');

function getFlagColors(country) {
  // Static flag colors database - comprehensive list for all countries
  const flagColors = {
    // Africa
    'Algeria': ['#006633', '#FFFFFF', '#D21034'], // Green, White, Red
    'Angola': ['#D22630', '#000000', '#FFCD00'], // Red, Black, Yellow
    'Benin': ['#008751', '#FFD900', '#D21034'], // Green, Yellow, Red
    'Botswana': ['#6DA9D2', '#FFFFFF', '#000000'], // Blue, White, Black
    'Burkina Faso': ['#D21034', '#008751'], // Red, Green
    'Cameroon': ['#008751', '#D21034', '#FFD900'], // Green, Red, Yellow
    'Cape Verde': ['#003893', '#FFFFFF', '#CF002B', '#FFD900'], // Blue, White, Red, Yellow
    'Chad': ['#002664', '#FFD900', '#D21034'], // Blue, Yellow, Red
    'Côte d\'Ivoire': ['#FF9A00', '#FFFFFF', '#008751'], // Orange, White, Green
    'Egypt': ['#D21034', '#FFFFFF', '#000000'], // Red, White, Black
    'Ethiopia': ['#008751', '#FFD900', '#D21034'], // Green, Yellow, Red
    'Ghana': ['#D21034', '#FFD900', '#008751', '#000000'], // Red, Gold, Green, Black star
    'Kenya': ['#000000', '#D21034', '#008751', '#FFFFFF'], // Black, Red, Green, White
    'Libya': ['#D21034', '#000000', '#008751'], // Red, Black, Green
    'Morocco': ['#D21034', '#008751'], // Red, Green
    'Nigeria': ['#008751', '#FFFFFF'], // Green, White
    'Senegal': ['#008751', '#FFD900', '#D21034'], // Green, Yellow, Red
    'South Africa': ['#000000', '#FFD700', '#008751', '#FFFFFF', '#D21034', '#002395'], // Black, Gold, Green, White, Red, Blue
    'Tanzania': ['#1EB53A', '#FFD900', '#009639', '#000000'], // Green, Yellow, Blue, Black
    'Tunisia': ['#D21034', '#FFFFFF'], // Red, White
    'Uganda': ['#000000', '#FFD900', '#D21034'], // Black, Yellow, Red
    'Zimbabwe': ['#008751', '#FFD900', '#D21034', '#000000', '#FFFFFF'], // Green, Yellow, Red, Black, White

    // Asia
    'Afghanistan': ['#000000', '#D21034', '#008751'], // Black, Red, Green
    'Bangladesh': ['#008751', '#D21034'], // Green, Red
    'China': ['#D21034', '#FFD700'], // Red, Yellow
    'India': ['#FF9933', '#FFFFFF', '#138808', '#000080'], // Saffron, White, Green, Navy
    'Indonesia': ['#D21034', '#FFFFFF'], // Red, White
    'Iran': ['#008751', '#FFFFFF', '#D21034'], // Green, White, Red
    'Iraq': ['#D21034', '#FFFFFF', '#000000'], // Red, White, Black
    'Japan': ['#FFFFFF', '#BC002D'], // White, Red
    'Jordan': ['#000000', '#FFFFFF', '#008751', '#D21034'], // Black, White, Green, Red
    'Kazakhstan': ['#00AFCA', '#FFD700'], // Blue, Yellow
    'Malaysia': ['#D21034', '#FFFFFF', '#002395', '#FFD700'], // Red, White, Blue, Yellow
    'Pakistan': ['#008751', '#FFFFFF'], // Green, White
    'Philippines': ['#0038A8', '#D21034', '#FFFFFF', '#FFD700'], // Blue, Red, White, Yellow
    'Saudi Arabia': ['#008751', '#FFFFFF'], // Green, White
    'Singapore': ['#D21034', '#FFFFFF'], // Red, White
    'South Korea': ['#FFFFFF', '#D21034', '#0047A0'], // White, Red, Blue
    'Sri Lanka': ['#FF7900', '#8A4117', '#FFD700', '#008751'], // Orange, Maroon, Yellow, Green
    'Thailand': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Turkey': ['#D21034', '#FFFFFF'], // Red, White
    'United Arab Emirates': ['#D21034', '#008751', '#FFFFFF', '#000000'], // Red, Green, White, Black
    'Vietnam': ['#D21034', '#FFD700'], // Red, Yellow

    // Europe
    'Austria': ['#D21034', '#FFFFFF'], // Red, White
    'Belgium': ['#000000', '#FFD700', '#D21034'], // Black, Yellow, Red
    'Bulgaria': ['#FFFFFF', '#008751', '#D21034'], // White, Green, Red
    'Croatia': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Czech Republic': ['#FFFFFF', '#D21034', '#002395'], // White, Red, Blue
    'Denmark': ['#D21034', '#FFFFFF'], // Red, White
    'Estonia': ['#002395', '#000000', '#FFFFFF'], // Blue, Black, White
    'Finland': ['#002395', '#FFFFFF'], // Blue, White
    'France': ['#002395', '#FFFFFF', '#D21034'], // Blue, White, Red
    'Germany': ['#000000', '#D21034', '#FFD700'], // Black, Red, Gold
    'Greece': ['#002395', '#FFFFFF'], // Blue, White
    'Hungary': ['#D21034', '#FFFFFF', '#008751'], // Red, White, Green
    'Iceland': ['#002395', '#FFFFFF', '#D21034'], // Blue, White, Red
    'Ireland': ['#008751', '#FFFFFF', '#FF7900'], // Green, White, Orange
    'Italy': ['#008751', '#FFFFFF', '#D21034'], // Green, White, Red
    'Latvia': ['#8B0000', '#FFFFFF'], // Maroon, White
    'Lithuania': ['#FFD700', '#008751', '#D21034'], // Yellow, Green, Red
    'Netherlands': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Norway': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Poland': ['#FFFFFF', '#D21034'], // White, Red
    'Portugal': ['#008751', '#D21034', '#FFD700'], // Green, Red, Yellow
    'Romania': ['#002395', '#FFD700', '#D21034'], // Blue, Yellow, Red
    'Russia': ['#FFFFFF', '#002395', '#D21034'], // White, Blue, Red
    'Spain': ['#D21034', '#FFD700'], // Red, Yellow
    'Sweden': ['#002395', '#FFD700'], // Blue, Yellow
    'Switzerland': ['#D21034', '#FFFFFF'], // Red, White
    'Ukraine': ['#002395', '#FFD700'], // Blue, Yellow
    'United Kingdom': ['#002395', '#FFFFFF', '#D21034'], // Blue, White, Red

    // North America
    'Canada': ['#D21034', '#FFFFFF'], // Red, White
    'Costa Rica': ['#002395', '#FFFFFF', '#D21034'], // Blue, White, Red
    'Cuba': ['#002395', '#FFFFFF', '#D21034'], // Blue, White, Red
    'Guatemala': ['#002395', '#FFFFFF'], // Blue, White
    'Mexico': ['#008751', '#FFFFFF', '#D21034'], // Green, White, Red
    'Panama': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'United States': ['#B22234', '#FFFFFF', '#3C3B6E'], // Red, White, Blue

    // South America
    'Argentina': ['#74ACDF', '#FFFFFF', '#FFD700'], // Blue, White, Yellow
    'Bolivia': ['#D21034', '#FFD700', '#008751'], // Red, Yellow, Green
    'Brazil': ['#008751', '#FFD700', '#002395', '#FFFFFF'], // Green, Yellow, Blue, White
    'Chile': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Colombia': ['#FFD700', '#002395', '#D21034'], // Yellow, Blue, Red
    'Ecuador': ['#FFD700', '#002395', '#D21034'], // Yellow, Blue, Red
    'Paraguay': ['#D21034', '#FFFFFF', '#002395'], // Red, White, Blue
    'Peru': ['#D21034', '#FFFFFF'], // Red, White
    'Uruguay': ['#FFFFFF', '#002395', '#FFD700'], // White, Blue, Yellow
    'Venezuela': ['#FFD700', '#002395', '#D21034'], // Yellow, Blue, Red

    // Oceania
    'Australia': ['#002395', '#D21034', '#FFFFFF'], // Blue, Red, White
    'Fiji': ['#002395', '#FFFFFF'], // Blue, White
    'New Zealand': ['#002395', '#D21034', '#FFFFFF'], // Blue, Red, White
    'Papua New Guinea': ['#000000', '#D21034', '#FFD700'], // Black, Red, Yellow
  };

  const colors = flagColors[country];
  if (colors) {
    console.log(`🎨 Using static flag colors for ${country}:`, colors);
    return JSON.stringify(colors);
  }

  // Fallback for unknown countries
  console.log(`⚠️ No flag colors found for ${country}, using fallback`);
  const fallbackColors = ['#D21034', '#FFFFFF', '#002395']; // Red, White, Blue
  return JSON.stringify(fallbackColors);
}

async function generateFinalLocationPuzzle(finalLocation, theme, locations) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }

  try {
    console.log('🧩 Generating final location puzzle content...');

    // Generate flag colors and puzzle content in parallel
    const [flagColorsResult, puzzleResult] = await Promise.all([
      Promise.resolve(getFlagColors(finalLocation.country)),
      generatePuzzleContent(finalLocation, theme, locations)
    ]);

    const puzzleData = {
      ...puzzleResult,
      flagColors: flagColorsResult
    };

    console.log('✅ Final location puzzle and flag colors generated successfully');
    return puzzleData;

  } catch (error) {
    console.error('Final location puzzle generation failed:', error);
    // Fallback puzzle data with basic flag colors
    const fallbackColors = JSON.stringify(['#FF0000', '#FFFFFF', '#0000FF']);
    return {
      educationalPhrase: `Exploring beautiful ${finalLocation.name}`,
      categoryHint: "Travel Destination",
      interestingFact: `${finalLocation.name} is a fascinating city with rich cultural heritage and unique geographic features that make it an important destination.`,
      flagColors: fallbackColors
    };
  }
}

async function generatePuzzleContent(finalLocation, theme, locations) {
  // Static cacheable instructions for puzzle generation
  const staticPuzzleInstructions = `Generate puzzle content for the 4th final location in a geography detective game. The puzzle uses an educational phrase about the location that players must solve by assembling scrambled letters. Return response in JSON format.

REQUIREMENTS:
1. Educational phrase (4-5 words) that includes the city name
   - Must be educational, memorable, and factually accurate
   - Should highlight a distinctive feature, event, or characteristic of the city
   - Examples: "Cherry blossoms in Kyoto" (22 chars), "Bulls run through Pamplona" (25 chars), "Northern lights in Tromsø" (24 chars)
   - City name should be prominent and naturally integrated
   - Avoid generic phrases - use specific, distinctive features
   - CRITICAL: Total phrase must be 25 characters or less (including spaces)

2. Category hint (2-3 words maximum)
   - Broad category that helps identify the type of activity/feature
   - Examples: "Cultural Festival", "Historical Landmark", "Natural Wonder", "Religious Site", "Architectural Marvel"
   - Should help players understand what they're looking for without giving away the answer

3. Interesting fact (2-3 sentences)
   - Educational detail about the phrase topic that will be shown when suspect is captured
   - Should be engaging, informative, and age-appropriate for elementary students
   - Connect the specific feature to broader geographic or cultural knowledge
   - Make players say "Wow, I never knew that!"

PHRASE REQUIREMENTS:
- Must be exactly 4-5 words
- Must include the city name
- Must be factually accurate about the location
- Should be specific enough that it couldn't apply to many other cities
- Use proper grammar and natural phrasing
- Appropriate for ages 10+ (elementary school level)
- CRITICAL: Total phrase must be 25 characters or less (including spaces)

Return JSON format:
{
  "educationalPhrase": "phrase here",
  "categoryHint": "category here", 
  "interestingFact": "detailed fact here"
}`;

  // Dynamic context for puzzle generation
  const dynamicPuzzleContext = `
Final Location Details:
- City: ${finalLocation.name}
- Country: ${finalLocation.country}
- Game Theme: ${theme}
- Connected Locations: ${locations.map(l => l.name).join(', ')}

Create a puzzle that:
1. Highlights what makes ${finalLocation.name} distinctive and educational
2. Connects thematically to the overall game theme: ${theme}
3. Provides geographic or cultural learning opportunities
4. Is appropriate for elementary school students`;

  const fullPuzzlePrompt = staticPuzzleInstructions + dynamicPuzzleContext;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: fullPuzzlePrompt
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

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
    
    // Static cacheable instructions for theme generation
    const staticThemeInstructions = `Generate diverse and creative themes for a geography detective game. Each theme should connect 3 locations worldwide through a compelling criminal case. Return response in JSON format.

REQUIREMENTS:
- Each theme should be unique and engaging
- Themes should span different categories (heists, mysteries, espionage, historical crimes, etc.)
- Each theme should naturally connect to 3 major cities OR 3 countries
- Themes should be appropriate for ages 10+ (educational and fun)
- Avoid repetitive or similar themes

FORMAT: Return as a JSON array of strings, each being a concise theme description (2-4 words).

EXAMPLES:
["ancient artifact smuggling", "space technology theft", "diamond heist network", "art forgery ring", "cyber espionage case", "treasure hunt mystery"]`;

    // Dynamic context for theme generation
    const dynamicThemeContext = `
Number of themes to generate: ${numberOfGames}

EXISTING THEMES TO AVOID OVERLAP:
${existingThemes.length > 0 ? existingThemes.slice(0, 20).join(', ') : 'None'}${baseTheme ? `

BASE THEME INSPIRATION: ${baseTheme} (create variations and related themes)` : ''}`;

    const fullThemePrompt = staticThemeInstructions + dynamicThemeContext;

    if (openai && process.env.OPENAI_API_KEY) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: fullThemePrompt }],
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
    
    // True random race selection using Unix timestamp
    const timestamp = Date.now();
    const lastDigit = timestamp % 10;
    
    // Map last digit to race
    const raceMapping = {
      0: 'White',
      1: 'Asian',
      2: 'Hispanic/Latino',
      3: 'Native American',
      4: 'Pacific Islander',
      5: 'Mixed Race',
      6: 'White',  // Double White to balance distribution
      7: 'Black',
      8: 'Middle Eastern',
      9: 'Mixed Race'  // Double Mixed Race
    };
    
    const selectedRace = raceMapping[lastDigit];
    console.log(`🎲 Timestamp: ${timestamp}, Last digit: ${lastDigit}, Selected race: ${selectedRace}`);
    
    // Get most used cities for diversity guidance
    const mostUsedCities = await getMostUsedCities(20);
    
    // Static cacheable instructions (put at top for caching)
    const staticInstructions = `Generate a REALISTIC, MODERN-DAY geography-based detective game using the new 3+1 format where players track a villain across 3 connected locations, then use those to deduce a 4th final location. Return response in JSON format.

GAME STRUCTURE:
- Turns 1-5: Players identify 3 crime scene locations
- Turns 6-7: Players deduce the 4th "final" location

CRITICAL LOCATION RULES:
- ONLY use cities (never countries, states, regions, or other geographic entities)
- ALL 4 locations (including final location) must be major cities
- The 4th location should connect thematically/narratively (NOT geographically equidistant)

LOCATION DIFFICULTY REQUIREMENTS:
- EASY: 2 locations must be well-known capital cities or major international cities + 1 location is a lesser-known but still important city
- MEDIUM: 1 location is a well-known major city + 2 locations are lesser-known but still important cities
- HARD: All 3 locations are lesser-known but still major cities (avoid capitals and famous tourist destinations)
- The 4th location (final location) should ALWAYS be a lesser-known city, regardless of difficulty level
- Prioritize geographic diversity across different continents and regions when possible
- Balance recognizable landmarks with educational discovery opportunities
- Examples: Easy = Paris + Tokyo + Thessaloniki; Medium = London + Krakow + Montevideo; Hard = Almaty + Medan + Porto Alegre
- Lesser-known cities examples: Thessaloniki, Krakow, Montevideo, Almaty, Medan, Porto Alegre, Dakar, Izmir, Pune, Guayaquil, Harbin, Durban, etc.
- Encourage learning about different cultures, climate zones, and geographic features
- AVOID overused cities like London, Berlin, New York City, Wellington, Cape Town - use them sparingly

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

VILLAIN RACE REQUIREMENT:
- The villain's race has been pre-selected as: {RACE_PLACEHOLDER}
- You MUST use this exact race for the villain. Do not change or select a different race.
- Based on this race, select an appropriate ethnicity/cultural background:
  * Black: Nigerian, Kenyan, Ethiopian, Ghanaian, Jamaican, Haitian, Somali, South African, Zimbabwean, etc.
  * White: German, Irish, Russian, Italian, Norwegian, Australian, French, Polish, Swedish, Canadian, etc.
  * Asian: Japanese, Korean, Vietnamese, Thai, Filipino, Indonesian, Indian, Pakistani, Chinese, etc.
  * Hispanic/Latino: Mexican, Colombian, Brazilian, Argentinian, Venezuelan, Peruvian, Cuban, etc.
  * Middle Eastern: Lebanese, Iranian, Turkish, Egyptian, Moroccan, Jordanian, Saudi, Iraqi, etc.
  * Native American: Cherokee, Navajo, Lakota, Inuit, Apache, Cree, Quechua, Maya, etc.
  * Pacific Islander: Hawaiian, Samoan, Fijian, Tongan, Tahitian, Maori, Marshallese, etc.
  * Mixed Race: Choose a thoughtful combination (e.g., Korean-Irish, Nigerian-German, Mexican-Japanese, etc.)
- Create an authentic, respectful character representation based on the selected race and ethnicity

GAME COMPLETION MESSAGE REQUIREMENTS:
- Create a congratulatory message that ties the villain's story to the geographic/thematic connections
- Should celebrate the player's detective work and highlight what they learned
- Keep it brief and encouraging
- Age-appropriate for elementary school students

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
    "race": "racial background (Black, White, Asian, Hispanic/Latino, Middle Eastern, Native American, Pacific Islander, or Mixed Race)",
    "ethnicity": "specific ethnic/cultural background (e.g., Nigerian, Japanese, Mexican, Lebanese, Cherokee, etc.)",
    "distinctiveFeature": "unique physical trait",
    "clothingDescription": "detailed modern everyday clothing (jeans, t-shirt, jacket, sneakers, etc. - NO costumes, uniforms, or sci-fi outfits)"
  },
  "caseDetails": {
    "title": "Case title (max 6 words)",
    "summary": "Kid-friendly crime story (3-4 sentences) using simple language appropriate for ages 10+. Focus on puzzles, treasure hunts, or harmless pranks rather than serious crimes.",
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
    "objective": "FINAL_OBJECTIVE_PLACEHOLDER",
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

    // Dynamic context (variable data that cannot be cached)
    const dynamicContext = `
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

Replace FINAL_OBJECTIVE_PLACEHOLDER in the JSON template with: ${context.finalObjective || 'WHERE_STASHED'}`;

    // Replace race placeholder with the selected race
    const staticInstructionsWithRace = staticInstructions.replace('{RACE_PLACEHOLDER}', selectedRace);
    const fullPrompt = staticInstructionsWithRace + dynamicContext;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: fullPrompt
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
    
    // Static cacheable instructions for turn clues (put at top for caching)
    const staticTurnInstructions = `Generate turn-by-turn clues for this 3+1 detective game. Create engaging narratives and varied clue types. Return response in JSON format.

REQUIREMENTS:
- Turn 1 MUST include: theme reveal + one pattern recognition clue for each city (using emoji sequences)
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

CLUE SPECIFICITY REQUIREMENTS:
- AVOID generic clues like "this city has a very popular festival" that could apply to many places
- BE MORE SPECIFIC but without revealing the location name
- Use distinctive geographic, cultural, or historical features that narrow down possibilities
- Examples of GOOD specific clues:
  * "This city sits where Europe's longest river meets the sea"
  * "This capital was built on seven hills and houses one of the world's oldest metro systems"
  * "This port city is famous for its centuries-old spice markets and bridges spanning a strait between two continents"
- Examples of BAD generic clues to AVOID:
  * "This city has a famous festival" (too many cities have festivals)
  * "This place is known for its food" (too generic)
  * "This city has beautiful architecture" (applies to many cities)

CLUE DISTRIBUTION RULES:
- Turn 1 MUST have 4 clues: 1 theme + 3 pattern recognition clues (one for each city)
- Turn 2 MUST have 4 clues: 1 image + 3 location-specific clues 
  🚨 CRITICAL: EXACTLY 1 clue for location 1, EXACTLY 1 clue for location 2, EXACTLY 1 clue for location 3
  🚨 NEVER generate multiple clues for the same location in Turn 2
- Turn 3 MUST have 4 clues: 1 image + 3 location-specific clues
  🚨 CRITICAL: EXACTLY 1 clue for location 1, EXACTLY 1 clue for location 2, EXACTLY 1 clue for location 3  
  🚨 NEVER generate multiple clues for the same location in Turn 3
- Turn 4 MUST have 6 clues: 3 distance clues (for each location pair) + 3 time difference clues
- Turn 5 MUST have country clues: one clue about each country the cities are in
- Turn 6: NO CLUES GENERATED (puzzle interface handles this)
- Turn 7: NO CLUES GENERATED (puzzle interface handles this)
- NO images in turns 1, 4, 5, 6, or 7

TURN 1 SPECIFIC REQUIREMENTS:
- MUST include theme clue
- MUST include 3 pattern recognition clues using emoji sequences with descriptive terms
- Each pattern uses EXACTLY 2 emojis that represent the city's lesser-known cultural features
- One emoji MUST be a specific local food, the other MUST be a unique cultural symbol
- Each emoji MUST have 1-2 word description after it
- Pattern clues should be challenging but solvable with cultural knowledge
- Examples:
  * "🐉 Wawel Dragon 🥟 Pierogi" = Krakow (dragon legend + Polish dumplings)
  * "🛺 Tuk-tuk 🍜 Tom Yum" = Bangkok (iconic transport + Thai soup)
  * "⚪ White Tower 🥙 Gyros" = Thessaloniki (Byzantine tower + Greek food)
  * "🏺 Azulejos 🍷 Port Wine" = Porto (ceramic tiles + fortified wine)
  * "🏁 Paris-Dakar 🍛 Thieboudienne" = Dakar (rally finish + Senegalese dish)
- Focus on lesser-known cultural symbols specific to that city
- Avoid generic symbols (🏢 for buildings, 🌊 for any coastal city)
- Format: Present ONLY the pattern without any prefix, just "[emoji] [description] [emoji] [description]"

TURN 4 SPECIFIC REQUIREMENTS:
- MUST include 3 distance clues: Location 1↔2, Location 1↔3, Location 2↔3
- MUST include 3 time difference clues showing hours between each location pair
- TIME DIFFERENCE CLUE FORMAT: 
  * CONTENT field: Use the hour number as content (e.g., "6 hours")
  * DESCRIPTION field: MUST include readable format "Location X is Y hours ahead/behind Location Z"
  * Examples: 
    - content: "6 hours", description: "Location 1 is 6 hours ahead of Location 2"
    - content: "3 hours", description: "Location 3 is 3 hours behind Location 1"
  * Use "Location 1", "Location 2", "Location 3" in descriptions, not actual city names
  * CRITICAL: Every time_difference clue MUST have both content AND description fields populated
- NO other clues in Turn 4 - only distances and time differences

TURN 5 SPECIFIC REQUIREMENTS:
- MUST include EXACTLY 3 country clues: one clue about each country the cities are in
- Country clues can be about currency, flag features, geography, history, culture, language, or other well-known country facts
- Examples: "This country uses the Euro currency", "This nation's flag features a red maple leaf", "This country is famous for its fjords"
- DO NOT mention specific country names - use descriptive clues about the countries
- CRITICAL: When describing flags, use the EXACT country names from the location data to ensure accuracy
- NO additional clues in Turn 5 - only the 3 country clues
- NO 4th location hints in Turn 5

TURN STRUCTURE:
- Turn 1: Theme reveal + pattern recognition clues (3 emoji patterns, one per city) - NO images
- Turn 2: First image (as per imageStrategy) + 3 location-specific clues (EXACTLY 1 clue for location 1, EXACTLY 1 clue for location 2, EXACTLY 1 clue for location 3) - NO distance/timezone clues
- Turn 3: Second image (as per imageStrategy) + 3 location-specific clues (EXACTLY 1 clue for location 1, EXACTLY 1 clue for location 2, EXACTLY 1 clue for location 3) - NO distance/timezone clues
- Turn 4: ALL distances between locations + ALL time differences (NO other clues, NO images)
- Turn 5: ONLY country clues (exactly 3 clues, one for each country) - NO other clues, NO images
- Turn 6: NO CLUES - handled by puzzle interface
- Turn 7: NO CLUES - handled by puzzle interface

CLUE TYPES TO USE:
- theme, pattern_recognition, distance, timezone, time_difference, image (required)
- climate, terrain, borders, language, cultural_event, physical_evidence
- witness, comparison, elimination, location_puzzle, educational
- triangulation, psychological_profile, intercepted_communication
- historical_connection, final_evidence, country

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

EXAMPLE TIME_DIFFERENCE CLUE:
{
  "type": "time_difference",
  "content": "6 hours",
  "description": "Location 1 is 6 hours ahead of Location 2",
  "locationPositions": null,
  "data": {
    "between": [1, 2],
    "hours": 6
  }
}

MANDATORY TURN 2 STRUCTURE EXAMPLE:
{
  "turn": 2,
  "narrative": "Turn 2 narrative",
  "clues": [
    {
      "type": "image",
      "content": "Image description",
      "description": "Security footage shows...",
      "locationPositions": [1],
      "data": {"imageLevel": "obscured", "villainElement": "security_footage"}
    },
    {
      "type": "climate",
      "content": "Climate clue content",
      "description": "This location has...",
      "locationPositions": [1],
      "data": {}
    },
    {
      "type": "terrain",
      "content": "Terrain clue content", 
      "description": "This place features...",
      "locationPositions": [2],
      "data": {}
    },
    {
      "type": "cultural_event",
      "content": "Cultural clue content",
      "description": "This city hosts...",
      "locationPositions": [3],
      "data": {}
    }
  ]
}

NOTE: In this example, Location 1 gets the image + climate clue, Location 2 gets terrain clue, Location 3 gets cultural clue. ALL THREE LOCATIONS ARE COVERED.

MANDATORY TURN 5 STRUCTURE EXAMPLE:
{
  "turn": 5,
  "narrative": "Turn 5 narrative",
  "clues": [
    {
      "type": "country",
      "content": "Country clue about location 1's country",
      "description": "This country uses the Euro currency",
      "locationPositions": [1],
      "data": {}
    },
    {
      "type": "country",
      "content": "Country clue about location 2's country", 
      "description": "This nation's flag features a red maple leaf",
      "locationPositions": [2],
      "data": {}
    },
    {
      "type": "country",
      "content": "Country clue about location 3's country",
      "description": "This country is famous for its fjords",
      "locationPositions": [3],
      "data": {}
    }
  ]
}

NOTE: In this example, Location 1 gets a country clue, Location 2 gets a country clue, Location 3 gets a country clue. Each clue is about the SPECIFIC COUNTRY where that location is situated.

CRITICAL: Every clue MUST include a "data" field, even if it's just an empty object {}. Use specific geographic features for educational value.

Generate ONLY 5 turns (NOT 7). Do not generate turns 6 and 7. Make sure to include:
- Turn 1: Theme + 3 pattern recognition clues (emoji sequences for each city) - 4 clues total
- Turn 2: 1 image + 3 location-specific clues - 4 clues total, NO distance/timezone clues
  🚨 MANDATORY: One clue each for Location 1, Location 2, Location 3 (including the image clue)
- Turn 3: 1 image + 3 location-specific clues - 4 clues total, NO distance/timezone clues  
  🚨 MANDATORY: One clue each for Location 1, Location 2, Location 3 (including the image clue)
- Turn 4: ALL 3 distance calculations + ALL 3 time differences ONLY - 6 clues total
- Turn 5: ONLY 3 country clues (exactly one for each country) - 3 clues total, no other clues
- DO NOT GENERATE TURN 6 OR TURN 7
- Images in the turns specified by imageStrategy (turns 2 and 3 ONLY)

🚨 FINAL VERIFICATION: Before submitting your response, double-check Turn 2, Turn 3, and Turn 5:
- Are there clues with locationPositions [1], [2], AND [3] in each turn?
- Is no location getting more than one clue (excluding the image) per turn?
- Does Turn 5 have exactly 3 country clues with locationPositions [1], [2], and [3]?
- If you see multiple clues for the same location, you MUST fix this before responding.

ABSOLUTE MANDATORY CLUE DISTRIBUTION FOR TURNS 2 AND 3:
🚨 CRITICAL ERROR PREVENTION: You have been generating ALL clues for the same location. This is WRONG.

STRICT ENFORCEMENT RULE:
- Turn 2 MUST have: 1 image + 1 clue about Location 1 + 1 clue about Location 2 + 1 clue about Location 3
- Turn 3 MUST have: 1 image + 1 clue about Location 1 + 1 clue about Location 2 + 1 clue about Location 3

WRONG EXAMPLE (DO NOT DO THIS):
Turn 2: [image about Location 1, climate about Location 1, terrain about Location 1, cultural_event about Location 1] ❌

CORRECT EXAMPLE (DO THIS):
Turn 2: [image about Location 1, climate about Location 1, terrain about Location 2, cultural_event about Location 3] ✅

VERIFICATION CHECKLIST FOR EACH TURN:
Before finalizing Turn 2 and Turn 3, verify:
- ✓ Does clue 1 relate to the image location?
- ✓ Does clue 2 have locationPositions: [1]?
- ✓ Does clue 3 have locationPositions: [2]?
- ✓ Does clue 4 have locationPositions: [3]?
- ✓ Are all three locations covered by separate clues?

Before finalizing Turn 5, verify:
- ✓ Does clue 1 have locationPositions: [1]?
- ✓ Does clue 2 have locationPositions: [2]?
- ✓ Does clue 3 have locationPositions: [3]?
- ✓ Are all three countries covered by separate clues?

If ANY clue has the same locationPositions as another clue in the same turn, you have FAILED this requirement.

COUNTRY DATA REFERENCE:
Use the country names from the gameData.locations array to ensure accurate flag descriptions:
- Location 1 country: gameData.locations[0].country
- Location 2 country: gameData.locations[1].country  
- Location 3 country: gameData.locations[2].country

🚨 CRITICAL FLAG ACCURACY WARNING:
When creating flag clues, you MUST use factually correct flag descriptions. DO NOT invent or guess flag features.
- South Africa: Y-shaped design with six colors (no eagles, no golden sun)
- Only describe flags you are 100% certain about
- If uncertain about flag details, use other country features (currency, geography, culture, language)
- Examples of safe country clues: "uses the Euro currency", "home to the Great Wall", "famous for its maple syrup"`;

    // Dynamic context for turn clues (variable data that cannot be cached)
    const dynamicTurnContext = `
Game Data:
${JSON.stringify(enhancedGameData, null, 2)}`;

    const fullTurnPrompt = staticTurnInstructions + dynamicTurnContext;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: fullTurnPrompt
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
        villainRace: gameContent.villainProfile.race,
        villainEthnicity: gameContent.villainProfile.ethnicity,
        villainDistinctiveFeature: gameContent.villainProfile.distinctiveFeature,
        villainClothingDescription: gameContent.villainProfile.clothingDescription,
        caseTitle: gameContent.caseDetails.title,
        crimeSummary: gameContent.caseDetails.summary,
        interestingFact: '', // Remove redundant field - use finalLocationV2.interestingFact instead
        finalLocationObjective: gameContent.finalLocation.objective,
        finalLocationNarrative: gameContent.finalLocation.narrative,
        finalInterestingFact: '', // Remove redundant field - use finalLocationV2.interestingFact instead
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
    
    // Generate puzzle content for final location
    const puzzleData = await generateFinalLocationPuzzle(
      gameContent.finalLocation.location,
      gameContent.theme,
      gameContent.locations
    );
    
    // Create final location with puzzle fields
    await prisma.finalLocationV2.create({
      data: {
        gameV2Id: gameId,
        name: gameContent.finalLocation.location.name,
        country: gameContent.finalLocation.location.country,
        latitude: parseFloat(gameContent.finalLocation.location.latitude) || 0.0,
        longitude: parseFloat(gameContent.finalLocation.location.longitude) || 0.0,
        educationalPhrase: puzzleData.educationalPhrase,
        categoryHint: puzzleData.categoryHint,
        interestingFact: puzzleData.interestingFact,
        flagColors: puzzleData.flagColors,
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
      // Provide fallback narrative if OpenAI didn't generate one
      let narrative = turnData.narrative;
      if (!narrative) {
        switch (turnData.turn) {
          case 1:
            narrative = "The case begins. Your first clues reveal the villain's crime pattern and locations of interest.";
            break;
          case 2:
            narrative = "Evidence emerges from the first crime scene. Visual clues and location details start forming a pattern.";
            break;
          case 3:
            narrative = "More evidence surfaces from the second crime scene. The villain's trail becomes clearer.";
            break;
          case 4:
            narrative = "Geographic analysis reveals the distances and time differences between all locations. These measurements are crucial for tracking the villain's movements.";
            break;
          case 5:
            narrative = "Final evidence from the crime scenes reveals important details about the countries involved.";
            break;
          default:
            narrative = `Turn ${turnData.turn}: Continue following the evidence trail.`;
        }
        console.log(`⚠️ Using fallback narrative for turn ${turnData.turn}: ${narrative}`);
      }
      
      const gameplayTurn = await prisma.gameplayTurn.create({
        data: {
          gameV2: {
            connect: { id: gameId }
          },
          turn: turnData.turn,
          narrative: narrative,
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
    try {
      await generateLocationImagesV2Individual(gameId, gameContent, locationRecords);
    } catch (imageError) {
      console.error('Image generation failed, but game content is complete:', imageError);
      // Continue to completion even if images fail since game is playable
    }
    
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