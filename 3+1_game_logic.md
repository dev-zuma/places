# 3+1 Game Logic Specification

## Overview
This specification defines the new "3+1" game format for Worldwide Chase, where players:
1. Identify 3 crime locations over 5 turns (existing mechanic)
2. Use those locations to deduce a 4th "final location" over 2 additional turns (new mechanic)

The final location represents various objectives: where stolen goods are hidden, the villain's next target, their hideout, etc.

## Database Schema (New Tables)

### GameV2
Primary game entity for the new format.

```prisma
model GameV2 {
  id                String    @id @default(cuid())
  
  // Basic game info
  theme             String    // e.g., "DIAMOND HEISTS"
  phrase            String    // e.g., "Brilliance in the shadows"
  category          String    // e.g., "Geography"
  difficulty        String    // "easy", "medium", "hard"
  
  // Publishing
  isPublished       Boolean   @default(false)
  publishedAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Villain details
  villainName       String    // e.g., "Scarlett 'The Cutter' Vanderbilt"
  villainTitle      String    // e.g., "The Diamond District Ghost"
  villainGender     String    // "male" or "female"
  villainAge        String    // e.g., "early 40s"
  villainEthnicity  String    // e.g., "Anglo-American"
  villainDistinctiveFeature String // e.g., "Always wears blood-red lipstick"
  villainClothingDescription String // Detailed outfit description
  villainImageUrl   String?   // S3 URL for villain portrait
  
  // Case details
  caseTitle         String    // e.g., "The Flawless Collection Conspiracy"
  crimeSummary      String    // Full crime story
  interestingFact   String    // Educational fact about the 3 locations
  
  // Final location details
  finalLocationObjective String // "WHERE_STASHED", "NEXT_TARGET", "VILLAIN_HIDEOUT", etc.
  finalLocationNarrative String // Narrative explaining what player needs to find
  
  // Game completion
  finalInterestingFact String  // "Aha moment" fact revealed after solving entire case
  gameCompletionMessage String // Congratulatory message tying everything together
  
  // Relations
  locationsV2       LocationV2[]
  finalLocationV2   FinalLocationV2?
  gameplayTurns     GameplayTurn[]
  generationV2      GenerationV2?
  playerCasesV2     PlayerCaseV2[]
}
```

### LocationV2
The 3 crime scene locations.

```prisma
model LocationV2 {
  id              String   @id @default(cuid())
  gameV2Id        String
  position        Int      // 1, 2, or 3
  
  // Geographic data
  name            String   // City or Country name
  country         String   // Country (same as name if country-level)
  latitude        Float
  longitude       Float
  timezoneOffset  Float    // Can be decimal (e.g., 5.5 for India)
  timezoneName    String   // e.g., "Asia/Kolkata"
  
  // Content
  landmarks       String   // JSON array of landmarks
  additionalData  String?  // JSON for extra location-specific data (olympic year, etc.)
  
  // Images (only 3 total images across all locations in a game)
  hasImage        Boolean  @default(false)
  imageUrl        String?  // S3 URL if this location has an image
  imageTurn       Int?     // Which turn this image is revealed (1-5)
  imageLevel      String?  // "obscured", "medium", "clear"
  villainElement  String?  // How villain is integrated: "security_footage", "belongings", etc.
  
  gameV2          GameV2   @relation(fields: [gameV2Id], references: [id], onDelete: Cascade)
  
  @@unique([gameV2Id, position])
}
```

### FinalLocationV2
The 4th location players must deduce.

```prisma
model FinalLocationV2 {
  id              String   @id @default(cuid())
  gameV2Id        String   @unique
  
  // Location data
  name            String   // City or Country name
  country         String
  latitude        Float
  longitude       Float
  
  // Context
  reason          String   // Why this location (narrative explanation)
  clueConnections String   // JSON array of how it connects to the 3 locations
  
  gameV2          GameV2   @relation(fields: [gameV2Id], references: [id], onDelete: Cascade)
}
```

### GameplayTurn
Stores all clues for each turn of the game.

```prisma
model GameplayTurn {
  id              String   @id @default(cuid())
  gameV2Id        String
  turn            Int      // 1-7 (5 for locations, 2 for final)
  
  // Content
  narrative       String   // Turn introduction narrative
  isFinalLocation Boolean  @default(false) // true for turns 6-7
  
  // Relations
  gameV2          GameV2   @relation(fields: [gameV2Id], references: [id], onDelete: Cascade)
  clues           Clue[]
  
  @@unique([gameV2Id, turn])
}
```

### Clue
Individual clues within each turn.

```prisma
model Clue {
  id              String        @id @default(cuid())
  gameplayTurnId  String
  orderIndex      Int           // Order within the turn
  
  // Clue details
  type            String        // See clue types below
  content         String?       // Main clue content
  description     String?       // Additional context
  data            String        // JSON for type-specific data
  
  gameplayTurn    GameplayTurn  @relation(fields: [gameplayTurnId], references: [id], onDelete: Cascade)
  
  @@unique([gameplayTurnId, orderIndex])
}
```

### GenerationV2
Tracks async generation progress.

```prisma
model GenerationV2 {
  id              String    @id @default(cuid())
  gameV2Id        String    @unique
  status          String    // "pending", "generating", "completed", "failed"
  currentStep     String?   // Current generation step
  totalSteps      Int       @default(20) // More steps for turn-by-turn generation
  completedSteps  Int       @default(0)
  error           String?
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  
  gameV2          GameV2    @relation(fields: [gameV2Id], references: [id], onDelete: Cascade)
}
```

### PlayerCaseV2
Tracks player progress on V2 games.

```prisma
model PlayerCaseV2 {
  id                String    @id @default(cuid())
  playerId          String
  gameV2Id          String
  
  // Progress tracking
  solvedLocations   Boolean   @default(false) // Solved first 3
  solvedFinal       Boolean   @default(false) // Solved 4th location
  solvedAt          DateTime?
  turnsUsed         Int?      // Total turns to complete
  pointsEarned      Int?      // Points for this case
  
  player            Player    @relation(fields: [playerId], references: [id])
  gameV2            GameV2    @relation(fields: [gameV2Id], references: [id])
  
  @@unique([playerId, gameV2Id])
}
```

## Clue Types

### Standard Clue Types
```typescript
type ClueType = 
  // Core clues (required in every game)
  | "theme"           // Theme revelation
  | "distance"        // Distance between locations
  | "timezone"        // UTC offset for a location
  | "time_difference" // Hours between locations
  | "image"           // Location image with villain integration
  
  // Geographic clues
  | "climate"         // Weather/temperature data
  | "terrain"         // Elevation, landscape
  | "borders"         // Neighboring countries
  | "coordinates"     // Partial lat/long
  
  // Cultural clues
  | "language"        // Local language hints
  | "currency"        // Monetary system
  | "cultural_event"  // Festivals, traditions
  | "historical"      // Historical dates/events
  
  // Investigation clues
  | "physical_evidence" // Items found at scene
  | "witness"         // Witness statements
  | "villain_trace"   // Villain's belongings
  
  // Connection clues
  | "comparison"      // Similarities between locations
  | "elimination"     // What locations are NOT
  | "pattern"         // Sequences or patterns
  
  // Special clues
  | "breakthrough"    // Major revelation (Turn 4)
  | "location_puzzle" // Location-based puzzles
  | "educational"     // Learning moments
  
  // Final location clues (Turns 6-7)
  | "triangulation"   // Geographic analysis
  | "psychological_profile" // Villain behavior
  | "intercepted_communication" // Messages/calls
  | "historical_connection" // Historical links
  | "final_evidence"  // Direct evidence
  
  // Game completion clues (After solving)
  | "final_interesting_fact" // Ultimate "aha moment" about the theme/connections
  | "case_wrap_up"    // Final congratulatory message
```

### Clue Data Structure Examples

```javascript
// Distance clue
{
  type: "distance",
  content: null,
  description: "Trans-Atlantic journey",
  data: {
    between: [1, 2],  // Location positions
    kilometers: 10930,
    miles: 6793
  }
}

// Image clue with villain integration
{
  type: "image",
  content: null,
  description: "Blurred CCTV showing suspect near display case",
  data: {
    locationPosition: 2,
    imageLevel: "obscured",
    villainElement: "security_footage"
  }
}

// Time difference clue
{
  type: "time_difference",
  content: "Location 2 is 4.5 hours ahead of Location 1",
  description: null,
  data: {
    between: [1, 2],
    hours: 4.5
  }
}

// Final interesting fact clue (shown after solving)
{
  type: "final_interesting_fact",
  content: "Amazing discovery! These three countries actually share an incredible connection: they're all home to the world's most famous diamond mines that produce different colored diamonds - white diamonds, pink diamonds, and yellow diamonds respectively!",
  description: "The ultimate educational payoff",
  data: {
    category: "geological",
    theme_connection: "diamond_formation"
  }
}
```

## OpenAI Prompt Structure

### Phase 1: Generate Core Game Content

```javascript
const generateGameContentV2 = async (context) => {
  const prompt = `Generate a geography-based detective game using the new 3+1 format where players track a villain across 3 connected locations, then use those to deduce a 4th final location.

User Input:
${context.userInput ? `Theme/Description: ${context.userInput}` : 'No specific input - choose an interesting theme'}
${context.specificLocations ? `Specific Locations: ${context.specificLocations}` : ''}
Difficulty: ${context.difficulty}

GAME STRUCTURE:
- Turns 1-5: Players identify 3 crime scene locations
- Turns 6-7: Players deduce the 4th "final" location

CRITICAL LOCATION RULES:
- Pick EITHER all cities OR all countries (never mix)
- ONLY use major cities or sovereign nations
- The 4th location should connect thematically/narratively (NOT geographically equidistant)

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

FINAL LOCATION OBJECTIVES (choose one):
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
- BLACKMAIL_TARGET: Where the villain is extorting someone
- COPYCAT_LOCATION: Where someone is copying the villain's methods
- VICTIM_CONNECTION: Location connected to the villain's victims
- CRIME_ORIGIN: Where the villain first learned their criminal skills
- FAMILY_TIES: Where the villain's family/personal connections are
- RETIREMENT_PLAN: Where the villain plans to retire with their loot

### Example Objective Applications:

**VILLAIN_HOMETOWN**: "Art thief targets museums in three major cities, but analysis shows they're moving in a pattern toward their childhood home where they first fell in love with art."

**ACCOMPLICE_LOCATION**: "The mastermind has been coordinating heists across three continents, but we've discovered they have a partner who's been fencing the stolen goods in a fourth location."

**ESCAPE_ROUTE**: "The international smuggler has hit three ports, and intelligence suggests they're planning to disappear to a neutral country where they can't be extradited."

**TREASURE_DESTINATION**: "The artifact collector has been stealing from three ancient sites, but where is the private buyer who commissioned these specific pieces?"

**VILLAIN_INSPIRATION**: "The copycat criminal has been recreating famous heists from three different cities, but which location inspired their entire criminal career?"

**FINAL_HEIST**: "The serial thief has been practicing on three smaller targets, but satellite imagery shows they're planning one massive score at a fourth location."

**CRIME_ORIGIN**: "The international forger learned their techniques somewhere special - following their crime pattern across three countries leads back to where they first studied their craft."

**FAMILY_TIES**: "The villain's crime spree across three nations isn't random - they're trying to reach a family member who's been hiding in a fourth location."

### Objective Selection Guidelines:

**For Educational Themes** (space, art, history):
- VILLAIN_INSPIRATION: Links to where they learned about the subject
- CRIME_ORIGIN: Where they studied or trained
- FINAL_HEIST: The ultimate prize in their field

**For Geographic Themes** (climate, landmarks, cultures):
- VILLAIN_HOMETOWN: Their cultural background
- ESCAPE_ROUTE: Geographic refuge or sanctuary
- FAMILY_TIES: Cultural/ancestral connections

**For Adventure/Mystery Themes** (treasure, exploration):
- WHERE_STASHED: Hidden treasure location
- TREASURE_DESTINATION: Where they're delivering goods
- ACCOMPLICE_LOCATION: Partner in crime

**For Kid-Friendly Themes** (food, music, sports):
- NEXT_TARGET: Where they'll strike next
- VILLAIN_HIDEOUT: Where they're planning
- RETIREMENT_PLAN: Where they dream of going

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
    "clothingDescription": "detailed outfit"
  },
  "caseDetails": {
    "title": "Case title (max 6 words)",
    "summary": "Crime story (3-4 sentences)",
    "interestingFact": "Educational fact about the 3 locations",
    "finalInterestingFact": "Ultimate 'aha moment' fact revealed after solving the entire case - a deeper, more surprising connection between all 4 locations (including the final one) that provides educational value and a satisfying conclusion",
    "gameCompletionMessage": "Congratulatory message that ties the villain's story to the geographic/thematic connections"
  },
  "locations": [
    {
      "position": 1,
      "name": "City/Country name",
      "country": "Country name",
      "latitude": 0.0,
      "longitude": 0.0,
      "timezoneOffset": 0.0,
      "timezoneName": "TZ",
      "landmarks": ["landmark1", "landmark2", "landmark3"],
      "additionalData": {} // Optional theme-specific data
    }
  ],
  "finalLocation": {
    "objective": "WHERE_STASHED/NEXT_TARGET/etc",
    "narrative": "What the player needs to find",
    "location": {
      "name": "City/Country name",
      "country": "Country name",
      "latitude": 0.0,
      "longitude": 0.0,
      "reason": "Why this location makes sense",
      "connections": ["How it connects to crime pattern", "Thematic link", "Character motivation"]
    }
  },
  "imageStrategy": {
    "totalImages": 3,
    "placements": [
      {"turn": 1, "location": 2, "level": "obscured", "villainElement": "security_footage"},
      {"turn": 3, "location": 1, "level": "medium", "villainElement": "belongings"},
      {"turn": 5, "location": 3, "level": "clear", "villainElement": "reflection"}
    ]
  }
}`;

  // Call OpenAI API...
};
```

### Phase 2: Generate Turn-by-Turn Clues

```javascript
const generateTurnClues = async (gameData) => {
  const prompt = `Generate turn-by-turn clues for this detective game. Create engaging narratives and varied clue types.

Game Data:
${JSON.stringify(gameData, null, 2)}

REQUIREMENTS:
- Every game MUST include: theme reveal, all distances, all timezones, time differences, breakthrough clue, and the 3 images
- Distribute clues strategically across turns
- Build suspense and difficulty appropriately
- Final 2 turns focus on deducing the 4th location
- Use simple, clear language appropriate for ages 10+ (elementary school level)
- Keep narratives fun and engaging, avoid scary or violent themes
- Focus on adventure, mystery, and learning

For each turn, generate:
{
  "turns": [
    {
      "turn": 1,
      "narrative": "Opening narrative",
      "clues": [
        {
          "type": "clue_type",
          "content": "Main content (can be null)",
          "description": "Context/description (can be null)",
          "data": {} // Type-specific data
        }
      ]
    }
  ]
}

TURN STRUCTURE:
- Turn 1: Theme + first image + initial clues
- Turn 2: Focus on timezone/time differences
- Turn 3: Distances + second image + patterns
- Turn 4: Breakthrough clue + connections
- Turn 5: Final image + concluding location clues
- Turn 6: First final location clues
- Turn 7: Decisive final location clues`;

  // Call OpenAI API...
};
```

## Admin Portal Implementation

### New Routes

```javascript
// server-unified.js additions

// Create new V2 game
app.post('/api/v2/games/generate', async (req, res) => {
  const { userInput, specificLocations, difficulty } = req.body;
  
  // Create game record
  const game = await prisma.gameV2.create({
    data: { 
      theme: 'PENDING',
      phrase: 'Generating...',
      category: 'Geography',
      difficulty: difficulty || 'medium',
      // ... minimal fields
    }
  });
  
  // Start async generation
  generateGameV2Async(game.id, { userInput, specificLocations, difficulty });
  
  res.json({ gameId: game.id, status: 'generating' });
});

// Get V2 game generation status
app.get('/api/v2/games/:id/status', async (req, res) => {
  const generation = await prisma.generationV2.findUnique({
    where: { gameV2Id: req.params.id }
  });
  res.json(generation);
});

// Get all V2 games
app.get('/api/v2/games', async (req, res) => {
  const games = await prisma.gameV2.findMany({
    include: {
      locationsV2: true,
      finalLocationV2: true,
      gameplayTurns: {
        include: { clues: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(games);
});
```

### New Admin Pages

1. **generate-v2.html** - New game generation form
   - Similar to current form but with final location options
   - Additional fields for objective type selection
   - Progress tracking for more generation steps

2. **games-v2.html** - V2 games management
   - List all V2 games
   - Preview turn-by-turn structure
   - Publish/unpublish controls
   - Migration tools to convert old games

3. **game-details-v2.html** - Detailed V2 game view
   - Full turn-by-turn preview
   - Clue distribution visualization
   - Test play interface
   - Edit capabilities for narratives

## Generation Process Flow

1. **User submits generation request**
   - Theme/locations input
   - Difficulty selection
   - Final location objective type

2. **Phase 1: Core content generation**
   - Call OpenAI for game structure
   - Create database records
   - Generate villain portrait

3. **Phase 2: Turn-by-turn generation**
   - Call OpenAI for clue distribution
   - Validate required clues present
   - Store in GameplayTurn/Clue tables

4. **Phase 3: Image generation**
   - Generate 3 images based on strategy
   - Include villain elements as specified
   - Upload to S3

5. **Phase 4: Validation**
   - Ensure all required clues present
   - Verify turn progression logic
   - Check final location connectivity

## Migration Strategy

1. Keep existing tables/functionality intact
2. Add "V2" suffix to all new entities
3. Implement parallel systems
4. Gradual migration of frontend
5. Eventually deprecate V1 tables

## Testing Considerations

- Validate all clue types properly stored
- Ensure turn progression makes sense
- Test various final location objectives
- Verify image distribution strategies
- Check difficulty progression

## Game Completion Flow

After players successfully solve both the 3 crime locations AND the final location, they should receive:

1. **Immediate Success Feedback**: Congratulatory message confirming they solved the case
2. **Final Interesting Fact**: The ultimate "aha moment" revealing the deeper connection between all 4 locations
3. **Game Completion Message**: Narrative wrap-up that ties the villain's story to the geographic/thematic connections
4. **Educational Value**: Players leave feeling they learned something fascinating and unexpected

### Example Completion Sequence:
```
🎉 CASE SOLVED! 
You've successfully identified all three crime scenes AND found Viktor's secret warehouse!

🧠 FINAL DISCOVERY:
"Amazing! These four locations are all connected by something incredible - they're all home to the world's most famous space launch facilities that sent the first missions to different planets: Mars, Venus, Jupiter, and the Moon! Each location represents humanity's greatest leaps into space exploration."

👮 CASE CLOSED:
"Detective, your brilliant work has led us to recover all the stolen Olympic memorabilia and capture Viktor 'The Torch' Olympus. His obsession with Olympic glory across different continents ultimately led to his downfall. The artifacts are now safely returned to their rightful museums, and the Olympic legacy lives on!"

📚 You've earned 50 points and unlocked the "Space Detective" achievement!
```

This provides closure, education, and a satisfying conclusion that makes players feel smart and accomplished.

---

This specification provides the foundation for implementing the new 3+1 game format while maintaining the existing system during transition.