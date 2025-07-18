# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure these are set in production environment:
```bash
PORT=9091
OPENAI_API_KEY=your_openai_api_key
AWS_S3_BUCKET_NAME=placesgame-images
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
NODE_ENV=production
```

### 2. Dependencies
```bash
npm install --production
```

### 3. Database Schema Reset
⚠️ **WARNING: This will completely reset the database schema!**

#### Option A: Clean Schema Reset (Recommended for production)
```bash
node scripts/reset-production-schema.js --confirm
```
This script will:
- Drop all existing tables
- Apply the latest schema from scratch
- Regenerate Prisma client
- Verify the schema works correctly

#### Option B: Quick Data Reset (If schema is already correct)
```bash
node scripts/reset-production-db.js --confirm
```

#### Option C: One-Command Deployment
```bash
./deploy-production.sh
```
This handles the complete deployment including dependencies and schema reset.

### 4. Start Application
```bash
node server-unified.js
```

## Post-Deployment Verification

### 1. Health Check
- [ ] Server starts without errors
- [ ] Admin portal accessible at `/admin/`
- [ ] Game interface accessible at `/game/`
- [ ] API endpoints responding correctly

### 2. Feature Testing
- [ ] Generate a test game via admin portal
- [ ] Verify villain diversity (generate multiple games)
- [ ] Test new scoring system in a complete game
- [ ] Verify endgame modal shows score breakdown
- [ ] Check leaderboard functionality

### 3. Core Game Features
- [ ] Case gallery displays properly
- [ ] Detective interface loads correctly
- [ ] Timer system works
- [ ] Location checking accepts correct answers
- [ ] Turn 6 only accessible after all 3 locations correct
- [ ] Image modals work properly
- [ ] Investigation Journal tabs function correctly

## What's New in This Deployment

### New Scoring System
- **Achievement-based scoring**: 2000/1500/1000/500/250 points
- **Difficulty bonuses**: +250 (medium), +500 (hard)
- **Time bonus**: +250 for completion under 5 minutes
- **Score breakdown**: Detailed display in endgame modal

### Enhanced Villain Diversity
- **True randomization**: Uses Unix timestamp for race selection
- **Balanced distribution**: Each race has ~12.5% probability
- **Pre-selected race**: OpenAI gets specific race, chooses ethnicity
- **No AI bias**: Eliminates tendency to pick first-listed options

### Bug Fixes
- **Turn 6 access**: Now properly requires ALL 3 locations correct
- **Modal improvements**: Compact display with integrated button
- **JavaScript errors**: Fixed syntax errors in location checking

## Rollback Plan

If issues occur, restore from backup:

1. **Stop the application**
2. **Restore database from backup** (created during migration)
3. **Revert to previous code version**:
   ```bash
   git checkout 7e895f3  # Previous working commit
   ```
4. **Restart application**

## Performance Monitoring

Monitor these metrics post-deployment:
- **Response times** for game generation
- **Error rates** in game play
- **Villain diversity** in generated games
- **Scoring accuracy** in completed games
- **Database query performance**

## Support

If issues arise:
1. Check server logs for errors
2. Verify environment variables are set correctly
3. Ensure database migrations completed successfully
4. Test core functionality with manual game generation

## Contact

For deployment issues or questions, check:
- Server logs: Check console output for errors
- Database status: Use `npx prisma studio` to inspect data
- API health: Test endpoints with curl or Postman