/**
 * Production Database Migration Script
 * Adds villainRace column to GameV2 table
 * 
 * Usage: node add-villain-race-column.js
 * 
 * This script safely adds the villainRace column to existing production databases.
 * Existing games will have the field set to NULL (will display "Not specified" in admin).
 */

const { PrismaClient } = require('@prisma/client');

async function addVillainRaceColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Starting villainRace column migration...');
    
    // Check if the column already exists
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT villainRace FROM GameV2 LIMIT 1
      `;
      console.log('✅ villainRace column already exists, migration not needed');
      return;
    } catch (error) {
      // Column doesn't exist, proceed with migration
      console.log('📝 villainRace column not found, adding it...');
    }
    
    // Add the villainRace column to the GameV2 table
    await prisma.$executeRaw`
      ALTER TABLE GameV2 ADD COLUMN villainRace TEXT
    `;
    
    console.log('✅ Successfully added villainRace column to GameV2 table');
    
    // Get count of existing games
    const gameCount = await prisma.gameV2.count();
    console.log(`📊 Found ${gameCount} existing games`);
    
    if (gameCount > 0) {
      console.log('ℹ️  Existing games will show "Not specified" for race until updated');
      console.log('ℹ️  New games will automatically populate both race and ethnicity fields');
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  addVillainRaceColumn()
    .then(() => {
      console.log('✨ Database migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { addVillainRaceColumn };