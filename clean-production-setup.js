#!/usr/bin/env node

/**
 * Clean Production Database Setup
 * Drops all V2 tables and recreates them with correct schema
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.NODE_ENV === 'production' 
        ? "file:/db/production.db"
        : "file:./prisma/dev.db"
    }
  }
});

async function cleanProductionSetup() {
  console.log('🧹 Clean Production Database Setup');
  console.log('==================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${process.env.NODE_ENV === 'production' ? "file:/db/production.db" : "file:./prisma/dev.db"}`);
    
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Step 1: Drop all V2 tables
    console.log('\\n🗑️  Dropping existing V2 tables...');
    
    const v2Tables = [
      'PlayerCaseV2',
      'Clue', 
      'GameplayTurn',
      'GenerationV2',
      'FinalLocationV2',
      'LocationV2',
      'GameV2'
    ];
    
    for (const table of v2Tables) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}"`);
        console.log(`   ✅ Dropped ${table}`);
      } catch (error) {
        console.log(`   ⚠️  ${table} didn't exist or couldn't be dropped`);
      }
    }
    
    // Disconnect before running migrations
    await prisma.$disconnect();
    
    // Step 2: Run Prisma migrations to recreate tables
    console.log('\\n🏗️  Running Prisma migrations...');
    
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
          console.log('✅ Prisma migrations completed');
          resolve();
        } else {
          reject(new Error(`Migration failed with code ${code}`));
        }
      });
    });
    
    // Step 3: Regenerate Prisma client
    console.log('\\n🔄 Regenerating Prisma client...');
    
    const generateProcess = spawn('npx', ['prisma', 'generate'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.NODE_ENV === 'production' 
          ? "file:/db/production.db"
          : "file:./prisma/dev.db"
      }
    });
    
    await new Promise((resolve, reject) => {
      generateProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Prisma client regenerated');
          resolve();
        } else {
          reject(new Error(`Generate failed with code ${code}`));
        }
      });
    });
    
    // Step 4: Verify new setup
    console.log('\\n🔍 Verifying new setup...');
    
    // Create new Prisma client instance
    const newPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.NODE_ENV === 'production' 
            ? "file:/db/production.db"
            : "file:./prisma/dev.db"
        }
      }
    });
    
    try {
      await newPrisma.$connect();
      
      // Test all V2 models
      const tests = [
        { name: 'GameV2', fn: () => newPrisma.gameV2.count() },
        { name: 'LocationV2', fn: () => newPrisma.locationV2.count() },
        { name: 'FinalLocationV2', fn: () => newPrisma.finalLocationV2.count() },
        { name: 'GameplayTurn', fn: () => newPrisma.gameplayTurn.count() },
        { name: 'Clue', fn: () => newPrisma.clue.count() },
        { name: 'GenerationV2', fn: () => newPrisma.generationV2.count() },
        { name: 'PlayerCaseV2', fn: () => newPrisma.playerCaseV2.count() }
      ];
      
      for (const test of tests) {
        try {
          const count = await test.fn();
          console.log(`   ✅ ${test.name}: ${count} records`);
        } catch (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
          throw error;
        }
      }
      
      // Test V2 game creation
      console.log('\\n🧪 Testing V2 game creation...');
      
      const testGame = await newPrisma.gameV2.create({
        data: {
          theme: 'Test Theme',
          phrase: 'Test Phrase',
          category: 'Geography',
          difficulty: 'Medium',
          villainName: 'Test Villain',
          villainTitle: 'Test Title',
          villainGender: 'female',
          villainAge: '30s',
          villainEthnicity: 'Mixed',
          villainDistinctiveFeature: 'Test feature',
          villainClothingDescription: 'Test clothing',
          caseTitle: 'Test Case',
          crimeSummary: 'Test crime summary',
          interestingFact: 'Test interesting fact',
          finalLocationObjective: 'WHERE_STASHED',
          finalLocationNarrative: 'Test narrative',
          finalInterestingFact: 'Test final fact',
          gameCompletionMessage: 'Test completion message'
        }
      });
      
      console.log(`   ✅ GameV2 creation successful! ID: ${testGame.id}`);
      
      // Test GenerationV2 creation
      const testGeneration = await newPrisma.generationV2.create({
        data: {
          gameV2Id: testGame.id,
          status: 'pending',
          currentStep: 'test',
          totalSteps: 10,
          completedSteps: 0
        }
      });
      
      console.log(`   ✅ GenerationV2 creation successful! ID: ${testGeneration.id}`);
      
      // Clean up test data
      await newPrisma.generationV2.delete({ where: { id: testGeneration.id } });
      await newPrisma.gameV2.delete({ where: { id: testGame.id } });
      console.log('   ✅ Test data cleaned up');
      
      console.log('\\n🎉 Clean Production Setup Complete!');
      console.log('====================================');
      console.log('✅ All V2 tables dropped and recreated');
      console.log('✅ Schema matches Prisma models perfectly');
      console.log('✅ V2 game generation ready to work');
      console.log('✅ Fresh start with clean database');
      
      console.log('\\n🚀 Ready for V2 Game Generation!');
      console.log('Try: https://worldwidechase.onrender.com/admin/generate-v2.html');
      
    } finally {
      await newPrisma.$disconnect();
    }
    
  } catch (error) {
    console.error('\\n❌ Clean setup failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  cleanProductionSetup()
    .then(() => {
      console.log('\\n🏁 Clean setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n💥 Clean setup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanProductionSetup };