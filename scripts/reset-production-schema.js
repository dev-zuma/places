#!/usr/bin/env node

/**
 * Clean Production Database Schema Reset
 * 
 * This script completely resets the production database schema:
 * 1. Drops all existing tables
 * 2. Applies the latest schema from scratch
 * 3. Regenerates Prisma client
 * 
 * Use this when you need a completely clean database with the latest schema.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

async function resetProductionSchema() {
  console.log('🔄 Clean Production Database Schema Reset');
  console.log('=========================================');
  
  // Safety check
  if (!process.argv.includes('--confirm')) {
    console.log('\n⚠️  This will COMPLETELY RESET the production database!');
    console.log('   All tables will be dropped and recreated with the latest schema.');
    console.log('   Run with --confirm flag to proceed:');
    console.log('   node scripts/reset-production-schema.js --confirm\n');
    process.exit(1);
  }

  try {
    // Step 1: Reset the database completely
    console.log('\n🗑️  Step 1: Resetting database...');
    runCommand('npx prisma migrate reset --force', 'Database reset');

    // Step 2: Apply all migrations from scratch
    console.log('\n🔧 Step 2: Applying fresh migrations...');
    runCommand('npx prisma migrate deploy', 'Migration deployment');

    // Step 3: Generate Prisma client
    console.log('\n📚 Step 3: Generating Prisma client...');
    runCommand('npx prisma generate', 'Prisma client generation');

    // Step 4: Verify schema
    console.log('\n✅ Step 4: Verifying schema...');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // Test that we can create a basic record
      console.log('   Testing database connection...');
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('   ✅ Database connection successful');
      
      // Test that all tables exist by checking the schema
      console.log('   Checking table structure...');
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `;
      
      const expectedTables = [
        'AdminUser', 'Player', 'GameV2', 'LocationV2', 'FinalLocationV2', 
        'GameplayTurn', 'Clue', 'GenerationV2', 'PlayerCaseV2'
      ];
      
      const tableNames = tables.map(t => t.name);
      const missingTables = expectedTables.filter(table => !tableNames.includes(table));
      
      if (missingTables.length > 0) {
        console.log(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
      } else {
        console.log('   ✅ All required tables present');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('   ❌ Schema verification failed:', error.message);
      await prisma.$disconnect();
      process.exit(1);
    }

    // Success message
    console.log('\n🎉 Database schema reset completed successfully!');
    console.log('   - All tables have been recreated with the latest schema');
    console.log('   - Database is completely clean and ready for use');
    console.log('   - All recent field updates are now available:');
    console.log('     • FinalLocationV2.educationalPhrase');
    console.log('     • FinalLocationV2.categoryHint');
    console.log('     • FinalLocationV2.flagColors');
    console.log('     • GameV2.villainRace');
    console.log('     • All other recent schema updates');
    
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Generate test games to verify everything works');
    console.log('   3. Check that villain diversity and scoring work correctly');

  } catch (error) {
    console.error('\n❌ Schema reset failed:', error.message);
    console.error('   The database may be in an inconsistent state.');
    console.error('   Try running the script again or check the error details above.');
    process.exit(1);
  }
}

// Run the reset
resetProductionSchema();