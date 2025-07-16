require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { S3Client } = require('@aws-sdk/client-s3');
const OpenAI = require('openai');

// Production environment detection
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 9091;
const productionDomain = process.env.PRODUCTION_DOMAIN || 'https://worldwidechase.onrender.com';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize OpenAI client with error handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI client initialization failed:', error.message);
}

// Initialize S3 client with error handling
let s3Client = null;
try {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
} catch (error) {
  console.warn('S3 client initialization failed:', error.message);
}

// CORS configuration
const corsOptions = {
  origin: isProduction 
    ? [productionDomain, 'https://worldwidechase.onrender.com']
    : ['http://localhost:9091', 'http://localhost:3001', 'http://localhost:8000'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  prisma,
  openai,
  s3Client,
  isProduction,
  port,
  productionDomain,
  corsOptions
};