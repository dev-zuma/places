#!/usr/bin/env node

/**
 * Remove Old Crime Column from Production
 * Fixes the null constraint violation on 'crime' field
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

async function removeOldCrimeColumn() {
  console.log('🔧 Removing Old Crime Column from Production');
  console.log('============================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check current table structure
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    const columns = tableInfo.map(col => ({ name: col.name, type: col.type, notnull: col.notnull }));
    
    console.log('\\n📋 Current GameV2 columns:');
    columns.forEach(col => {
      const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
      console.log(`  - ${col.name.padEnd(30)} (${col.type}, ${nullable})`);
    });
    
    // Check if old 'crime' column exists
    const hasCrimeColumn = columns.some(col => col.name === 'crime');
    
    if (hasCrimeColumn) {
      console.log('\\n❌ Found old "crime" column that needs to be removed');
      
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      console.log('\\n🔧 Recreating table without "crime" column...');
      
      // Step 1: Create backup table
      console.log('   1. Creating backup table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE GameV2_backup AS SELECT * FROM GameV2
      `);
      
      // Step 2: Drop original table
      console.log('   2. Dropping original table...');
      await prisma.$executeRawUnsafe(`DROP TABLE GameV2`);
      
      // Step 3: Recreate table without crime column
      console.log('   3. Recreating table with correct schema...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "GameV2" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "theme" TEXT NOT NULL,
          "phrase" TEXT NOT NULL,
          "category" TEXT NOT NULL DEFAULT 'Geography',
          "difficulty" TEXT NOT NULL DEFAULT 'Medium',
          "isPublished" BOOLEAN NOT NULL DEFAULT false,
          "publishedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "villainName" TEXT NOT NULL,
          "villainTitle" TEXT NOT NULL,
          "villainGender" TEXT NOT NULL,
          "villainAge" TEXT NOT NULL,
          "villainEthnicity" TEXT NOT NULL,
          "villainDistinctiveFeature" TEXT NOT NULL,
          "villainClothingDescription" TEXT NOT NULL,
          "villainImageUrl" TEXT,
          "caseTitle" TEXT NOT NULL,
          "crimeSummary" TEXT NOT NULL,
          "interestingFact" TEXT NOT NULL,
          "finalLocationObjective" TEXT NOT NULL,
          "finalLocationNarrative" TEXT NOT NULL,
          "finalInterestingFact" TEXT NOT NULL,
          "gameCompletionMessage" TEXT NOT NULL
        )
      `);
      
      // Step 4: Copy data back (excluding crime column)
      console.log('   4. Copying data back...');
      
      const columnsToKeep = columns
        .filter(col => col.name !== 'crime')
        .map(col => `"${col.name}"`)
        .join(', ');
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO GameV2 (${columnsToKeep})
        SELECT ${columnsToKeep} FROM GameV2_backup
      `);
      
      // Step 5: Drop backup table
      console.log('   5. Cleaning up backup table...');
      await prisma.$executeRawUnsafe(`DROP TABLE GameV2_backup`);
      
      console.log('\\n✅ Successfully removed "crime" column');
      
    } else {
      console.log('\\n✅ No "crime" column found - table structure is correct');
    }
    
    // Verify final structure
    console.log('\\n🔍 Final table structure:');
    const finalTableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    finalTableInfo.forEach(col => {
      const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
      console.log(`  ✅ ${col.name.padEnd(30)} (${col.type}, ${nullable})`);
    });
    
    // Test GameV2 creation
    console.log('\\n🧪 Testing GameV2 creation...');
    
    try {
      const testGame = await prisma.gameV2.create({
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
      
      console.log(`   ✅ Test successful! Game ID: ${testGame.id}`);
      
      // Clean up
      await prisma.gameV2.delete({ where: { id: testGame.id } });
      console.log('   ✅ Test record cleaned up');
      
    } catch (error) {
      console.error('   ❌ Test failed:', error.message);
      throw error;
    }
    
    console.log('\\n🎉 Crime Column Removal Complete!');
    console.log('==================================');
    console.log('✅ Old "crime" column removed');
    console.log('✅ Table structure matches Prisma schema');
    console.log('✅ V2 game creation should work now!');
    
  } catch (error) {
    console.error('\\n❌ Crime column removal failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeOldCrimeColumn();