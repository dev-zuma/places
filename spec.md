# 🧭 Places Game - Technical Specification

## Table of Contents
1. [Game Overview](#game-overview)
2. [Technical Architecture](#technical-architecture)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Frontend Architecture](#frontend-architecture)
6. [Game Flow Implementation](#game-flow-implementation)
7. [Admin System](#admin-system)
8. [Authentication & Authorization](#authentication--authorization)
9. [Image Management](#image-management)
10. [Leaderboard System](#leaderboard-system)
11. [Mobile Optimization](#mobile-optimization)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [Implementation Phases](#implementation-phases)

## Game Overview

**Places** is a geography-themed deduction game where players guess 3 connected locations based on a one-word theme and progressively revealed visual hints.

### Core Rules
- **Theme**: One-word theme (e.g., "Jazz", "Coffee", "Gold")
- **Locations**: 3 cities or countries related to the theme
- **Turns**: 5 total turns to guess all locations
- **Image Reveals**: New images on turns 1, 3, and 5 (progressively clearer)
- **Layout**: Locations displayed vertically, ordered north to south by latitude
- **Victory**: Guess all 3 locations before turn 5 ends

### Scoring System
- **Turn 1-2**: 100 points per correct guess
- **Turn 3-4**: 75 points per correct guess
- **Turn 5**: 50 points per correct guess
- **Bonus**: 150 points for guessing all 3 locations
- **Time Bonus**: 1 point per second remaining (5-minute game limit)

## Technical Architecture

### Backend Stack
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Authentication**: Passport.js with Google OAuth 2.0
- **Real-time**: Socket.io
- **Image Storage**: AWS S3
- **AI Integration**: OpenAI API (GPT-4 for game generation, DALL-E 3 for images)
- **Cache**: Redis for session management and leaderboard caching

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS with mobile-first approach
- **State Management**: Zustand
- **Real-time Client**: Socket.io-client
- **Authentication**: NextAuth.js
- **Image Loading**: Next/Image with blur placeholders
- **Form Handling**: React Hook Form with Zod validation

### Color Theme (from requirements)
```css
:root {
  --warm-sand: #F5E6C5;      /* Background */
  --terracotta: #D9824B;     /* Buttons, progress highlights */
  --midnight-green: #234E52; /* Header, active text, borders */
  --misty-sky-blue: #BFD8D2; /* Input boxes, accent blocks */
  --olive-accent: #7A8450;   /* Icons, indicators, secondary UI */
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Games Table
```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme VARCHAR(100) NOT NULL,
  location_type VARCHAR(20) CHECK (location_type IN ('city', 'country')),
  difficulty VARCHAR(20) DEFAULT 'medium',
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Locations Table
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
  connection_to_theme TEXT NOT NULL,
  UNIQUE(game_id, position)
);
```

### Location Images Table
```sql
CREATE TABLE location_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  turn_number INTEGER CHECK (turn_number IN (1, 3, 5)),
  s3_key VARCHAR(500) NOT NULL,
  image_url TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, turn_number)
);
```

### Game Sessions Table
```sql
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  game_id UUID REFERENCES games(id),
  current_turn INTEGER DEFAULT 1 CHECK (current_turn BETWEEN 1 AND 5),
  score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_elapsed_seconds INTEGER
);
```

### Guesses Table
```sql
CREATE TABLE guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  turn_number INTEGER CHECK (turn_number BETWEEN 1 AND 5),
  guess_text VARCHAR(255),
  is_correct BOOLEAN DEFAULT false,
  guessed_at TIMESTAMP DEFAULT NOW()
);
```

### Leaderboard View
```sql
CREATE VIEW leaderboard AS
SELECT 
  u.id as user_id,
  u.name,
  u.avatar_url,
  u.total_score,
  u.games_played,
  u.games_won,
  ROUND((u.games_won::numeric / NULLIF(u.games_played, 0)) * 100, 2) as win_percentage,
  RANK() OVER (ORDER BY u.total_score DESC) as rank
FROM users u
WHERE u.games_played > 0;
```

## API Design

### Authentication Endpoints
```
GET  /api/auth/google          - Initiate Google OAuth flow
GET  /api/auth/google/callback - Handle OAuth callback
POST /api/auth/logout          - Logout user
GET  /api/auth/me              - Get current user
```

### Game Management Endpoints
```
GET  /api/games                - List active games (paginated)
GET  /api/games/:id            - Get game details
POST /api/games                - Create new game (admin only)
PUT  /api/games/:id            - Update game (admin only)
DELETE /api/games/:id          - Delete game (admin only)
```

### Gameplay Endpoints
```
POST /api/sessions             - Start new game session
GET  /api/sessions/:id         - Get session details
POST /api/sessions/:id/guess   - Submit guess
GET  /api/sessions/:id/images  - Get available images for current turn
POST /api/sessions/:id/complete - Mark session as completed
```

### Leaderboard Endpoints
```
GET  /api/leaderboard          - Global leaderboard
GET  /api/leaderboard/weekly   - Weekly leaderboard
GET  /api/leaderboard/game/:id - Leaderboard for specific game
```

### Admin Endpoints
```
POST /api/admin/generate-game  - Generate game using AI
POST /api/admin/generate-image - Generate image for location
GET  /api/admin/stats          - Platform statistics
```

### WebSocket Events
```
// Client -> Server
join-session    { sessionId }
submit-guess    { sessionId, locationPosition, guess }
request-hint    { sessionId }

// Server -> Client
session-updated { currentTurn, score, guessesRemaining }
guess-result    { locationPosition, isCorrect, score }
game-completed  { finalScore, correctAnswers, rank }
```

## Frontend Architecture

### Page Structure
```
/                       - Landing page
/play                   - Game selection
/play/:gameId           - Active game session
/results/:sessionId     - Game results
/leaderboard            - Global leaderboard
/profile                - User profile and stats
/admin                  - Admin dashboard
/admin/create           - Game creation interface
```

### Core Components

#### GameBoard Component
```tsx
interface GameBoardProps {
  locations: Location[];
  currentTurn: number;
  onGuessSubmit: (position: number, guess: string) => void;
}

// Features:
// - Vertical layout (north to south)
// - Progressive image reveal
// - Guess input with autocomplete
// - Visual feedback for correct/incorrect guesses
```

#### ImageReveal Component
```tsx
interface ImageRevealProps {
  images: LocationImage[];
  currentTurn: number;
  isGuessed: boolean;
}

// Features:
// - Blur effect for unrevealed images
// - Smooth transitions between reveals
// - Loading states with skeleton
```

#### GuessInput Component
```tsx
interface GuessInputProps {
  onSubmit: (guess: string) => void;
  disabled: boolean;
  previousGuesses: string[];
}

// Features:
// - Fuzzy search suggestions
// - Validation feedback
// - Mobile-optimized keyboard
```

## Game Flow Implementation

### Game Session Flow
1. **Session Start**
   - User selects game from available list
   - Create game_session record
   - Load turn 1 images
   - Initialize WebSocket connection

2. **Turn Processing**
   ```javascript
   async function processTurn(sessionId, guesses) {
     // Validate guesses
     const results = await validateGuesses(guesses);
     
     // Update scores
     const turnScore = calculateTurnScore(results, currentTurn);
     
     // Check win condition
     if (allLocationsGuessed()) {
       return completeGame(sessionId, 'won');
     }
     
     // Advance turn
     if (currentTurn < 5) {
       await advanceTurn(sessionId);
       if (currentTurn === 3 || currentTurn === 5) {
         await revealNewImages(sessionId);
       }
     } else {
       return completeGame(sessionId, 'completed');
     }
   }
   ```

3. **Guess Validation**
   ```javascript
   function validateGuess(guess, correctAnswer) {
     // Exact match (case-insensitive)
     if (guess.toLowerCase() === correctAnswer.toLowerCase()) {
       return { isCorrect: true, matchType: 'exact' };
     }
     
     // Fuzzy match for common variations
     const distance = levenshteinDistance(guess.toLowerCase(), correctAnswer.toLowerCase());
     if (distance <= 2) {
       return { isCorrect: true, matchType: 'fuzzy' };
     }
     
     // Check aliases (e.g., "NYC" for "New York City")
     if (checkAliases(guess, correctAnswer)) {
       return { isCorrect: true, matchType: 'alias' };
     }
     
     return { isCorrect: false };
   }
   ```

## Admin System

### Game Generation Flow
1. **Theme Generation**
   ```javascript
   async function generateGameTheme(locationType) {
     const prompt = `Generate a one-word theme for a geography game...`;
     const response = await openai.chat.completions.create({
       model: "gpt-4",
       messages: [{ role: "system", content: prompt }],
       response_format: { type: "json_object" }
     });
     return JSON.parse(response.choices[0].message.content);
   }
   ```

2. **Image Generation**
   ```javascript
   async function generateLocationImage(location, theme, turnNumber) {
     const prompt = await generateImagePrompt(location, theme, turnNumber);
     const image = await openai.images.generate({
       model: "dall-e-3",
       prompt: prompt.image_prompt,
       size: "1024x1024",
       quality: "standard"
     });
     
     // Upload to S3
     const s3Key = await uploadToS3(image.data[0].url, location, turnNumber);
     return { s3Key, prompt: prompt.image_prompt };
   }
   ```

### Admin Dashboard Features
- **Game Creation**: AI-assisted or manual game creation
- **Game Management**: Enable/disable games, edit details
- **Analytics**: Play counts, difficulty analysis, user engagement
- **Image Review**: Preview and approve generated images
- **Batch Operations**: Generate multiple games at once

## Authentication & Authorization

### Google OAuth Implementation
```javascript
// passport-google-oauth20 strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  const user = await findOrCreateUser({
    googleId: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
    avatarUrl: profile.photos[0].value
  });
  return done(null, user);
}));
```

### Authorization Middleware
```javascript
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

## Image Management

### S3 Configuration
```javascript
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Bucket structure
// /games/{gameId}/{locationId}/turn-{1|3|5}.jpg
```

### Image Processing Pipeline
1. Generate image via DALL-E 3
2. Download and optimize image (resize to 1024x1024, compress)
3. Upload to S3 with proper metadata
4. Generate CloudFront URL for CDN delivery
5. Store reference in database

## Leaderboard System

### Real-time Updates
```javascript
// Redis-backed leaderboard
class LeaderboardService {
  async updateUserScore(userId, scoreChange) {
    // Update database
    await db.users.update({
      where: { id: userId },
      data: { total_score: { increment: scoreChange } }
    });
    
    // Update Redis sorted set
    await redis.zincrby('leaderboard:global', scoreChange, userId);
    
    // Emit real-time update
    io.emit('leaderboard:updated', await this.getTopPlayers(10));
  }
  
  async getLeaderboard(type = 'global', limit = 100) {
    const key = `leaderboard:${type}`;
    const userIds = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');
    // Fetch full user data from database
    return this.hydrateLeaderboard(userIds);
  }
}
```

## Mobile Optimization

### Responsive Design Strategy
1. **Mobile-First Approach**
   - Base styles for mobile (320px - 768px)
   - Progressive enhancement for tablets and desktop
   - Maximum content width of 768px on desktop

2. **Touch Optimization**
   - Minimum tap target size: 44x44px
   - Swipe gestures for image gallery
   - Optimized input fields with proper keyboard types

3. **Performance Optimization**
   - Lazy loading for images
   - Service worker for offline functionality
   - Aggressive caching strategy
   - WebP format with JPEG fallback

### PWA Configuration
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.amazonaws\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 1 week
        }
      }
    }
  ]
});
```

## Deployment & Infrastructure

### Environment Configuration
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/places_game
REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=places-game-images

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.placesgame.com
NEXT_PUBLIC_WS_URL=wss://api.placesgame.com
```

### Production Architecture
```
┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │────▶│   S3 Bucket     │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Load Balancer  │────▶│   Next.js App   │
└─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   API Servers   │────▶│   PostgreSQL    │
└─────────────────┘     └─────────────────┘
         │                       
         ▼                       
┌─────────────────┐             
│     Redis       │             
└─────────────────┘             
```

### Deployment Steps
1. **Database Setup**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

2. **S3 Bucket Configuration**
   - Enable public read access for images
   - Configure CORS for direct uploads
   - Set up lifecycle rules for old images

3. **Application Deployment**
   ```bash
   # Build application
   npm run build
   
   # Start production server
   npm run start
   ```

## Implementation Phases

### Phase 1: Core Game (Week 1-2)
- [ ] Set up project structure and dependencies
- [ ] Implement database schema
- [ ] Create basic API endpoints
- [ ] Build game session logic
- [ ] Develop GameBoard component
- [ ] Implement guess validation

### Phase 2: User System (Week 3)
- [ ] Integrate Google OAuth
- [ ] Create user profile pages
- [ ] Implement session management
- [ ] Add user statistics tracking
- [ ] Build authentication flow

### Phase 3: Image System (Week 4)
- [ ] Set up S3 integration
- [ ] Implement image generation pipeline
- [ ] Create image reveal animations
- [ ] Add image caching strategy
- [ ] Build image preloading

### Phase 4: Admin Tools (Week 5)
- [ ] Create admin dashboard
- [ ] Implement game generation UI
- [ ] Add game management features
- [ ] Build analytics dashboard
- [ ] Create moderation tools

### Phase 5: Social Features (Week 6)
- [ ] Implement real-time leaderboard
- [ ] Add WebSocket support
- [ ] Create sharing functionality
- [ ] Build achievement system
- [ ] Add social login options

### Phase 6: Polish & Launch (Week 7-8)
- [ ] Performance optimization
- [ ] Mobile testing and fixes
- [ ] PWA implementation
- [ ] Security audit
- [ ] Production deployment

## Success Metrics
- **User Engagement**: Average sessions per user per week
- **Game Completion Rate**: % of started games that are completed
- **Performance**: Page load time < 3s, Time to Interactive < 5s
- **Mobile Usage**: > 70% of users on mobile devices
- **User Retention**: 30-day retention rate > 40%