#!/usr/bin/env node

/**
 * Quick Column Check for Production
 * Just shows what columns exist in GameV2 table
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

async function quickColumnCheck() {
  try {
    console.log('🔍 Quick Column Check');
    console.log('====================');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    await prisma.$connect();
    
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    
    console.log('\\nGameV2 columns:');
    tableInfo.forEach((col, i) => {
      const required = col.notnull ? ' (REQUIRED)' : ' (optional)';
      console.log(`${i + 1}. ${col.name}${required}`);
    });
    
    // Check specifically for crime column
    const hasCrime = tableInfo.some(col => col.name === 'crime');
    const hasCrimeSummary = tableInfo.some(col => col.name === 'crimeSummary');
    
    console.log('\\nKey findings:');
    console.log(`❌ Has "crime" column: ${hasCrime}`);
    console.log(`✅ Has "crimeSummary" column: ${hasCrimeSummary}`);
    
    if (hasCrime) {
      console.log('\\n🚨 PROBLEM: Old "crime" column exists and is likely causing the error');
      console.log('Run: NODE_ENV=production node remove-old-crime-column.js');
    } else {
      console.log('\\n✅ No "crime" column found - structure looks good');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickColumnCheck();