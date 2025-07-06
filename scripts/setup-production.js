#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Worldwide Chase for production...\n');

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction ? '/db' : './prisma';

console.log(`Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`Database path: ${dbPath}`);

// Ensure database directory exists (for production)
if (isProduction && !fs.existsSync(dbPath)) {
  console.log(`Creating database directory at ${dbPath}...`);
  fs.mkdirSync(dbPath, { recursive: true });
}

// Set DATABASE_URL for production
if (isProduction) {
  process.env.DATABASE_URL = `file:${dbPath}/production.db`;
  console.log(`DATABASE_URL set to: ${process.env.DATABASE_URL}`);
}

try {
  // Generate Prisma Client
  console.log('\n📦 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run database migrations
  console.log('\n🔄 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Create initial admin user if needed (optional)
  console.log('\n✅ Production setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Ensure all environment variables are set');
  console.log('2. Start the server with: node server-unified.js');
  console.log('3. Access the application at your production domain');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}