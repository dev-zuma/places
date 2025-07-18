#!/bin/bash

# Production Deployment Script for Worldwide Chase
# This script handles a complete production deployment with clean database

echo "🚀 Worldwide Chase Production Deployment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "server-unified.js" ]; then
    echo "❌ Error: server-unified.js not found. Are you in the project root?"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Reset database schema
echo "🗑️ Resetting database schema..."
node scripts/reset-production-schema.js --confirm

# Generate Prisma client
echo "📚 Generating Prisma client..."
npx prisma generate

echo "✅ Deployment complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the server: node server-unified.js"
echo "2. Access admin panel: https://worldwidechase.onrender.com/admin/"
echo "3. Generate test games to verify functionality"
echo ""
echo "🔧 Key features now available:"
echo "• New achievement-based scoring system"
echo "• Unix timestamp-based villain diversity"
echo "• All recent bug fixes and improvements"