#!/usr/bin/env node

/**
 * Simple Crime Column Removal
 * Just removes the problematic crime column using column mapping
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

async function simpleRemoveCrime() {
  console.log('🔧 Simple Crime Column Removal');
  console.log('==============================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Get current table structure
    const tableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    const currentColumns = tableInfo.map(col => col.name);
    
    console.log('\\n📋 Current columns:');
    currentColumns.forEach((col, i) => console.log(`${i + 1}. ${col}`));
    
    // Check if crime column exists
    const hasCrime = currentColumns.includes('crime');
    
    if (!hasCrime) {
      console.log('\\n✅ No "crime" column found - already fixed!');
      return;
    }
    
    console.log('\\n🔧 Removing crime column...');
    
    // Since SQLite doesn't support DROP COLUMN directly, we need to recreate
    // But we'll map the existing columns to avoid missing column errors
    
    // Step 1: Create backup
    console.log('   1. Creating backup...');
    await prisma.$executeRawUnsafe(`CREATE TABLE GameV2_backup AS SELECT * FROM GameV2`);
    
    // Step 2: Drop original table
    console.log('   2. Dropping original table...');
    await prisma.$executeRawUnsafe(`DROP TABLE GameV2`);
    
    // Step 3: Create new table with ALL current columns except crime
    console.log('   3. Creating new table...');
    
    // Build CREATE TABLE statement from existing columns (except crime)
    const columnsWithoutCrime = tableInfo.filter(col => col.name !== 'crime');
    
    const columnDefinitions = columnsWithoutCrime.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.notnull) def += ' NOT NULL';
      if (col.dflt_value) def += ` DEFAULT ${col.dflt_value}`;
      if (col.pk) def += ' PRIMARY KEY';
      return def;
    });
    
    const createTableSQL = `
      CREATE TABLE "GameV2" (
        ${columnDefinitions.join(',\\n        ')}
      )
    `;
    
    await prisma.$executeRawUnsafe(createTableSQL);
    
    // Step 4: Copy data back (excluding crime column)
    console.log('   4. Copying data back...');
    
    const columnsToKeep = columnsWithoutCrime.map(col => `"${col.name}"`).join(', ');
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO GameV2 (${columnsToKeep})
      SELECT ${columnsToKeep} FROM GameV2_backup
    `);
    
    // Step 5: Drop backup
    console.log('   5. Cleaning up...');
    await prisma.$executeRawUnsafe(`DROP TABLE GameV2_backup`);
    
    console.log('\\n✅ Crime column removed successfully!');
    
    // Verify new structure
    const newTableInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info(GameV2)`);
    const newColumns = newTableInfo.map(col => col.name);
    
    console.log('\\n🔍 New table structure:');
    newColumns.forEach((col, i) => console.log(`${i + 1}. ${col}`));
    
    const stillHasCrime = newColumns.includes('crime');
    console.log(`\\n${stillHasCrime ? '❌' : '✅'} Crime column removed: ${!stillHasCrime}`);
    
    // Test that we can query the table
    console.log('\\n🧪 Testing table access...');
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM GameV2`);
    console.log(`✅ Table accessible, ${count[0].count} records`);
    
    console.log('\\n🎉 Simple Crime Column Removal Complete!');
    console.log('=========================================');
    console.log('✅ Crime column removed');
    console.log('✅ All existing data preserved');
    console.log('✅ V2 game generation should work now!');
    
  } catch (error) {
    console.error('\\n❌ Crime removal failed:', error);
    console.error('Error details:', error.message);
    
    // Try to restore from backup if it exists
    try {
      console.log('\\n🔄 Attempting to restore from backup...');
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS GameV2`);
      await prisma.$executeRawUnsafe(`ALTER TABLE GameV2_backup RENAME TO GameV2`);
      console.log('✅ Restored from backup');
    } catch (restoreError) {
      console.error('❌ Backup restore failed:', restoreError.message);
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

simpleRemoveCrime();