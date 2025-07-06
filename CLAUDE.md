# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Worldwide Chase** is a geography-themed detective game where players solve crime cases by identifying 3 connected locations based on thematic clues and progressively revealed visual evidence. Each case features AI-generated villains, crime narratives, and educational geography content presented in an authentic detective case file interface. This is a production-ready web application built with modern technologies.

## Repository Status

- **GitHub Repository**: https://github.com/dev-zuma/places
- **Current Phase**: Complete Detective System (All Phases COMPLETED)
- **Production Status**: Ready for deployment and user testing
- **Last Updated**: 2025-07-06
- **Interface**: Authentic detective case file experience with retro styling

## Project Structure

```
places/
├── CLAUDE.md           # This file - project guidance
├── server-unified.js   # Main production server (admin + game + API)
├── start-server.bat    # Windows batch file to start server
├── test-villain-styles.html # Villain portrait testing tool
├── package.json        # Node.js dependencies
├── package-lock.json   # Dependency lock file
├── .env               # Environment variables (API keys)
├── prisma/            # Database ORM
│   ├── schema.prisma  # Database schema definition
│   ├── dev.db        # SQLite development database
│   └── migrations/   # Database migration files
├── admin/             # Admin portal UI (Content Management)
│   ├── index.html    # Admin dashboard
│   ├── generate.html # Game generation page
│   ├── games.html    # Games management page
│   ├── game-details.html # Game details view
│   └── styles.css    # Admin portal styles
├── game/              # Frontend game system (Player Experience)
│   ├── index.html    # Case gallery & browsing
│   ├── detective.html # Detective case file interface (MAIN GAME)
│   └── wwc-logo.png  # Worldwide Chase logo
├── mockups/          # UI mockup designs & prototypes (reference)
│   ├── index.html    # Gallery view of all mockups
│   ├── shared-styles.css # Common styles and theme colors
│   ├── mockup-22-compact-fixed.html # Original geography game design
│   └── mockup-23-detective-file.html # Detective file interface prototype
├── history/          # Static history page
├── result/           # Static result page
├── public/           # Static assets
│   └── wwc-logo.png
└── .gitignore
```

## Tech Stack

### Backend (Complete System - Production Ready)
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM
- **AI Integration**: OpenAI API (GPT-4o-mini + GPT-Image-1) - fully integrated
- **Storage**: AWS S3 for images - fully integrated
- **Dependencies**: cors, body-parser, dotenv, @prisma/client, openai, @aws-sdk/client-s3

### Frontend (Complete System - Production Ready)
- **Framework**: Vanilla JavaScript (ES6+) with modern CSS
- **UI Library**: Custom detective interface components
- **Typography**: Courier New monospace for authentic case file feel
- **Styling**: CSS3 with authentic case file backgrounds, glass morphism
- **State**: Vanilla JS state management with timer functionality
- **Responsive**: Mobile-first design optimized for touch devices
- **Interactive**: Image modals, tab switching, evidence collection

### Production-Ready Features
- **Content Management**: Complete admin portal for case creation and management
- **Detective Experience**: Authentic case file interface with evidence collection and timer
- **Case Gallery**: Browse and filter published cases with villain portraits
- **AI-Generated Content**: Realistic villain profiles, crime stories, location images
- **Geographic Education**: Real coordinates, timezones, cultural landmarks
- **Mobile Optimization**: Touch-friendly, ultra-compact design that fits without scrolling
- **Timer System**: 5-minute countdown with visual feedback
- **Evidence Modals**: Click location images to view evidence in detective-style modals

## Development Commands

### Server Management
```bash
# Start the main server
node server-unified.js

# Kill all processes and restart server (when changes are made)
pkill -f "node server-unified.js" && sleep 2 && node server-unified.js &

# Check if server is running
ps aux | grep "node server-unified.js" | grep -v grep

# Windows: Use the batch file
start-server.bat
```

### Database Operations
```bash
# Install dependencies (first time)
npm install

# Initialize database (first time)
npx prisma generate
npx prisma migrate dev

# Start database GUI (optional)
npx prisma studio
```

### Testing & Quality Assurance
**IMPORTANT**: Always use the Playwright MCP Server to test frontend code changes.

```bash
# Test workflow for frontend changes:
# 1. Make code changes
# 2. Restart server: pkill -f "node server-unified.js" && node server-unified.js &
# 3. Use Playwright MCP Server to test at: http://localhost:9091

# Test API endpoints
curl http://localhost:9091/api/cases                           # View published cases
curl -X POST -H "Content-Type: application/json" \           # Generate new case
  -d '{"userInput":"music","difficulty":"medium"}' \
  http://localhost:9091/api/generate

# Always test these areas when making changes:
# 1. Mobile responsiveness (320px to 1024px viewports)
# 2. Detective interface interactions (tabs, timer, evidence modals)
# 3. Case file backgrounds and typography consistency
# 4. Image modal functionality and evidence viewing
# 5. Timer countdown and color change behaviors
```

## Access & Testing

### Quick Start
```bash
# Start the main application
cd /mnt/c/Users/Adnan/Documents/projects/places
node server-unified.js

# Access points:
# Case Gallery:    http://localhost:9091/game/
# Detective Game:  http://localhost:9091/game/detective.html?case=<ID>
# Admin Portal:    http://localhost:9091/admin/
```

### Browser Testing Guidelines
```bash
# IMPORTANT: Always use Playwright MCP Server for testing and viewing updates
# Browser path: /snap/bin/chromium

# Testing workflow example:
Task: "Test detective interface updates"
Prompt: "Start server, open http://localhost:9091/game/, click case, test all features..."
```

### Core Application URLs
```bash
# Player Experience
Case Gallery:     http://localhost:9091/game/                    # Browse all cases
Detective Game:   http://localhost:9091/game/detective.html     # Main game interface

# Content Management  
Admin Portal:     http://localhost:9091/admin/                  # Case management
Admin Dashboard:  http://localhost:9091/admin/index.html       # Statistics
Game Generation:  http://localhost:9091/admin/generate.html    # Create new cases

# Development
Mockups:          http://localhost:9091/mockups/               # Design prototypes
Villain Testing:  http://localhost:9091/test-villain-styles.html # Test villain generation
Database GUI:     http://localhost:5555/                       # Prisma Studio

# API Endpoints
Published Cases:  http://localhost:9091/api/cases              # Game data
All Games:        http://localhost:9091/api/games              # Admin data
Test Villain:     http://localhost:9091/api/test-villain-portrait # Test portraits
```

## AI Image Generation

### Current Configuration
- **Villain Portraits**: GPT-Image-1, medium quality, painterly storybook style
- **Location Images**: GPT-Image-1, medium quality, travel photography style
- **Format**: Base64 → Data URLs (GPT-Image-1 always returns base64)
- **Size**: 1024x1024 for all images
- **Background**: Solid backgrounds (no transparency)

### Villain Portrait Style
```javascript
// Current prompt generates painterly storybook-style portraits
// Gender is randomly assigned for diversity
// 3/4 view, chest-up, confident expression
// Theme-appropriate clothing and accessories
// Muted, elegant color palette suitable for vintage gallery feel
```

## Game Mechanics & Detective Experience

### Core Detective Flow
- **Case Selection**: Browse case gallery with villain portraits and case summaries
- **Investigation Process**: 5-turn evidence collection system
- **Progressive Reveals**: Location images revealed on turns 1, 3, and 5
- **Timer Pressure**: 5-minute countdown creates urgency
- **Evidence Modals**: Click images to examine evidence closely
- **Case File Interface**: Authentic detective documentation experience

### Detective Interface Features
1. **Case Header**: Compact header with logo, case title, theme, and Turn 4 clue
2. **Evidence Collection**: Two-tab system (Case Details + Investigation Board)
3. **Location Cards**: Three location cards with evidence images and input fields
4. **Timer System**: Countdown timer with color-coded urgency
5. **Evidence Modals**: Full-screen evidence viewing with case file styling
6. **Turn Progression**: 5-turn system with visual progress tracking

### Detailed Game Mechanics

#### Location Types & Selection Rules
- **Cities or Countries Only**: Game locations must be either ALL 3 major cities OR ALL 3 sovereign countries
- **No Mixed Types**: Never mix cities and countries in the same game
- **Geographic Diversity**: Locations span different continents/regions when possible
- **Thematic Connection**: All 3 locations relate to the chosen theme (e.g., space exploration → Houston, Cape Canaveral, Baikonur)
- **Educational Value**: Each location teaches players about geography, culture, or landmarks

#### Turn-by-Turn Investigation Process
1. **Turn 1**: 
   - Theme revealed (e.g., "Space Exploration")
   - First evidence images shown (heavily obscured, abstract details)
   - Players begin forming hypotheses about location types
   - Timer starts: 5 minutes countdown

2. **Turn 2**: 
   - Timezone differences revealed for all 3 locations
   - Geographic clues through time zones (e.g., UTC-6, UTC+9, UTC+3)
   - Players can deduce approximate global regions
   - Evidence images remain the same (Turn 1 images)

3. **Turn 3**: 
   - Second evidence images revealed (clearer details, more context)
   - Better visibility of landmarks and architectural features
   - Players can start identifying specific locations
   - Timezone information still available

4. **Turn 4**: 
   - Additional thematic clue revealed (e.g., "LAUNCH" for space theme)
   - Single word or short phrase that connects all locations
   - No new images, but previous evidence can be re-examined
   - Critical turn for making final deductions

5. **Turn 5**: 
   - Final evidence images revealed (clear, identifying features)
   - Definitive proof for location identification
   - Players should be able to confirm their answers
   - Timer pressure intensifies as time runs out

#### Scoring & Difficulty System
- **Easy**: Well-known cities with famous landmarks (Paris, New York, Tokyo)
- **Medium**: Mix of major cities and recognizable countries (Barcelona, Sydney, Brazil)
- **Hard**: Less obvious locations or challenging thematic connections

#### Image Generation Strategy
- **Turn 1 Images**: Extreme close-ups, shadows, abstract architectural details
- **Turn 3 Images**: Mid-distance views showing context but maintaining mystery
- **Turn 5 Images**: Clear tourist-style photos with identifying landmarks
- **Progressive Difficulty**: Each turn makes identification easier
- **Quality Control**: All images generated with GPT-Image-1 at medium quality

#### Educational Components
- **Cultural Learning**: Each location teaches about local culture, history, landmarks
- **Geographic Skills**: Players learn coordinates, timezones, regional differences
- **Thematic Knowledge**: Connections between locations teach specialized topics
- **Critical Thinking**: Evidence analysis and deductive reasoning skills
- **Global Awareness**: Exposure to diverse international locations

#### Timer & Pressure Mechanics
- **5-Minute Limit**: Creates urgency without being stressful
- **Visual Feedback**: Timer changes color as time decreases (green → yellow → red)
- **No Penalties**: Timer adds excitement but doesn't punish slower players
- **Replayability**: Players can replay cases to improve their time
- **Engagement**: Pressure keeps players focused and engaged

#### Evidence Modal System
- **Click to Examine**: Any location image can be clicked for detailed view
- **Case File Styling**: Modals maintain authentic detective file appearance
- **Zoom Capability**: Players can examine evidence closely
- **Note Taking**: Visual space suggests players can take mental notes
- **Immersion**: Modal system maintains detective game atmosphere

#### Villain Portrait Integration
- **Character Development**: Each villain has unique personality and backstory
- **Thematic Relevance**: Villain's profession/interests match the case theme
- **Visual Consistency**: Painterly storybook style maintains game aesthetic
- **Diversity**: Random gender assignment and varied ethnicities
- **Engagement**: Compelling characters make cases more memorable

#### Case File Authenticity Features
- **Ruled Paper Background**: Authentic lined paper throughout interface
- **Typewriter Font**: Courier New for realistic case file typography
- **Evidence Photos**: Professional evidence presentation style
- **Official Layout**: Mugshots, evidence logs, case summaries
- **Professional Feel**: Interface resembles real police/detective documentation

## Database Schema (Prisma)
```prisma
model Game {
  id                String          @id @default(cuid())
  caseTitle         String          # "The Great Festival Heist"
  theme             String          # "FESTIVALS"
  turn4Clue         String?         # "Cities with famous parades"
  villainName       String          # "Marcus 'The Phantom' Rodriguez"
  villainTitle      String          # "International Art Thief"
  crimeSummary      String          # Full crime description
  difficulty        String          # "easy", "medium", "hard"
  isPublished       Boolean         @default(false)
  locations         Location[]      # 3 connected locations
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
}

model Location {
  id              String   @id @default(cuid())
  name            String   # "Rio de Janeiro" or "Brazil"
  country         String   # "Brazil" (same as name if country-level)
  position        Int      # 1, 2, or 3
  latitude        Float    # Geographic coordinates
  longitude       Float
  timezoneOffset  Float    # UTC offset for Turn 2
  timezoneName    String   # "America/Sao_Paulo"
  landmarks       String   # JSON array of famous landmarks
  image1Url       String?  # Base64 data URLs from GPT-Image-1
  image2Url       String?
  image3Url       String?
  gameId          String
  game            Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
}
```

## Critical Development Rules

### Location Selection Rules
- **ONLY use cities or countries** - DO NOT use counties, parks, rivers, states, provinces, regions, landmarks, or other geographic entities
- Cities must be major cities that are well-known internationally (e.g., London, Tokyo, New York)
- Countries must be sovereign nations (e.g., France, Japan, Brazil)
- Pick EITHER all 3 cities OR all 3 countries (never mix)
- The "landmarks" field should contain famous landmarks/attractions WITHIN each city/country

### Testing Protocol
1. **Always restart server after code changes**: `pkill -f "node server-unified.js" && node server-unified.js &`
2. **Use Playwright MCP Server** for all frontend testing and verification
3. **Mobile First**: Test on narrow viewports (320px-420px)
4. **Evidence Flow**: Verify image reveals work correctly
5. **Timer System**: Confirm countdown and color changes
6. **Case Files**: Check background consistency when scrolling
7. **Modals**: Test evidence viewing and modal interactions

### Code Quality Standards
- **Consistent Naming**: Use detective/case file terminology in variable names
- **Comment Style**: Explain complex detective game logic
- **Error Handling**: Graceful degradation for missing evidence/data
- **Mobile Testing**: Always test on mobile devices first using Playwright MCP Server
- **Performance**: Keep interface responsive and smooth

## Environment Variables Required
```
PORT=9091
OPENAI_API_KEY=your_openai_api_key
AWS_S3_BUCKET_NAME=placesgame-images
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

## Recent Updates (2025-07-06)

### Major System Updates
- **Unified Server**: Consolidated all functionality into `server-unified.js`
- **GPT-Image-1 Integration**: Switched from DALL-E 3 to GPT-Image-1 for all image generation
- **Base64 Handling**: Proper conversion of GPT-Image-1 base64 responses to data URLs
- **Painterly Style**: Updated villain portraits to storybook painting style
- **Code Cleanup**: Removed redundant files and test artifacts

### Performance Improvements
- **Single Server Architecture**: Eliminated multiple server files
- **Optimized Image Generation**: Medium quality GPT-Image-1 for faster generation
- **Clean Codebase**: Removed test files, screenshots, and documentation artifacts
- **Streamlined Development**: Single entry point with unified functionality

This project represents a complete, production-ready detective game experience that transforms geography education into an engaging criminal investigation simulation using cutting-edge AI image generation and authentic detective interface design.