#!/usr/bin/env node

/**
 * Check Database Column Structure
 * Verify what columns exist vs what code expects
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

async function checkDatabaseColumns() {
  console.log('🔍 Checking Database Column Structure');
  console.log('=====================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get complete table structure
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    
    console.log('\\n📋 Complete GameV2 table structure:');
    console.log('=====================================');
    
    tableInfo.forEach(col => {
      const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
      const defaultVal = col.dflt_value ? `DEFAULT ${col.dflt_value}` : 'NO DEFAULT';
      console.log(`${col.name.padEnd(35)} | ${col.type.padEnd(10)} | ${nullable.padEnd(10)} | ${defaultVal}`);
    });
    
    // Check for problematic columns
    console.log('\\n🔍 Checking for problematic columns:');
    console.log('====================================');
    
    const problemColumns = tableInfo.filter(col => 
      col.notnull && !col.dflt_value && !['id', 'createdAt'].includes(col.name)
    );
    
    if (problemColumns.length > 0) {
      console.log('❌ Found NOT NULL columns without defaults:');
      problemColumns.forEach(col => {
        console.log(`   - ${col.name}: ${col.type} NOT NULL (no default)`);
      });
      
      console.log('\\n🔧 These columns need defaults or should be nullable');
      
      // Generate fix SQL
      console.log('\\n📝 Fix SQL commands:');
      problemColumns.forEach(col => {
        if (col.name === 'crime') {
          console.log(`   -- Remove crime column or add default:`);
          console.log(`   ALTER TABLE "GameV2" DROP COLUMN "crime";`);
          console.log(`   -- OR --`);
          console.log(`   UPDATE "GameV2" SET "crime" = "TBD" WHERE "crime" IS NULL;`);
        }
      });
      
    } else {
      console.log('✅ No problematic columns found');
    }
    
    // Check what the Prisma schema expects
    console.log('\\n📚 Expected Prisma Schema Fields:');
    console.log('==================================');
    
    const expectedFields = [
      'id', 'theme', 'phrase', 'category', 'difficulty',
      'isPublished', 'publishedAt', 'createdAt', 'updatedAt',
      'villainName', 'villainTitle', 'villainGender', 'villainAge', 'villainEthnicity',
      'villainDistinctiveFeature', 'villainClothingDescription', 'villainImageUrl',
      'caseTitle', 'crimeSummary', 'interestingFact',
      'finalLocationObjective', 'finalLocationNarrative',
      'finalInterestingFact', 'gameCompletionMessage'
    ];
    
    const actualColumns = tableInfo.map(col => col.name);
    
    console.log('\\n✅ Fields that exist:');
    expectedFields.forEach(field => {
      if (actualColumns.includes(field)) {
        console.log(`   ✅ ${field}`);
      } else {
        console.log(`   ❌ ${field} (MISSING)`);
      }
    });
    
    console.log('\\n⚠️  Extra columns in database:');
    actualColumns.forEach(col => {
      if (!expectedFields.includes(col)) {
        console.log(`   ⚠️  ${col} (not in Prisma schema)`);
      }
    });
    
  } catch (error) {
    console.error('\\n❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseColumns();