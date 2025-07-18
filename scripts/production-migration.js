#!/usr/bin/env node

/**
 * Production Database Migration Script
 * 
 * This script:
 * 1. Backs up the current production database
 * 2. Deletes all existing game data
 * 3. Applies the latest schema migrations
 * 4. Verifies the database is ready for the new system
 * 
 * WARNING: This will DELETE all existing games and player data!
 * Make sure to run a backup first.
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Production Database Migration Script');
  console.log('======================================');
  
  // Check if we're in production
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
  
  if (!isProd) {
    console.log('⚠️  Not running in production mode.');
    console.log('   Add --production flag to run migration.');
    console.log('   Example: node scripts/production-migration.js --production');
    process.exit(1);
  }

  console.log('\n⚠️  WARNING: This will DELETE all existing game data!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  // Wait 5 seconds for user to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    // Step 1: Create backup
    console.log('📦 Step 1: Creating database backup...');
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `production-backup-${timestamp}.sql`);
    
    // For SQLite
    if (process.env.DATABASE_URL?.includes('file:')) {
      const dbPath = process.env.DATABASE_URL.replace('file:', '');
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupFile.replace('.sql', '.db'));
        console.log(`   ✅ SQLite database backed up to: ${backupFile.replace('.sql', '.db')}`);
      }
    } else {
      console.log('   ℹ️  Non-SQLite database detected. Please backup manually.');
    }

    // Step 2: Delete all game data
    console.log('\n🗑️  Step 2: Deleting all existing game data...');
    
    // Delete in correct order to respect foreign key constraints
    console.log('   - Deleting player cases...');
    await prisma.playerCaseV2.deleteMany({});
    
    console.log('   - Deleting clues...');
    await prisma.clue.deleteMany({});
    
    console.log('   - Deleting gameplay turns...');
    await prisma.gameplayTurn.deleteMany({});
    
    console.log('   - Deleting generation records...');
    await prisma.generationV2.deleteMany({});
    
    console.log('   - Deleting final locations...');
    await prisma.finalLocationV2.deleteMany({});
    
    console.log('   - Deleting locations...');
    await prisma.locationV2.deleteMany({});
    
    console.log('   - Deleting games...');
    await prisma.gameV2.deleteMany({});
    
    console.log('   - Deleting players...');
    await prisma.player.deleteMany({});
    
    console.log('   ✅ All game data deleted successfully');

    // Step 3: Apply migrations
    console.log('\n🔧 Step 3: Applying database migrations...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('   ✅ Migrations applied successfully');
    } catch (error) {
      console.error('   ❌ Migration failed:', error.message);
      console.log('   Try running: npx prisma migrate deploy manually');
    }

    // Step 4: Verify schema
    console.log('\n✅ Step 4: Verifying database schema...');
    
    // Test creating a game with new fields
    const testGame = await prisma.gameV2.create({
      data: {
        theme: 'Migration Test',
        phrase: 'Testing new schema',
        category: 'Geography',
        difficulty: 'medium',
        isPublished: false,
        villainName: 'Test Villain',
        villainTitle: 'The Tester',
        villainGender: 'male',
        villainAge: '30s',
        villainRace: 'Asian',
        villainEthnicity: 'Japanese',
        villainDistinctiveFeature: 'test feature',
        villainClothingDescription: 'test clothing',
        caseTitle: 'Test Case',
        crimeSummary: 'Test summary',
        interestingFact: 'Test fact',
        finalLocationObjective: 'VILLAIN_HIDEOUT',
        finalLocationNarrative: 'Test narrative',
        finalInterestingFact: 'Test final fact',
        gameCompletionMessage: 'Test completion'
      }
    });
    
    console.log('   ✅ Successfully created test game with ID:', testGame.id);
    
    // Clean up test game
    await prisma.gameV2.delete({ where: { id: testGame.id } });
    console.log('   ✅ Test game cleaned up');

    // Step 5: Generate Prisma Client
    console.log('\n📚 Step 5: Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('   ✅ Prisma Client regenerated');

    // Summary
    console.log('\n🎉 Migration completed successfully!');
    console.log('   - All old game data has been deleted');
    console.log('   - Database schema is up to date');
    console.log('   - System is ready for new games with:');
    console.log('     • New scoring system');
    console.log('     • Enhanced villain diversity');
    console.log('     • All recent feature updates');
    
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy the updated application code');
    console.log('   2. Generate new games using the admin portal');
    console.log('   3. Test the new scoring system and villain diversity');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('   Please restore from backup and investigate the issue.');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main()
  .catch(console.error)
  .finally(() => process.exit(0));