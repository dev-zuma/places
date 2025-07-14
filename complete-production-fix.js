#!/usr/bin/env node

/**
 * Complete Production Database Fix
 * Adds ALL missing columns and regenerates Prisma client
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

async function completeProductionFix() {
  console.log('🔧 Complete Production Database Fix');
  console.log('==================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get current table structure
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    const existingColumns = tableInfo.map(col => col.name);
    
    console.log('\\n📋 Current GameV2 columns:');
    existingColumns.forEach(col => console.log(`  - ${col}`));
    
    // Complete list of ALL required columns from Prisma schema
    const allRequiredColumns = [
      { name: 'isPublished', sql: 'ALTER TABLE "GameV2" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false' },
      { name: 'publishedAt', sql: 'ALTER TABLE "GameV2" ADD COLUMN "publishedAt" DATETIME' },
      { name: 'updatedAt', sql: 'ALTER TABLE "GameV2" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'villainGender', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainGender" TEXT NOT NULL DEFAULT "female"' },
      { name: 'villainAge', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainAge" TEXT NOT NULL DEFAULT "30s"' },
      { name: 'villainEthnicity', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainEthnicity" TEXT NOT NULL DEFAULT "Mixed"' },
      { name: 'villainDistinctiveFeature', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainDistinctiveFeature" TEXT NOT NULL DEFAULT "Mysterious eyes"' },
      { name: 'villainClothingDescription', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainClothingDescription" TEXT NOT NULL DEFAULT "Professional attire"' },
      { name: 'caseTitle', sql: 'ALTER TABLE "GameV2" ADD COLUMN "caseTitle" TEXT NOT NULL DEFAULT "Untitled Case"' },
      { name: 'interestingFact', sql: 'ALTER TABLE "GameV2" ADD COLUMN "interestingFact" TEXT NOT NULL DEFAULT "Educational fact about locations"' },
      // NEW: Missing columns causing current errors
      { name: 'finalLocationObjective', sql: 'ALTER TABLE "GameV2" ADD COLUMN "finalLocationObjective" TEXT NOT NULL DEFAULT "WHERE_STASHED"' },
      { name: 'finalLocationNarrative', sql: 'ALTER TABLE "GameV2" ADD COLUMN "finalLocationNarrative" TEXT NOT NULL DEFAULT "Find the final location"' },
      { name: 'finalInterestingFact', sql: 'ALTER TABLE "GameV2" ADD COLUMN "finalInterestingFact" TEXT NOT NULL DEFAULT "Final revelation about the case"' },
      { name: 'gameCompletionMessage', sql: 'ALTER TABLE "GameV2" ADD COLUMN "gameCompletionMessage" TEXT NOT NULL DEFAULT "Case closed successfully!"' }
    ];
    
    console.log('\\n🔧 Adding missing columns...');
    
    let addedCount = 0;
    for (const column of allRequiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`   Adding: ${column.name}`);
        try {
          await prisma.$executeRawUnsafe(column.sql);
          console.log(`   ✅ ${column.name} added successfully`);
          addedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to add ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  ${column.name} already exists`);
      }
    }
    
    console.log(`\\n📊 Added ${addedCount} new columns`);
    
    // Disconnect Prisma before regenerating client
    await prisma.$disconnect();
    
    // Regenerate Prisma client
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
          console.log('✅ Prisma client regenerated successfully');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });
    });
    
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
    
    // Test GameV2 creation with new client
    console.log('\\n🧪 Testing GameV2 creation with all required fields...');
    try {
      const testGame = await newPrisma.gameV2.create({
        data: {
          theme: 'Test Theme',
          phrase: 'Test Phrase',
          category: 'Geography',
          difficulty: 'Medium',
          villainName: 'Test Villain',
          villainTitle: 'Test Title',
          caseTitle: 'Test Case',
          crimeSummary: 'Test crime summary',
          interestingFact: 'Test interesting fact',
          finalLocationObjective: 'WHERE_STASHED',
          finalLocationNarrative: 'Test narrative',
          finalInterestingFact: 'Test final fact',
          gameCompletionMessage: 'Test completion message'
        }
      });
      
      console.log(`✅ Test successful! Game ID: ${testGame.id}`);
      
      // Clean up
      await newPrisma.gameV2.delete({ where: { id: testGame.id } });
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    } finally {
      await newPrisma.$disconnect();
    }
    
    console.log('\\n🎉 Complete Production Fix Successful!');
    console.log('======================================');
    console.log(`✅ Added ${addedCount} missing columns`);
    console.log('✅ Regenerated Prisma client');
    console.log('✅ Verified GameV2 creation works');
    console.log('✅ Production V2 game generation should work now!');
    
  } catch (error) {
    console.error('\\n❌ Complete fix failed:', error);
    process.exit(1);
  }
}

completeProductionFix();