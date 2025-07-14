#!/usr/bin/env node

/**
 * SQL-based Production Database Migration
 * Alternative migration method using direct SQL commands
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

// V2 table creation SQL commands
const v2MigrationSQL = [
  // GameV2 table
  `CREATE TABLE IF NOT EXISTS "GameV2" (
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
    "finalObjective" TEXT NOT NULL,
    "educationalFact" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "isActive" BOOLEAN NOT NULL DEFAULT true
  );`,

  // LocationV2 table
  `CREATE TABLE IF NOT EXISTS "LocationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "coordinates" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "landmarks" TEXT,
    "hasImage" BOOLEAN NOT NULL DEFAULT false,
    "imageTurn" INTEGER,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationV2_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // FinalLocationV2 table
  `CREATE TABLE IF NOT EXISTS "FinalLocationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "coordinates" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "landmarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalLocationV2_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // GameplayTurn table
  `CREATE TABLE IF NOT EXISTS "GameplayTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameplayTurn_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // Clue table
  `CREATE TABLE IF NOT EXISTS "Clue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "turnId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "data" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clue_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "GameplayTurn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // PlayerCaseV2 table
  `CREATE TABLE IF NOT EXISTS "PlayerCaseV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "playerEmail" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "turnsUsed" INTEGER NOT NULL,
    "answers" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerCaseV2_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameV2" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );`,

  // GenerationV2 table
  `CREATE TABLE IF NOT EXISTS "GenerationV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "error" TEXT,
    "metadata" TEXT,
    CONSTRAINT "GenerationV2_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameV2" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,

  // Create indexes
  `CREATE INDEX IF NOT EXISTS "LocationV2_gameId_idx" ON "LocationV2"("gameId");`,
  `CREATE INDEX IF NOT EXISTS "LocationV2_position_idx" ON "LocationV2"("position");`,
  `CREATE INDEX IF NOT EXISTS "FinalLocationV2_gameId_idx" ON "FinalLocationV2"("gameId");`,
  `CREATE INDEX IF NOT EXISTS "GameplayTurn_gameId_idx" ON "GameplayTurn"("gameId");`,
  `CREATE INDEX IF NOT EXISTS "GameplayTurn_turn_idx" ON "GameplayTurn"("turn");`,
  `CREATE INDEX IF NOT EXISTS "Clue_turnId_idx" ON "Clue"("turnId");`,
  `CREATE INDEX IF NOT EXISTS "PlayerCaseV2_playerId_idx" ON "PlayerCaseV2"("playerId");`,
  `CREATE INDEX IF NOT EXISTS "PlayerCaseV2_gameId_idx" ON "PlayerCaseV2"("gameId");`,
  `CREATE INDEX IF NOT EXISTS "GenerationV2_gameId_idx" ON "GenerationV2"("gameId");`,

  // Create unique constraints
  `CREATE UNIQUE INDEX IF NOT EXISTS "LocationV2_gameId_position_key" ON "LocationV2"("gameId", "position");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FinalLocationV2_gameId_key" ON "FinalLocationV2"("gameId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GameplayTurn_gameId_turn_key" ON "GameplayTurn"("gameId", "turn");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "GenerationV2_gameId_key" ON "GenerationV2"("gameId");`
];

async function runSQLMigration() {
  console.log('🛠️  Starting SQL-based Database Migration');
  console.log('==========================================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database URL: ${process.env.NODE_ENV === 'production' ? "file:/db/production.db" : "file:./prisma/dev.db"}`);
    
    // Test database connection
    console.log('\n🔍 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Execute each SQL command
    console.log('\n🛠️  Executing V2 table creation...');
    
    for (let i = 0; i < v2MigrationSQL.length; i++) {
      const sql = v2MigrationSQL[i];
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1] || 
                       sql.match(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS "(\w+)"/)?.[1] ||
                       `Command ${i + 1}`;
      
      console.log(`   Creating: ${tableName}`);
      
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`   ✅ ${tableName} created successfully`);
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('UNIQUE constraint failed') ||
            error.code === 'P2010') {
          console.log(`   ⚠️  ${tableName} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }
    
    // Verify tables exist
    console.log('\n🔍 Verifying V2 tables...');
    
    const tableChecks = [
      'GameV2', 'LocationV2', 'FinalLocationV2', 
      'GameplayTurn', 'Clue', 'PlayerCaseV2', 'GenerationV2'
    ];
    
    for (const tableName of tableChecks) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT count(*) as count FROM "${tableName}"`
        );
        console.log(`✅ ${tableName}: ${result[0].count} records`);
      } catch (error) {
        console.log(`❌ ${tableName}: Failed to verify`);
        throw error;
      }
    }
    
    console.log('\n🎉 SQL Migration Complete!');
    console.log('===========================');
    console.log('✅ All V2 tables created successfully');
    console.log('✅ Database ready for V2 game generation');
    
  } catch (error) {
    console.error('\n❌ SQL Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  runSQLMigration()
    .then(() => {
      console.log('\n🏁 SQL Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 SQL Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runSQLMigration };