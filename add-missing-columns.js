#!/usr/bin/env node

/**
 * Add Missing Columns to Production GameV2 Table
 * Simple script to add only the missing columns
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

async function addMissingColumns() {
  console.log('🔧 Adding Missing Columns to GameV2 Table');
  console.log('==========================================');
  
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
    
    // Define required columns
    const requiredColumns = [
      { name: 'isPublished', sql: 'ALTER TABLE "GameV2" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false' },
      { name: 'publishedAt', sql: 'ALTER TABLE "GameV2" ADD COLUMN "publishedAt" DATETIME' },
      { name: 'updatedAt', sql: 'ALTER TABLE "GameV2" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'villainGender', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainGender" TEXT NOT NULL DEFAULT "female"' },
      { name: 'villainAge', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainAge" TEXT NOT NULL DEFAULT "30s"' },
      { name: 'villainEthnicity', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainEthnicity" TEXT NOT NULL DEFAULT "Mixed"' },
      { name: 'villainDistinctiveFeature', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainDistinctiveFeature" TEXT NOT NULL DEFAULT "Mysterious eyes"' },
      { name: 'villainClothingDescription', sql: 'ALTER TABLE "GameV2" ADD COLUMN "villainClothingDescription" TEXT NOT NULL DEFAULT "Professional attire"' },
      { name: 'caseTitle', sql: 'ALTER TABLE "GameV2" ADD COLUMN "caseTitle" TEXT NOT NULL DEFAULT "Untitled Case"' },
      { name: 'interestingFact', sql: 'ALTER TABLE "GameV2" ADD COLUMN "interestingFact" TEXT NOT NULL DEFAULT "Educational fact about locations"' }
    ];
    
    console.log('\\n🔧 Adding missing columns...');
    
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`   Adding: ${column.name}`);
        try {
          await prisma.$executeRawUnsafe(column.sql);
          console.log(`   ✅ ${column.name} added successfully`);
        } catch (error) {
          console.log(`   ❌ Failed to add ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  ${column.name} already exists`);
      }
    }
    
    // Test GameV2 creation
    console.log('\\n🧪 Testing GameV2 creation...');
    try {
      const testGame = await prisma.gameV2.create({
        data: {
          theme: 'Test',
          phrase: 'Test',
          villainName: 'Test',
          villainTitle: 'Test',
          crimeSummary: 'Test',
          finalObjective: 'Test',
          educationalFact: 'Test'
        }
      });
      
      console.log(`✅ Test successful! Game ID: ${testGame.id}`);
      
      // Clean up
      await prisma.gameV2.delete({ where: { id: testGame.id } });
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
    
    console.log('\\n🎉 Missing Columns Added Successfully!');
    
  } catch (error) {
    console.error('\\n❌ Failed to add columns:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();