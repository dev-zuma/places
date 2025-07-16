const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, isProduction } = require('./clients');

async function uploadImageToS3(imageUrl, gameId, locationPosition, turn) {
  // If S3 client is available, upload to S3
  if (s3Client && process.env.AWS_S3_BUCKET_NAME) {
    try {
      // Determine which bucket to use based on environment
      const bucketName = isProduction && process.env.AWS_S3_PROD_BUCKET_NAME 
        ? process.env.AWS_S3_PROD_BUCKET_NAME 
        : process.env.AWS_S3_BUCKET_NAME;
      
      console.log(`Uploading image to S3 bucket: ${bucketName}`);
      
      // Download the image
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const imageBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);
      
      // Create S3 key based on type
      let s3Key;
      if (locationPosition === 'villain') {
        s3Key = `games/${gameId}/villain-portrait.png`;
      } else {
        s3Key = `games/${gameId}/location-${locationPosition}/turn-${turn}.png`;
      }
      
      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/png',
      });
      
      await s3Client.send(uploadCommand);
      
      // Return the S3 URL
      const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      console.log(`Image uploaded to S3: ${s3Url}`);
      return s3Url;
      
    } catch (error) {
      console.error('S3 upload failed, using original URL:', error);
      return imageUrl;
    }
  }
  
  // Mock delay and return original URL if S3 not configured
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('S3 not configured, using original URL:', imageUrl);
  return imageUrl;
}

module.exports = {
  uploadImageToS3
};