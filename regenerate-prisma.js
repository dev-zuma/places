#!/usr/bin/env node

/**
 * Regenerate Prisma Client
 * Simple script to regenerate Prisma client after schema changes
 */

const { spawn } = require('child_process');

async function regeneratePrisma() {
  console.log('🔄 Regenerating Prisma Client');
  console.log('============================');
  
  try {
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Regenerate Prisma client
    console.log('\\n🔄 Running prisma generate...');
    
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
          console.log('\\n✅ Prisma client regenerated successfully');
          resolve();
        } else {
          reject(new Error(`Prisma generate failed with code ${code}`));
        }
      });
    });
    
    console.log('\\n🎉 Prisma Client Regeneration Complete!');
    console.log('========================================');
    console.log('✅ Prisma client updated with latest schema');
    console.log('✅ Database models should now be in sync');
    
    // Optional: Test connection
    console.log('\\n🧪 Testing database connection...');
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
    
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Test GameV2 model exists
      const gameCount = await prisma.gameV2.count();
      console.log(`✅ GameV2 model accessible (${gameCount} records)`);
      
    } catch (error) {
      console.log(`⚠️  Database test failed: ${error.message}`);
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (error) {
    console.error('\\n❌ Prisma regeneration failed:', error);
    process.exit(1);
  }
}

regeneratePrisma();