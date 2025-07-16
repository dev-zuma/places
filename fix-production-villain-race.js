/**
 * Complete fix for villainRace column in production
 * 
 * Usage: node fix-production-villain-race.js
 * 
 * This script:
 * 1. Adds the villainRace column if it doesn't exist
 * 2. Regenerates the Prisma client
 * 3. Verifies the fix works
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function fixProductionVillainRace() {
  console.log('🔧 Starting complete villainRace fix for production...\n');
  
  let prisma = new PrismaClient();
  
  try {
    // Step 1: Check if column exists
    console.log('Step 1: Checking if villainRace column exists...');
    let columnExists = false;
    
    try {
      await prisma.$queryRaw`SELECT villainRace FROM GameV2 LIMIT 1`;
      columnExists = true;
      console.log('✅ Column already exists');
    } catch (error) {
      console.log('❌ Column does not exist, will add it');
    }
    
    // Step 2: Add column if it doesn't exist
    if (!columnExists) {
      console.log('\nStep 2: Adding villainRace column...');
      try {
        await prisma.$executeRaw`ALTER TABLE GameV2 ADD COLUMN villainRace TEXT`;
        console.log('✅ Successfully added villainRace column');
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('✅ Column already exists (concurrent creation)');
        } else {
          throw error;
        }
      }
    } else {
      console.log('\nStep 2: Skipped - column already exists');
    }
    
    // Step 3: Disconnect current Prisma client
    console.log('\nStep 3: Disconnecting current Prisma client...');
    await prisma.$disconnect();
    
    // Step 4: Regenerate Prisma client
    console.log('\nStep 4: Regenerating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client regenerated successfully');
    } catch (error) {
      console.error('❌ Failed to regenerate Prisma client:', error.message);
      throw error;
    }
    
    // Step 5: Create new Prisma client and test
    console.log('\nStep 5: Testing new Prisma client...');
    
    // Dynamically require the regenerated client
    delete require.cache[require.resolve('@prisma/client')];
    const { PrismaClient: NewPrismaClient } = require('@prisma/client');
    const newPrisma = new NewPrismaClient();
    
    try {
      // Test that we can query the column
      await newPrisma.$queryRaw`SELECT villainRace FROM GameV2 LIMIT 1`;
      console.log('✅ Database column accessible');
      
      // Test that Prisma client recognizes the field
      const testData = {
        theme: 'TEST_MIGRATION',
        phrase: 'Testing migration',
        category: 'Geography',
        difficulty: 'medium',
        villainName: 'Test Villain',
        villainTitle: 'The Migration Tester',
        villainGender: 'female',
        villainAge: '25-35',
        villainRace: 'Asian',
        villainEthnicity: 'Japanese',
        villainDistinctiveFeature: 'Test feature',
        villainClothingDescription: 'Test clothing',
        caseTitle: 'Migration Test Case',
        crimeSummary: 'Testing the migration',
        interestingFact: 'Migration test fact',
        finalLocationObjective: 'WHERE_STASHED',
        finalLocationNarrative: 'Test narrative',
        finalInterestingFact: 'Test final fact',
        gameCompletionMessage: 'Migration test complete'
      };
      
      // Create a test game to verify everything works
      const testGame = await newPrisma.gameV2.create({ data: testData });
      console.log('✅ Successfully created test game with villainRace field');
      
      // Clean up test game
      await newPrisma.gameV2.delete({ where: { id: testGame.id } });
      console.log('✅ Test game cleaned up');
      
      // Report statistics
      const totalGames = await newPrisma.gameV2.count();
      const gamesWithRace = await newPrisma.$queryRaw`
        SELECT COUNT(*) as count FROM GameV2 WHERE villainRace IS NOT NULL AND villainRace != ''
      `;
      
      console.log(`\n📊 Migration Results:`);
      console.log(`  Total games: ${totalGames}`);
      console.log(`  Games with race data: ${gamesWithRace[0]?.count || 0}`);
      console.log(`  Games without race data: ${totalGames - (gamesWithRace[0]?.count || 0)} (will show "Not specified")`);
      
    } finally {
      await newPrisma.$disconnect();
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Production server is now ready for bulk game generation with villainRace field');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixProductionVillainRace()
    .then(() => {
      console.log('\n✨ Production fix completed successfully!');
      console.log('🚀 You can now run bulk game generation');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Production fix failed:', error);
      console.log('\n📞 Contact support with this error message');
      process.exit(1);
    });
}

module.exports = { fixProductionVillainRace };