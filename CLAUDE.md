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
│   ├── generate-v2.html # V2 game generation page (3+1 format) with bulk generation
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
- **Bulk Generation**: Create 3, 10, 20, or 30 games at once with diverse themes

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
- **V2 Bulk Generation**: `/api/v2/games/bulk-generate`
- **V2 Bulk Status**: `/api/v2/games/bulk-status`

## Bulk Generation System (V2)

### Overview
The bulk generation feature allows administrators to create multiple V2 games simultaneously with diverse themes to prevent repetitive content.

### Configuration Options
- **Game Count**: 3, 10, 20, or 30 games (default: 10)
- **Difficulty**: Random mix or fixed level (Easy, Medium, Hard)
- **Theme Diversity**: AI-generated unique themes for each game
- **All Standard Settings**: Kid-friendly, villain integration, final objectives

### Theme Diversity Engine
- **OpenAI Integration**: Uses GPT-4o-mini to generate diverse themes
- **Existing Theme Analysis**: Queries published games to avoid repetition
- **Category Distribution**: Spans heists, espionage, trafficking, mysteries, etc.
- **Fallback System**: 20 pre-defined themes if OpenAI unavailable
- **Base Theme Inspiration**: Uses user input to guide theme variations

### UI Features
- **Real-time Progress**: Shows "generating game X of Y..." with individual themes
- **Status Tracking**: Visual indicators for completed, in-progress, and failed games
- **Theme Display**: Each game shows its unique theme as soon as generated
- **Bulk Status**: Overall progress bar plus individual game progress items

### Technical Implementation
- **API Endpoints**: `/api/v2/games/bulk-generate` and `/api/v2/games/bulk-status`
- **Async Processing**: All games generate simultaneously in background
- **Progress Tracking**: Real-time updates via polling mechanism
- **Error Handling**: Graceful fallback for failed generations

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

**Location Requirements (V2 Updated)**:
- **ONLY cities** (never countries, states, parks, landmarks, regions)
- ALL 4 locations (including final location) must be major cities
- Geographic diversity across continents when possible
- Thematic connection (e.g., space exploration → Houston, Cape Canaveral, Baikonur)

**V2 Turn Progression (Updated)**:
1. **Turn 1**: Theme + country clues (one for each country the cities are in) - NO images
2. **Turn 2**: First image + cultural/geographic clues - NO distance/timezone data
3. **Turn 3**: Second image + additional evidence - NO distance/timezone data
4. **Turn 4**: ALL distance calculations + time differences between cities - NO images
5. **Turn 5**: Final clues for 3 crime scenes - NO images, NO 4th location hints
6. **Turn 6**: First clues about 4th final location - NO images
7. **Turn 7**: Decisive clues for final location - NO images

**V2 Difficulty System**:
- **Easy**: All 3 cities are well-known capital/major cities
- **Medium**: 2 well-known cities + 1 less well-known but important city
- **Hard**: 1 well-known city + 2 less well-known but major cities

**Image Generation Rules**:
- Exactly 2 images per game
- First image MUST be in Turn 2
- Second image MUST be in Turn 3
- NO images in turns 1, 4, 5, 6, or 7

## Database Schema

**Key Models**:
- **Game/GameV2**: Case metadata, villain profiles, crime summaries
- **Location/LocationV2**: Geographic data, coordinates, timezones, images
- **FinalLocationV2**: V2 format 4th location for deduction
- **GameplayTurn/Clue**: V2 format turn-by-turn clue system
- **GenerationV2**: V2 performance tracking and status

## Development Rules

### Location Selection (V2 Updated)
- **ONLY cities** (never countries, parks, states, landmarks, regions)
- ALL 4 locations (including final location) must be major cities
- Follow difficulty-based selection: Easy (all well-known), Medium (2 well-known + 1 lesser-known), Hard (1 well-known + 2 lesser-known)
- Pick internationally known cities (London, Tokyo, Berlin) and important regional cities (Krakow, Almaty, Montevideo)
- Landmarks field contains attractions WITHIN each city

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

### Case Gallery UI Improvements & Endgame Modal Refinement (2025-01-14)
- **Endgame Modal Streamlined**: Replaced two buttons ("New Case" + "Case Gallery"/"View Results") with single "Start New Case" button
- **Modal Close Button Removed**: Eliminated "X" close button from endgame modal for cleaner experience
- **Solved Cases Logic Fixed**: Cases now only appear in "Solved Cases" tab when suspect is actually captured, not just played
- **Difficulty Filter Added**: New dropdown filter for unsolved cases with difficulty-based filtering (All, Easy, Medium, Hard)
- **Dynamic Difficulty Counts**: Filter shows real-time counts for each difficulty level (e.g., "Easy (4)", "Medium (7)")
- **Smart Filter Visibility**: Difficulty filter only appears on unsolved cases tab, auto-hides on solved cases
- **Redundant Stats Removed**: Eliminated stats row showing case/theme/solved counts above tabs for cleaner interface
- **Centered CAPTURED Overlay Removed**: Eliminated redundant center overlay on solved cases, keeping only top-right stamp

### V2 Country Clue Accuracy Fix (2025-01-14)
- **Flag Description Accuracy**: Fixed inaccurate country flag descriptions in Turn 1 clues
- **Data Reference System**: AI now uses actual country names from location data for accurate flag descriptions
- **Prompt Enhancement**: Added explicit instructions to reference `gameData.locations[].country` for accuracy
- **Quality Control**: Ensures country clues (currency, flag, geography, history) are factually correct

### V2 Data Management Improvements (2025-01-14)
- **Enhanced Game Deletion**: V2 game deletion now properly removes all associated user data
- **Complete Data Cleanup**: PlayerCaseV2 records are explicitly deleted before game removal
- **Database Integrity**: Ensures no orphaned user progress data remains after game deletion

### V2 Game Mechanics & UI Overhaul (2025-01-14)
- **Cities-Only Focus**: V2 games now exclusively use cities (no countries, regions, or landmarks)
- **Difficulty-Based Location Selection**: Easy (all well-known cities), Medium (2 well-known + 1 lesser-known), Hard (1 well-known + 2 lesser-known)
- **Turn Structure Reorganization**: 
  - Turn 1: Theme + country clues (NO images)
  - Turn 2 & 3: Images + evidence (NO distance data)
  - Turn 4: Distance & time data (NO images)
  - Turn 5-7: Final clues (NO images)
- **Image Generation Rules**: Exactly 2 images per game in turns 2 and 3 only
- **Investigation Journal Updates**: 
  - Distances dropdown hidden until Turn 4
  - Location labels changed to "City 1/2/3"
  - Error handling improvements for missing DOM elements
- **Backend Prompt Updates**: Updated location and clue generation prompts for consistent city-only gameplay

### V2 Bulk Generation System (2025-01-14)
- **Bulk Game Creation**: Generate 3, 10, 20, or 30 games simultaneously
- **Theme Diversity Engine**: AI-powered unique theme generation using OpenAI GPT-4o-mini
- **Smart Theme Distribution**: Analyzes existing games to prevent repetitive themes
- **Real-time Progress UI**: Shows individual game progress with theme names
- **Difficulty Control**: Random mix or fixed difficulty levels
- **Status Tracking**: Visual progress indicators for each game in bulk generation
- **API Extensions**: New endpoints for bulk generation and status monitoring

### V2 Help System Update (2025-01-14)
- Updated "How to Play" instructions for V2 gameplay (7 turns, 3+1 format)
- Enhanced help content accessible from both gallery and detective pages
- Detailed turn breakdown: Turns 1-5 (crime scenes) + Turns 6-7 (final hunt)
- Added Detective Tools section explaining Investigation Journal and evidence analysis
- Included geographic education examples and scoring system explanation

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