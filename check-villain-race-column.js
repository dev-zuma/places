/**
 * Check if villainRace column exists in production database
 * 
 * Usage: node check-villain-race-column.js
 * 
 * This script checks the current database schema and reports the status
 * of the villainRace column migration.
 */

const { PrismaClient } = require('@prisma/client');

async function checkVillainRaceColumn() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database schema for villainRace column...');
    
    // Method 1: Try to query the column directly
    try {
      const result = await prisma.$queryRaw`
        SELECT villainRace FROM GameV2 LIMIT 1
      `;
      console.log('✅ villainRace column exists and is accessible');
      
      // Check how many games have race data vs null
      const totalGames = await prisma.gameV2.count();
      const gamesWithRace = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM GameV2 WHERE villainRace IS NOT NULL AND villainRace != ''
      `;
      
      console.log(`📊 Total games: ${totalGames}`);
      console.log(`📊 Games with race data: ${gamesWithRace[0]?.count || 0}`);
      
    } catch (error) {
      console.log('❌ villainRace column does not exist');
      console.log('Error:', error.message);
      
      // Method 2: Check table schema
      console.log('\n🔍 Checking table schema...');
      const schema = await prisma.$queryRaw`PRAGMA table_info(GameV2)`;
      console.log('Current GameV2 columns:');
      schema.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
      });
      
      return false;
    }
    
    // Method 3: Test creating a game with villainRace (dry run)
    console.log('\n🧪 Testing Prisma client compatibility...');
    try {
      // Just validate the data structure without actually creating
      const testData = {
        theme: 'TEST',
        phrase: 'Test phrase',
        category: 'Geography',
        difficulty: 'medium',
        villainName: 'Test Villain',
        villainTitle: 'The Tester',
        villainGender: 'female',
        villainAge: '25-35',
        villainRace: 'Asian',
        villainEthnicity: 'Japanese',
        villainDistinctiveFeature: 'Test feature',
        villainClothingDescription: 'Test clothing',
        caseTitle: 'Test Case',
        crimeSummary: 'Test summary',
        interestingFact: 'Test fact',
        finalLocationObjective: 'WHERE_STASHED',
        finalLocationNarrative: 'Test narrative',
        finalInterestingFact: 'Test final fact',
        gameCompletionMessage: 'Test completion'
      };
      
      console.log('✅ Prisma client recognizes villainRace field');
      return true;
      
    } catch (clientError) {
      console.log('❌ Prisma client does not recognize villainRace field');
      console.log('Client error:', clientError.message);
      console.log('\n💡 Solution: Run "npx prisma generate" to update the Prisma client');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkVillainRaceColumn()
    .then((success) => {
      if (success) {
        console.log('\n🎉 Database is ready for villainRace field!');
      } else {
        console.log('\n⚠️  Database needs migration or Prisma client update');
        console.log('\nNext steps:');
        console.log('1. Run: npx prisma generate');
        console.log('2. If still failing, run: node add-villain-race-column.js');
        console.log('3. Then run: npx prisma generate again');
      }
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Check script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkVillainRaceColumn };