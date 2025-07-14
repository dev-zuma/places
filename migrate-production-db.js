#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Migrates production database to include V2 game models
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'production' 
        ? "file:/db/production.db"
        : "file:./prisma/dev.db"
    }
  }
});

async function runProductionMigration() {
  console.log('🚀 Starting Production Database Migration');
  console.log('========================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database URL: ${process.env.NODE_ENV === 'production' ? "file:/db/production.db" : "file:./prisma/dev.db"}`);
    
    // Test database connection
    console.log('\n🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if V2 tables already exist
    console.log('\n🔍 Checking for existing V2 tables...');
    
    try {
      // Try to query V2 tables - if they exist, this won't throw
      const gameV2Count = await prisma.gameV2.count();
      console.log(`✅ GameV2 table exists with ${gameV2Count} records`);
      
      const locationV2Count = await prisma.locationV2.count();
      console.log(`✅ LocationV2 table exists with ${locationV2Count} records`);
      
      console.log('\n🎉 V2 tables already exist! Migration not needed.');
      return;
      
    } catch (error) {
      console.log('📋 V2 tables do not exist. Proceeding with migration...');
    }
    
    // Run the migration using Prisma CLI commands
    console.log('\n🛠️  Running database migration...');
    
    // Deploy pending migrations
    const { spawn } = require('child_process');
    
    const migrateProcess = spawn('npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.NODE_ENV === 'production' 
          ? "file:/db/production.db"
          : "file:./prisma/dev.db"
      }
    });
    
    await new Promise((resolve, reject) => {
      migrateProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Migration process exited with code ${code}`));
        }
      });
    });
    
    console.log('\n✅ Database migration completed!');
    
    // Verify migration success
    console.log('\n🔍 Verifying migration...');
    
    const gameV2Count = await prisma.gameV2.count();
    console.log(`✅ GameV2 table: ${gameV2Count} records`);
    
    const locationV2Count = await prisma.locationV2.count();
    console.log(`✅ LocationV2 table: ${locationV2Count} records`);
    
    const finalLocationV2Count = await prisma.finalLocationV2.count();
    console.log(`✅ FinalLocationV2 table: ${finalLocationV2Count} records`);
    
    const gameplayTurnCount = await prisma.gameplayTurn.count();
    console.log(`✅ GameplayTurn table: ${gameplayTurnCount} records`);
    
    const clueCount = await prisma.clue.count();
    console.log(`✅ Clue table: ${clueCount} records`);
    
    const playerCaseV2Count = await prisma.playerCaseV2.count();
    console.log(`✅ PlayerCaseV2 table: ${playerCaseV2Count} records`);
    
    console.log('\n🎉 Production Database Migration Complete!');
    console.log('==========================================');
    console.log('✅ All V2 game models are now available');
    console.log('✅ V2 game generation should work properly');
    console.log('✅ V2 scoring and player tracking enabled');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  runProductionMigration()
    .then(() => {
      console.log('\n🏁 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runProductionMigration };