#!/usr/bin/env node

/**
 * Production Schema Fix Script
 * Adds missing columns to GameV2 table in production
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

async function fixProductionSchema() {
  console.log('🔧 Fixing Production Database Schema');
  console.log('===================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database URL: ${process.env.NODE_ENV === 'production' ? "file:/db/production.db" : "file:./prisma/dev.db"}`);
    
    // Test database connection
    console.log('\n🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check current GameV2 table structure
    console.log('\n🔍 Checking GameV2 table structure...');
    
    try {
      const result = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
      console.log('Current GameV2 columns:');
      result.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });
      
      // Check if isPublished exists
      const hasIsPublished = result.some(col => col.name === 'isPublished');
      
      if (hasIsPublished) {
        console.log('\n✅ isPublished column already exists!');
      } else {
        console.log('\n❌ isPublished column missing, adding it...');
        
        // Add missing isPublished column
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "GameV2" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true
        `);
        console.log('✅ Added isPublished column');
      }
      
      // Check for other potentially missing columns
      const expectedColumns = [
        { name: 'isPublished', type: 'BOOLEAN', default: 'true' },
        { name: 'isActive', type: 'BOOLEAN', default: 'true' },
        { name: 'visibility', type: 'TEXT', default: "'public'" },
        { name: 'status', type: 'TEXT', default: "'completed'" }
      ];
      
      for (const expectedCol of expectedColumns) {
        const hasColumn = result.some(col => col.name === expectedCol.name);
        
        if (!hasColumn) {
          console.log(`Adding missing column: ${expectedCol.name}`);
          
          await prisma.$executeRawUnsafe(`
            ALTER TABLE "GameV2" ADD COLUMN "${expectedCol.name}" ${expectedCol.type} NOT NULL DEFAULT ${expectedCol.default}
          `);
          console.log(`✅ Added ${expectedCol.name} column`);
        }
      }
      
    } catch (error) {
      if (error.message.includes('no such table')) {
        console.log('❌ GameV2 table does not exist! Running full migration...');
        
        // Run the full migration
        const { runSQLMigration } = require('./migrate-production-sql.js');
        await runSQLMigration();
        
      } else {
        throw error;
      }
    }
    
    // Verify the fix worked
    console.log('\n🔍 Verifying schema fix...');
    
    try {
      // Try to create a test GameV2 record
      const testGame = await prisma.gameV2.create({
        data: {
          theme: 'Test Theme',
          phrase: 'Test Phrase',
          category: 'Geography',
          difficulty: 'Easy',
          villainName: 'Test Villain',
          villainTitle: 'Test Title',
          crime: 'Test Crime',
          crimeSummary: 'Test Summary',
          finalObjective: 'Test Objective',
          educationalFact: 'Test Fact'
        }
      });
      
      console.log(`✅ GameV2 creation test successful! Created game: ${testGame.id}`);
      
      // Clean up test record
      await prisma.gameV2.delete({
        where: { id: testGame.id }
      });
      console.log('✅ Test record cleaned up');
      
    } catch (error) {
      console.error('❌ GameV2 creation still failing:', error.message);
      throw error;
    }
    
    console.log('\n🎉 Production Schema Fix Complete!');
    console.log('==================================');
    console.log('✅ GameV2 table structure corrected');
    console.log('✅ V2 game generation should work now');
    
  } catch (error) {
    console.error('\n❌ Schema fix failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  fixProductionSchema()
    .then(() => {
      console.log('\n🏁 Schema fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionSchema };