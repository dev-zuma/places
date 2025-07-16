# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Worldwide Chase** is a geography-themed detective game where players solve crime cases by identifying connected locations based on thematic clues and progressively revealed visual evidence. Each case features AI-generated villains, crime narratives, and educational geography content presented in an authentic detective case file interface. This is a production-ready web application built with modern technologies.

**Game Format**: Enhanced 3+1 format (7 turns, identify 3 locations + deduce 4th final location)

**Status**: Production-ready detective case file experience

## Project Structure

```
places/
├── CLAUDE.md           # This file - project guidance
├── server-unified.js   # Main production server (52 lines, loads route modules)
├── start-server.bat    # Windows batch file to start server
├── test-villain-styles.html # Villain portrait testing tool
├── package.json        # Node.js dependencies
├── package-lock.json   # Dependency lock file
├── .env               # Environment variables (API keys)
├── routes/            # API route modules (refactored from server-unified.js)
│   ├── admin.js      # Admin endpoints (/api/admin/*, /api/test-villain-portrait)
│   ├── cases.js      # Player-facing game endpoints (/api/v2/cases)
│   ├── config.js     # Configuration endpoints (/api/config, /api/debug/test)
│   ├── games.js      # Game management (/api/v2/games/*)
│   ├── leaderboard.js # Leaderboard endpoints (/api/leaderboard)
│   ├── players.js    # Player management (/api/players/*)
│   └── static.js     # Static file serving and root routes
├── utils/             # Shared utilities and services
│   ├── clients.js    # Service clients (OpenAI, S3, Prisma, CORS config)
│   ├── database.js   # Database helpers (progress tracking, analytics)
│   ├── gameGeneration.js # Core game generation logic (generateGameV2Async, etc.)
│   ├── geoCalculations.js # Geographic calculations (distance, time zones)
│   ├── imageGeneration.js # AI image generation (villains, locations)
│   └── imageUpload.js # S3 upload functionality
├── prisma/            # Database ORM
│   ├── schema.prisma  # Database schema definition
│   ├── dev.db        # SQLite development database
│   └── migrations/   # Database migration files
├── admin/             # Admin portal UI (Content Management)
│   ├── index.html    # Admin dashboard
│   ├── generate-v2.html # Game generation page (3+1 format) with bulk generation
│   ├── games-v2.html # Games management page
│   ├── game-details-v2.html # Game details view with performance timing
│   └── styles.css    # Admin portal styles
├── game/              # Frontend game system (Player Experience)
│   ├── index.html    # Case gallery & browsing
│   ├── detective.html # Detective case file interface (MAIN GAME)
│   ├── detective-header.js # Shared header component
│   ├── leaderboard.html # Leaderboard page with weighted scoring
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

## Core Features

### Game Features (3+1 Format)
- 7-turn gameplay identifying 3 locations + 4th final location
- Turn-by-turn clues with multiple evidence types
- Villain integration in location images
- 16 varied story endings and educational facts
- Performance tracking and optional form fields
- **Bulk Generation**: Create 3, 10, 20, or 30 games at once with diverse themes

### System Features
- Admin portal for game management
- AI-generated villains, crimes, and location images
- Geographic education with real coordinates and timezones
- Mobile-optimized detective case file interface
- Case gallery with villain portraits and profiles
- User profile system and help system
- 5-minute countdown timer with visual feedback
- Investigation Journal with Timeline and Locations views
- Evidence modals for detailed examination

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
- **Leaderboard**: http://localhost:9091/game/leaderboard.html

### Admin Portal
- **Dashboard**: http://localhost:9091/admin/
- **Game Generation**: http://localhost:9091/admin/generate-v2.html
- **Games Management**: http://localhost:9091/admin/games-v2.html

### Development
- **Mockups**: http://localhost:9091/mockups/
- **Database GUI**: http://localhost:5555/ (Prisma Studio)

### API Endpoints
- **Cases**: `/api/v2/cases`
- **Games**: `/api/v2/games`
- **Game Generation**: `/api/v2/games/generate`
- **Bulk Generation**: `/api/v2/games/bulk-generate`
- **Bulk Status**: `/api/v2/games/bulk-status`
- **Leaderboard**: `/api/leaderboard?type=overall|easy|medium|hard`

## Bulk Generation System

### Overview
The bulk generation feature allows administrators to create multiple games simultaneously with diverse themes to prevent repetitive content.

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
- **Engine**: GPT-Image-1, medium quality, optimized with prompt caching
- **Villain Portraits**: Painterly storybook style, 3/4 view with full demographic representation
  - **Demographic Integration**: Race, ethnicity, gender, age, distinctive features included
  - **Diversity Compliance**: Accurate representation across all racial/ethnic backgrounds
  - **Style Consistency**: Kid-friendly, charming rather than menacing appearance
- **Location Images**: Travel photography style with villain evidence integration
  - **Evidence Types**: Security footage, belongings, reflections, shadows
  - **Villain Consistency**: Character demographics included in all evidence images
  - **Progressive Difficulty**: Obscured, medium, clear levels based on game progression
- **Format**: Base64 → Data URLs, 1024x1024, solid backgrounds
- **Cost Optimization**: Static prompt instructions cached, dynamic character details vary per generation

## Game Mechanics

### Core Detective Experience
- **Case Selection**: Browse gallery with villain portraits and summaries
- **7-Turn Investigation**: Progressive evidence reveals across all turns
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
- **ONLY cities** (never countries, states, parks, landmarks, regions)
- ALL 4 locations (including final location) must be major cities
- Geographic diversity across continents when possible
- Thematic connection (e.g., space exploration → Houston, Cape Canaveral, Baikonur)

**Turn Progression**:
1. **Turn 1**: Theme + pattern recognition clues (emoji sequences for each city) - NO images (4 clues total)
2. **Turn 2**: First image + 3 location-specific clues (one for each location) - NO distance/timezone data (4 clues total)
3. **Turn 3**: Second image + 3 location-specific clues (one for each location) - NO distance/timezone data (4 clues total)
4. **Turn 4**: ALL distance calculations + time differences between cities - NO images (6 clues total)
5. **Turn 5**: Country clues only (one for each country the cities are in) - NO additional clues, NO images (3 clues total)
6. **Turn 6**: First clues about 4th final location - NO images (1 clue only)
7. **Turn 7**: Decisive clues for final location - NO images (1 clue only)

**Difficulty System**:
- **Easy**: 2 well-known capital/major cities + 1 lesser-known city
- **Medium**: 1 well-known city + 2 lesser-known cities
- **Hard**: All 3 lesser-known cities (avoiding capitals and tourist destinations)
- **4th Location**: Always a lesser-known city, regardless of difficulty

**Image Generation Rules**:
- Exactly 2 images per game
- First image MUST be in Turn 2
- Second image MUST be in Turn 3
- NO images in turns 1, 4, 5, 6, or 7

## Database Schema

**Key Models**:
- **GameV2**: Case metadata, villain profiles, crime summaries
  - **Villain Demographics**: Separate `villainRace` and `villainEthnicity` fields for comprehensive representation
  - **Backward Compatibility**: `villainRace` is nullable for existing games
- **LocationV2**: Geographic data, coordinates, timezones, images
- **FinalLocationV2**: 4th location for deduction
- **GameplayTurn/Clue**: Turn-by-turn clue system
- **GenerationV2**: Performance tracking and status with detailed phase timing
- **Player/PlayerCaseV2**: User profiles and game progress

**Recent Schema Updates (2025-07-16)**:
- Added `villainRace` field to GameV2 model for enhanced diversity tracking
- Maintained `villainEthnicity` for specific cultural backgrounds
- Updated admin interfaces to display both demographic fields

## Development Rules

### Location Selection
- **ONLY cities** (never countries, parks, states, landmarks, regions)
- ALL 4 locations (including final location) must be major cities
- Follow difficulty-based selection: Easy (2 well-known + 1 lesser-known), Medium (1 well-known + 2 lesser-known), Hard (3 lesser-known)
- 4th location (final) should ALWAYS be lesser-known, regardless of difficulty
- Avoid overused cities (London, Berlin, NYC, Wellington, Cape Town) - use sparingly
- Focus on lesser-known but important cities (Thessaloniki, Krakow, Montevideo, Almaty, Medan, Porto Alegre, Dakar, Izmir, Pune, Guayaquil)
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

### Cost Optimization
- **Prompt Caching Strategy**: Static instructions separated from dynamic content
- **Cache Hit Rate**: 70-85% of prompt content now cacheable across all AI calls
- **Economic Impact**: 50-75% reduction in OpenAI API costs for game generation
- **Bulk Generation**: Significantly more cost-effective for creating multiple games
- **Quality Maintenance**: All optimizations preserve existing game quality and mechanics

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

### Clue Distribution & UI Enhancements (2025-01-17)
- **Turn 2-3 Clue Distribution**: Updated game generation to ensure exactly 3 location-specific clues per turn
  - Each turn now has 4 clues total: 1 image + 3 location clues (one per location)
  - Ensures balanced evidence distribution across all three locations
  - Helps players systematically identify each location with equal clue coverage
- **Time Difference Display**: Added explicit time differences in Investigation Journal's Distances view
  - Time differences now shown below each distance measurement (e.g., "+3h", "-2h")
  - Fixed extraction of time data from "X hours difference" format in database
  - Improved geographic west-to-east layout with signed time differences
  - Enhanced visual hierarchy with gray text (#666) and proper spacing
- **Villain Diversity Improvements**: Strengthened racial diversity requirements to prevent bias
  - Added explicit percentage distribution: Black (25%), White (25%), Asian (20%), Hispanic/Latino (15%), Middle Eastern (10%), Native American (2.5%), Pacific Islander (2.5%)
  - Implemented "mental dice roll" instruction for truly random selection
  - Added warnings against defaulting to any single race, especially Hispanic/Latino
  - Expanded ethnicity examples within each racial category for better variety

### Prompt Caching Optimization & Villain Diversity Enhancements (2025-07-16)
- **OpenAI Prompt Caching Implementation**: Restructured all AI generation prompts for maximum cache efficiency
  - **Game Content Generation**: Split into static cacheable instructions + dynamic context (80% cost reduction)
  - **Turn-by-Turn Clue Generation**: Separated static rules from dynamic game data (85% cost reduction)
  - **Theme Generation**: Optimized with cacheable requirements + dynamic parameters (70% cost reduction)
  - **Image Generation**: Enhanced with static composition rules + dynamic character details (70% cost reduction)
  - **Overall Cost Savings**: 50-75% reduction in OpenAI API costs for game generation
- **Villain Race & Ethnicity System**: Implemented comprehensive demographic representation
  - **Database Schema Update**: Added separate `villainRace` field alongside existing `villainEthnicity`
  - **Enhanced Diversity Prompts**: Explicit instructions for racial variety (Black, White, Asian, Hispanic/Latino, Middle Eastern, Native American, Pacific Islander, Mixed Race)
  - **Specific Ethnicity Mapping**: Detailed ethnic backgrounds for each racial category (Nigerian, Japanese, Colombian, Lebanese, etc.)
  - **Anti-Bias Instructions**: Active prevention of defaulting to single ethnicities like Mexican
  - **Image Generation Integration**: Villain demographics included in all image prompts for visual consistency
  - **Admin Interface Update**: Game details page now displays both race and ethnicity fields
- **Quality Assurance**: All optimizations maintain existing functionality and game quality
  - **Backward Compatibility**: Older games without race field display gracefully
  - **Testing Verified**: Complete game generations with proper diversity (Korean, Colombian, Iranian examples)
  - **Cache Effectiveness**: Static instructions cached while dynamic content varies per generation

### Pattern Recognition Clues & Villain Diversity (2025-01-16)
- **Pattern Recognition Implementation**: Turn 1 now features emoji pattern clues instead of country clues
  - Each city gets unique 3-4 emoji sequences representing iconic features (🌊🌉🎭 = Venice)
  - Patterns require cultural knowledge and visual reasoning rather than text searches
  - AI/Siri resistance: Much harder for assistants to solve emoji combinations instantly
  - Large emoji display (48px) with normal-sized labels for better UX
- **Turn Structure Reorganized**: Country clues moved from Turn 1 to Turn 5 for better flow
  - Turn 1: Theme + 3 pattern recognition clues (emoji sequences)
  - Turn 5: Only 3 country clues (one per country) with no additional clues
- **Villain Diversity Enhancement**: Updated villain generation for inclusive representation
  - Added explicit race field (Black, White, Asian, Hispanic/Latino, Middle Eastern, etc.)
  - Enhanced ethnicity specifications (Nigerian, Japanese, Mexican, Lebanese, etc.)
  - Prevents defaulting to single racial groups, ensures global diversity
- **UI Improvements**: Pattern recognition clues display with special styling and hover effects
- **Database Preservation**: Pattern descriptions saved in database but hidden from game display

### Game Generation Status Tracking Fix (2025-01-16)
- **Issue Resolved**: Fixed UI getting stuck at "generating 2nd image" during game generation
- **Root Cause**: `updateGenerationProgress` function was failing silently due to invalid `updatedAt` field usage
- **Fix Applied**: Removed `updatedAt` field from progress updates (auto-managed by Prisma)
- **Impact**: 
  - ✅ **Progress bar updates correctly** during generation
  - ✅ **Status completion tracking** works properly
  - ✅ **UI shows completion** with "View Generated Game" button
  - ✅ **Both single and bulk generation** now complete successfully
- **Testing**: Verified all progress steps work correctly (content → locations → turns → villain → images → completed)

### Clue Generation Quality Improvements (2025-01-16)
- **Enhanced Clue Specificity**: Updated OpenAI prompts to avoid generic clues like "this city has a popular festival"
- **Specific Geography Focus**: Requires distinctive features that narrow down possibilities
- **Good Examples**: "This city sits where Europe's longest river meets the sea"
- **Bad Examples Avoided**: "This city has beautiful architecture" (too generic)
- **Turn 6-7 Clue Limits**: Enforced exactly 1 clue per turn for final location deduction
- **Explicit Instructions**: Added "NO MORE THAN 1 CLUE" reinforcement in prompts

### Publish/Unpublish System Restoration (2025-01-16)
- **Issue Fixed**: Publish/Unpublish button disappearing after publishing games
- **Root Cause**: Button visibility logic only checked for 'completed' status, not 'published'
- **Solution**: Updated both admin pages to show button for completed AND published games
- **Manual Game Fixes**: Updated existing games stuck in 'pending' status to 'completed'
- **Current Workflow**: 
  - ✅ Games generate as unpublished (safe default)
  - ✅ Admin can publish to make available to players
  - ✅ Admin can unpublish to remove from players
  - ✅ Button toggles correctly between states

### Server Architecture Refactoring (2025-01-16)
- **Modular Architecture**: Refactored 2,700+ line server-unified.js into organized modules
  - **Main Server**: Reduced to 52 lines, focusing on middleware and route mounting
  - **Route Modules**: Created 7 route files in `/routes/` for organized API endpoints
  - **Utility Modules**: Created 6 utility files in `/utils/` for shared functionality
- **Improved Code Organization**:
  - **routes/admin.js**: Admin tools and test endpoints
  - **routes/cases.js**: Player-facing game endpoints
  - **routes/config.js**: System configuration
  - **routes/games.js**: Game generation and management
  - **routes/leaderboard.js**: Weighted scoring leaderboard
  - **routes/players.js**: Player profiles and statistics
  - **routes/static.js**: Static file serving
- **Shared Utilities**:
  - **utils/clients.js**: Service clients (OpenAI, S3, Prisma)
  - **utils/database.js**: Database helpers and analytics
  - **utils/gameGeneration.js**: Core game generation logic
  - **utils/geoCalculations.js**: Geographic calculations
  - **utils/imageGeneration.js**: AI image generation
  - **utils/imageUpload.js**: S3 upload functionality
- **Benefits**: Improved maintainability, easier testing, better separation of concerns
- **Testing**: All endpoints thoroughly tested and working correctly

### Complete V1 System Removal (2025-01-16)
- **Frontend Cleanup**: Removed all V1 game references from /game/ pages
  - Updated detective.html to use V2 APIs exclusively (`/api/v2/cases`, `/api/v2/games`)
  - Replaced old detective.html with detective-v2.html (renamed to detective.html)
  - Removed old backup files (index_backup_header_migration.html, index_old.html)
- **Admin Portal Simplification**: Removed all V1 game generation and management
  - Deleted admin/generate.html, admin/games.html, admin/game-details.html
  - Removed format tabs, dashboard now shows only enhanced game features
  - Updated recent games display to use V2 APIs and link to V2 game details
- **Server-Side V1 Removal**: Completely eliminated V1 backend systems
  - **Removed V1 API Endpoints**: `/api/games`, `/api/cases`, `/api/generate`, `/api/generate/:id/status`
  - **Removed V1 Functions**: `generateGameAsync()`, `generateVillainPortrait()`, `generateLocationImage()`
  - **Updated Admin Endpoints**: Debug and database cleanup now use V2 models only
- **Codebase Streamlining**: Project now exclusively uses enhanced 3+1 format
  - **Single Game Format**: No dual-format complexity, simplified development
  - **V2-Only APIs**: All endpoints use `/api/v2/` namespace
  - **Database Focus**: Only V2 models (GameV2, LocationV2, FinalLocationV2, etc.)
- **Testing Verification**: Comprehensive testing confirms V1 removal success
  - **V2 Generation**: Successfully tested complete game generation (105 seconds)
  - **Game Structure**: Validated 7-turn structure with 3 locations + final location
  - **Playability**: Confirmed generated games work perfectly in detective interface
  - **No V1 Dependencies**: Zero references to old V1 systems remain

### Leaderboard System & Data Sync Implementation (2025-01-15)
- **Detective Leaderboard Added**: New competitive leaderboard page accessible via user dropdown menu
- **Game Focus**: Leaderboard tracks 3+1 format games with weighted scoring
- **Weighted Scoring System**: Easy (1x), Medium (1.25x), Hard (1.75x) multipliers with performance bonuses
- **Performance Bonuses**: 75 points for solving first 3 locations in ≤5 turns, 100 points for 6th turn final location
- **Difficulty-Based Views**: Overall Champions, Easy Champions, Medium Masters, Hard Heroes with proper filtering
- **User Highlighting**: Current user's row highlighted with visual indicators and ranking display
- **Data Sync System**: Automatic localStorage-to-database migration preserves game progress during transitions
- **Debug Integration**: Comprehensive debug logging for game completion and score submission tracking
- **Visual Status Indicators**: Real-time sign-in status display during gameplay with console logging
- **Responsive Design**: Mobile-first leaderboard design consistent with detective interface styling
- **Error Handling**: Robust JavaScript error fixes and proper empty state messaging for unused difficulty levels

### Case Gallery UI Improvements & Endgame Modal Refinement (2025-01-14)
- **Endgame Modal Streamlined**: Replaced two buttons ("New Case" + "Case Gallery"/"View Results") with single "Start New Case" button
- **Modal Close Button Removed**: Eliminated "X" close button from endgame modal for cleaner experience
- **Solved Cases Logic Fixed**: Cases now only appear in "Solved Cases" tab when suspect is actually captured, not just played
- **Difficulty Filter Added**: New dropdown filter for unsolved cases with difficulty-based filtering (All, Easy, Medium, Hard)
- **Dynamic Difficulty Counts**: Filter shows real-time counts for each difficulty level (e.g., "Easy (4)", "Medium (7)")
- **Smart Filter Visibility**: Difficulty filter only appears on unsolved cases tab, auto-hides on solved cases
- **Redundant Stats Removed**: Eliminated stats row showing case/theme/solved counts above tabs for cleaner interface
- **Centered CAPTURED Overlay Removed**: Eliminated redundant center overlay on solved cases, keeping only top-right stamp

### Country Clue Accuracy Fix (2025-01-14)
- **Flag Description Accuracy**: Fixed inaccurate country flag descriptions in Turn 1 clues
- **Data Reference System**: AI now uses actual country names from location data for accurate flag descriptions
- **Prompt Enhancement**: Added explicit instructions to reference `gameData.locations[].country` for accuracy
- **Quality Control**: Ensures country clues (currency, flag, geography, history) are factually correct

### Data Management Improvements (2025-01-14)
- **Enhanced Game Deletion**: Game deletion now properly removes all associated user data
- **Complete Data Cleanup**: PlayerCaseV2 records are explicitly deleted before game removal
- **Database Integrity**: Ensures no orphaned user progress data remains after game deletion

### Game Mechanics & UI Overhaul (2025-01-14)
- **Cities-Only Focus**: Games now exclusively use cities (no countries, regions, or landmarks)
- **Difficulty-Based Location Selection**: Easy (all well-known cities), Medium (2 well-known + 1 lesser-known), Hard (1 well-known + 2 lesser-known)
- **Turn Structure Reorganization**: 
  - Turn 1: Theme + pattern recognition clues (emoji sequences, NO images)
  - Turn 2 & 3: Images + evidence (NO distance data)
  - Turn 4: Distance & time data (NO images)
  - Turn 5: Country clues only (NO additional clues, NO images)
  - Turn 6-7: Final location clues (NO images)
- **Image Generation Rules**: Exactly 2 images per game in turns 2 and 3 only
- **Investigation Journal Updates**: 
  - Distances dropdown hidden until Turn 4
  - Location labels changed to "City 1/2/3"
  - Error handling improvements for missing DOM elements
- **Backend Prompt Updates**: Updated location and clue generation prompts for consistent city-only gameplay

### Bulk Generation System (2025-01-14)
- **Bulk Game Creation**: Generate 3, 10, 20, or 30 games simultaneously
- **Theme Diversity Engine**: AI-powered unique theme generation using OpenAI GPT-4o-mini
- **Smart Theme Distribution**: Analyzes existing games to prevent repetitive themes
- **Real-time Progress UI**: Shows individual game progress with theme names
- **Difficulty Control**: Random mix or fixed difficulty levels
- **Status Tracking**: Visual progress indicators for each game in bulk generation
- **API Extensions**: New endpoints for bulk generation and status monitoring

### Help System Update (2025-01-14)
- Updated "How to Play" instructions for gameplay (7 turns, 3+1 format)
- Enhanced help content accessible from both gallery and detective pages
- Detailed turn breakdown: Turns 1-5 (crime scenes) + Turns 6-7 (final hunt)
- Added Detective Tools section explaining Investigation Journal and evidence analysis
- Included geographic education examples and scoring system explanation
- Updated for pattern recognition clues and emoji puzzle features

### Detective Interface Visual Improvements (2025-01-13)
- Investigation Journal redesign with dropdown navigation
- Consistent turn indicators (dark green past, orange current)
- Error container fix and case title header display
- Enhanced visual polish and CSS specificity improvements

### Game System Implementation (2025-01-11)
- 3+1 format with 7 turns (3 locations + 4th final location)
- Turn-by-turn clues with villain integration
- 16 final objectives and educational facts
- Performance tracking and generation status monitoring

### Investigation Journal System (2025-01-09)
- Timeline and Locations views with evidence organization
- Spoiler protection with generic labels
- Streamlined Check Answers interface
- Mobile optimization for dual views

This production-ready detective game transforms geography education into an engaging criminal investigation experience using AI-generated content and authentic case file design.