# Production Database Migration Guide

## Issue
The production database at `/db/production.db` needs to be migrated to include V2 game models. Without this migration, V2 game generation fails with:
```
TypeError: Cannot read properties of undefined (reading 'findMany')
TypeError: Cannot read properties of undefined (reading 'create')
```

## Solution
Run the migration script to add V2 tables to the production database.

## Step-by-Step Instructions

### Option 1: Using Render Shell (Recommended)

1. **Access Render Dashboard**
   - Go to your Render dashboard
   - Find your `worldwidechase` service
   - Click on the service name

2. **Open Shell**
   - Click on "Shell" tab in the service dashboard
   - This opens a terminal connected to your production server

3. **Run Migration**
   ```bash
   # Navigate to app directory (should already be there)
   cd /opt/render/project/src
   
   # Run the SQL-based migration script
   NODE_ENV=production node migrate-production-sql.js
   ```

4. **Verify Success**
   You should see output like:
   ```
   ✅ GameV2: 0 records
   ✅ LocationV2: 0 records  
   ✅ FinalLocationV2: 0 records
   ✅ GameplayTurn: 0 records
   ✅ Clue: 0 records
   ✅ PlayerCaseV2: 0 records
   ✅ GenerationV2: 0 records
   🎉 SQL Migration Complete!
   ```

5. **Test V2 Generation**
   - Go to https://worldwidechase.onrender.com/admin/generate-v2.html
   - Try generating a V2 game
   - Should work without errors

### Option 2: Using Prisma Deploy (Alternative)

If the SQL script doesn't work, try:

```bash
# In Render shell
NODE_ENV=production npx prisma migrate deploy
```

### Option 3: Manual Upload (If needed)

If both options fail:

1. **Download current production database**
   ```bash
   # In Render shell - backup current DB
   cp /db/production.db /db/production-backup.db
   ```

2. **Create migrated database locally**
   ```bash
   # On your local machine
   cp /path/to/your/dev.db production-migrated.db
   # Upload this to production /db/ directory
   ```

## Files Created

- `migrate-production-sql.js` - SQL-based migration script
- `migrate-production-db.js` - Prisma-based migration script  
- `PRODUCTION-MIGRATION-GUIDE.md` - This guide

## What the Migration Does

The migration adds these V2 tables:
- **GameV2** - Enhanced game metadata with villain profiles
- **LocationV2** - Crime scene locations with turn-based images
- **FinalLocationV2** - Final hideout locations for deduction
- **GameplayTurn** - Turn-by-turn gameplay structure
- **Clue** - Individual clues within each turn
- **PlayerCaseV2** - Player progress and scoring for V2 games
- **GenerationV2** - Performance tracking for game generation

## Verification

After migration, these should work:
- ✅ V2 game generation at `/admin/generate-v2.html`
- ✅ V2 games list at `/admin/games-v2.html`
- ✅ V2 detective interface at `/game/detective-v2.html`
- ✅ Gallery tabs showing V2 cases
- ✅ V2 scoring and player tracking

## Troubleshooting

### If migration fails:
1. Check Render logs for specific error messages
2. Verify database permissions at `/db/production.db`
3. Ensure sufficient disk space
4. Try the alternative Prisma migrate command

### If V2 generation still fails:
1. Restart the Render service
2. Check environment variables are set
3. Verify OpenAI API key is working
4. Check S3 bucket permissions

### If tables exist but are empty:
This is normal for a fresh migration. V2 games will be created as you generate them.

## Contact
If you encounter issues, the migration scripts include detailed error logging to help diagnose problems.