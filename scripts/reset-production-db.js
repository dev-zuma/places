#!/usr/bin/env node

/**
 * Quick Production Database Reset Script
 * 
 * This script quickly deletes all game data in production.
 * Use this when you need to clear the database without running full migrations.
 * 
 * WARNING: This will DELETE all games and player data!
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🔄 Production Database Reset');
  console.log('===========================');
  
  if (!process.argv.includes('--confirm')) {
    console.log('\n⚠️  This will DELETE all games and player data!');
    console.log('   Run with --confirm flag to proceed:');
    console.log('   node scripts/reset-production-db.js --confirm\n');
    process.exit(1);
  }

  try {
    console.log('\n🗑️  Deleting all data...\n');
    
    // Delete in correct order
    const deletions = [
      { name: 'Player Cases', fn: () => prisma.playerCaseV2.deleteMany({}) },
      { name: 'Clues', fn: () => prisma.clue.deleteMany({}) },
      { name: 'Gameplay Turns', fn: () => prisma.gameplayTurn.deleteMany({}) },
      { name: 'Generation Records', fn: () => prisma.generationV2.deleteMany({}) },
      { name: 'Final Locations', fn: () => prisma.finalLocationV2.deleteMany({}) },
      { name: 'Locations', fn: () => prisma.locationV2.deleteMany({}) },
      { name: 'Games', fn: () => prisma.gameV2.deleteMany({}) },
      { name: 'Players', fn: () => prisma.player.deleteMany({}) }
    ];

    for (const { name, fn } of deletions) {
      process.stdout.write(`   Deleting ${name}...`);
      const result = await fn();
      console.log(` ✅ (${result.count} records)`);
    }

    console.log('\n✅ Database reset complete!');
    console.log('   All games and player data have been removed.');
    console.log('   The database is now empty and ready for new games.\n');

  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();