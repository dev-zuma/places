# 🚀 Worldwide Chase - Production Deployment Guide

This guide covers deploying Worldwide Chase to production on Render.com.

## 📋 Prerequisites

- Render.com account with persistent disk enabled
- AWS S3 account with production bucket created
- Google Cloud Console project with OAuth configured
- OpenAI API key

## 🔧 Environment Variables

Set these environment variables in your Render dashboard:

```bash
# Server Configuration
NODE_ENV=production
PORT=9091  # Or use Render's default PORT
PRODUCTION_DOMAIN=https://worldwidechase.onrender.com

# Database Configuration (using Render's persistent disk)
DATABASE_URL=file:/db/production.db

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# AWS S3 Configuration
AWS_S3_BUCKET_NAME=placesgame-images  # Development bucket
AWS_S3_PROD_BUCKET_NAME=worldwidechase-images-prod  # Production bucket
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
```

## 📦 Render Configuration

### Build Command
```bash
npm install && node scripts/setup-production.js
```

### Start Command
```bash
node server-unified.js
```

### Persistent Disk
- Mount path: `/db`
- Size: At least 1GB for SQLite database

## 🌐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Add these authorized JavaScript origins:
   - `https://worldwidechase.onrender.com`
   - `https://worldwidechase.onrender.com:9091` (if using custom port)
4. Add these authorized redirect URIs:
   - `https://worldwidechase.onrender.com/api/auth/google/callback`

## 🪣 AWS S3 Setup

1. Create a production S3 bucket named `worldwidechase-images-prod`
2. Configure bucket policy for public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::worldwidechase-images-prod/*"
        }
    ]
}
```

3. Enable CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["https://worldwidechase.onrender.com"],
        "ExposeHeaders": []
    }
]
```

## 🚀 Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Create Render Web Service**
   - Connect your GitHub repository
   - Choose "Web Service"
   - Select Node environment
   - Add persistent disk at `/db`

3. **Configure Environment Variables**
   - Add all variables listed above in Render dashboard
   - Ensure `NODE_ENV=production` is set

4. **Deploy**
   - Render will automatically deploy on push to main
   - First deployment will run database migrations

5. **Verify Deployment**
   - Visit https://worldwidechase.onrender.com
   - Check admin portal at /admin/
   - Test game generation and playback

## 🔍 Health Checks

The application provides these endpoints for monitoring:

- `/` - Redirects to game gallery
- `/api/cases` - Returns published cases (should return JSON array)
- `/api/config` - Returns client configuration

## 🐛 Troubleshooting

### Database Issues
- Check Render logs for migration errors
- Ensure `/db` directory exists and is writable
- Verify `DATABASE_URL` is set correctly

### S3 Upload Issues
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure CORS is configured on bucket

### OAuth Issues
- Verify authorized origins in Google Console
- Check that `GOOGLE_CLIENT_ID` matches
- Clear browser cookies and retry

### Performance
- Enable Render's auto-scaling if needed
- Consider upgrading to larger instance for heavy load
- Monitor memory usage (SQLite is in-memory friendly)

## 📊 Monitoring

Monitor these metrics in production:

1. **Response Times** - Should be <500ms for API calls
2. **Error Rate** - Should be <1%
3. **Disk Usage** - Monitor `/db` directory size
4. **Memory Usage** - SQLite and image processing can be memory intensive

## 🔄 Updates

To deploy updates:

1. Make changes locally
2. Test thoroughly
3. Commit and push to main
4. Render will auto-deploy
5. Monitor logs during deployment

## 🔐 Security Checklist

- [ ] All API keys are set as environment variables
- [ ] CORS is properly configured
- [ ] S3 bucket has appropriate access policies
- [ ] Database is on persistent disk (not in container)
- [ ] OAuth redirect URIs are correct
- [ ] No sensitive data in logs

## 📞 Support

For issues specific to:
- **Render**: Check Render status page and documentation
- **AWS S3**: AWS Support or S3 documentation
- **Google OAuth**: Google Cloud Console help
- **Application**: Create issue on GitHub repository