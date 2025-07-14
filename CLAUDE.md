# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Worldwide Chase** is a geography-themed detective game where players solve crime cases by identifying connected locations based on thematic clues and progressively revealed visual evidence. Each case features AI-generated villains, crime narratives, and educational geography content presented in an authentic detective case file interface. This is a production-ready web application built with modern technologies.

**Game Formats**:
- **V1 Games**: Original 3-location format (5 turns, identify 3 locations)
- **V2 Games**: Enhanced 3+1 format (7 turns, identify 3 locations + deduce 4th final location)

**Status**: Production-ready with dual-format detective case file experience

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
│   ├── index.html    # Admin dashboard with V1/V2 format tabs
│   ├── generate.html # V1 game generation page
│   ├── generate-v2.html # V2 game generation page (3+1 format)
│   ├── games.html    # V1 games management page
│   ├── games-v2.html # V2 games management page
│   ├── game-details.html # V1 game details view
│   ├── game-details-v2.html # V2 game details view with performance timing
│   └── styles.css    # Admin portal styles
├── game/              # Frontend game system (Player Experience)
│   ├── index.html    # Case gallery & browsing
│   ├── detective.html # Detective case file interface (MAIN GAME)
│   ├── detective-header.js # Shared header component
│   ├── styles.css    # Complete game styling system
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
├── tests/            # Test files and scripts
│   ├── *.js         # Test implementations (playwright, unit tests, etc.)
│   └── *.html       # Test HTML pages for manual testing
├── test-artifacts/   # Test outputs and documentation
│   ├── *.md         # Test reports and summaries
│   └── *.png        # Screenshots and visual test results
├── test-results/     # Test execution results (auto-generated)
└── .gitignore
```

## Tech Stack

### Backend (Complete System - Production Ready)
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: SQLite with Prisma ORM (V1 + V2 schemas)
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

## Core Features

### V1 Games (Original Format)
- 3-location format with 5-turn investigation system
- Investigation Journal with Timeline and Locations views
- Evidence modals for detailed examination
- 5-minute countdown timer with visual feedback

### V2 Games (Enhanced 3+1 Format)  
- 7-turn gameplay identifying 3 locations + 4th final location
- Turn-by-turn clues with multiple evidence types
- Villain integration in location images
- 16 varied story endings and educational facts
- Performance tracking and optional form fields

### Shared Features
- Dual format admin portal for game management
- AI-generated villains, crimes, and location images
- Geographic education with real coordinates and timezones
- Mobile-optimized detective case file interface
- Case gallery with villain portraits and profiles
- User profile system and help system

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

### Testing
**IMPORTANT**: Always use Playwright MCP Server for frontend testing. Restart server after changes:
`pkill -f "node server-unified.js" && node server-unified.js &`

**Test Organization**:
- `tests/`: All test scripts and manual test pages
- `test-artifacts/`: Reports, screenshots, and documentation  
- `test-results/`: Auto-generated test outputs

**Key Test Areas**:
1. Mobile responsiveness (320px-1024px)
2. Detective interface (tabs, timer, modals)
3. Case file backgrounds and typography
4. User profile and villain modal systems
5. Help system and first-time experience

**Test Scripts**:
- `verify-detective-interface.js`: Full system verification
- `test-detective-interface.js`: Playwright UI testing
- `verify-villain-modal.js`: Villain modal verification

## Application URLs

**Quick Start**: `node server-unified.js` then access http://localhost:9091

### Player Experience
- **Case Gallery**: http://localhost:9091/game/
- **Detective Game**: http://localhost:9091/game/detective.html

### Admin Portal
- **Dashboard**: http://localhost:9091/admin/
- **V1 Generation**: http://localhost:9091/admin/generate.html
- **V1 Games**: http://localhost:9091/admin/games.html
- **V2 Generation**: http://localhost:9091/admin/generate-v2.html
- **V2 Games**: http://localhost:9091/admin/games-v2.html

### Development
- **Mockups**: http://localhost:9091/mockups/
- **Database GUI**: http://localhost:5555/ (Prisma Studio)

### API Endpoints
- **V1 Cases**: `/api/cases` | **V1 Games**: `/api/games`
- **V2 Cases**: `/api/v2/cases` | **V2 Games**: `/api/v2/games`
- **V2 Generation**: `/api/v2/games/generate`

## AI Image Generation
- **Engine**: GPT-Image-1, medium quality
- **Villain Portraits**: Painterly storybook style, 3/4 view, theme-appropriate
- **Location Images**: Travel photography style with progressive difficulty
- **Format**: Base64 → Data URLs, 1024x1024, solid backgrounds

## Game Mechanics

### Core Detective Experience
- **Case Selection**: Browse gallery with villain portraits and summaries
- **5-Turn Investigation**: Progressive evidence reveals (turns 1, 3, 5)
- **Timer System**: 5-minute countdown with visual urgency
- **Evidence Modals**: Click images for detailed examination
- **Authentic Interface**: Case file styling with ruled paper and typewriter font

### Interface Components
1. **Case Header**: Dynamic titles, logo, user menu (detective-header.js)
2. **Investigation Journal**: Three-tab system with Timeline/Locations views
3. **Evidence Organization**: Turn-based clues, geographic data, breakthrough discoveries
4. **Spoiler Protection**: Generic labels preserve mystery
5. **User Profile**: Account management with username editing
6. **Help System**: Interactive instructions with auto-show for new users

### Location Rules & Game Design

**Location Requirements**:
- ONLY cities OR countries (never mix types, states, parks, landmarks)
- ALL 3 must be same type (3 major cities OR 3 sovereign countries)
- Geographic diversity across continents when possible
- Thematic connection (e.g., space exploration → Houston, Cape Canaveral, Baikonur)

**Turn Progression**:
1. **Turn 1**: Theme + obscured evidence images + timer start
2. **Turn 2**: Timezone/distance data revealed
3. **Turn 3**: Clearer evidence images with more context
4. **Turn 4**: Key thematic clue (breakthrough moment)
5. **Turn 5**: Final clear identifying images

**Difficulty System**:
- **Easy**: Famous cities with iconic landmarks
- **Medium**: Mix of recognizable cities/countries  
- **Hard**: Less obvious locations or challenging themes

## Database Schema

**Key Models**:
- **Game/GameV2**: Case metadata, villain profiles, crime summaries
- **Location/LocationV2**: Geographic data, coordinates, timezones, images
- **FinalLocationV2**: V2 format 4th location for deduction
- **GameplayTurn/Clue**: V2 format turn-by-turn clue system
- **GenerationV2**: V2 performance tracking and status

## Development Rules

### Location Selection
- **ONLY cities OR countries** (never parks, states, landmarks, regions)
- ALL 3 must be same type (3 major cities OR 3 sovereign countries)
- Pick internationally known cities (London, Tokyo) or sovereign nations (France, Japan)
- Landmarks field contains attractions WITHIN each location

### Testing Protocol
1. Restart server after changes: `pkill -f "node server-unified.js" && node server-unified.js &`
2. Use Playwright MCP Server for frontend testing
3. Test mobile-first (320px-420px viewports)
4. Verify evidence flow, timer system, modal interactions
5. Check case file background consistency

### Code Standards
- Use detective/case file terminology in variables
- Explain complex game logic with comments
- Graceful error handling for missing data
- Keep interface responsive and smooth

## Environment Variables
```
PORT=9091
OPENAI_API_KEY=your_openai_api_key
AWS_S3_BUCKET_NAME=placesgame-images
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

## Recent Updates

### V2 Detective Interface Visual Improvements (2025-01-13)
- Investigation Journal redesign with dropdown navigation
- Consistent turn indicators (dark green past, orange current)
- Error container fix and case title header display
- Enhanced visual polish and CSS specificity improvements

### V2 Game System Implementation (2025-01-11)
- 3+1 format with 7 turns (3 locations + 4th final location)
- Turn-by-turn clues with villain integration
- 16 final objectives and educational facts
- Performance tracking and dual format support

### Investigation Journal System (2025-01-09)
- Timeline and Locations views with evidence organization
- Spoiler protection with generic labels
- Streamlined Check Answers interface
- Mobile optimization for dual views

This production-ready detective game transforms geography education into an engaging criminal investigation experience using AI-generated content and authentic case file design.