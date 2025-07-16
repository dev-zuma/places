const express = require('express');
const router = express.Router();
const { openai, prisma } = require('../utils/clients');

// API: Test villain portrait generation
router.post('/test-villain-portrait', async (req, res) => {
  try {
    const { prompt, model = 'dall-e-3', quality = 'standard' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI not configured' });
    }
    
    console.log(`Testing villain portrait with model: ${model}, quality: ${quality}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);
    
    const imageParams = {
      model: model,
      prompt: prompt,
      size: "1024x1024",
      n: 1,
    };
    
    // Handle different model parameters
    if (model === 'gpt-image-1') {
      // GPT-Image-1 specific parameters
      imageParams.quality = quality === 'hd' ? 'high' : (quality === 'standard' ? 'medium' : quality);
      imageParams.output_format = 'png'; // png, jpeg, or webp (only supported by gpt-image-1)
      // Note: No background parameter - using default solid background
    } else if (model === 'dall-e-3') {
      // DALL-E 3 supports hd/standard quality
      imageParams.quality = quality; // 'hd' or 'standard'
    } else if (model === 'dall-e-2') {
      // DALL-E 2 only supports 'standard' quality
      imageParams.quality = 'standard';
    }
    
    const response = await openai.images.generate(imageParams);
    
    let imageUrl;
    if (model === 'gpt-image-1') {
      // GPT-Image-1 always returns base64
      const base64Data = response.data[0].b64_json;
      imageUrl = `data:image/png;base64,${base64Data}`;
    } else {
      // DALL-E 2 and 3 return URLs
      imageUrl = response.data[0].url;
    }
    
    res.json({
      imageUrl: imageUrl,
      model: model,
      quality: quality,
      promptUsed: prompt
    });
    
  } catch (error) {
    console.error('Test villain portrait generation failed:', error);
    res.status(500).json({ 
      error: 'Failed to generate test portrait',
      details: error.message 
    });
  }
});

// Admin database cleanup
router.post('/admin/clear-database', async (req, res) => {
  try {
    const { adminEmail, confirmation } = req.body;
    
    // Verify admin email and confirmation
    if (adminEmail !== 'adnanzuma@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }
    
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Invalid confirmation. Type "DELETE" to confirm.' });
    }
    
    console.log('ADMIN DATABASE CLEANUP INITIATED by:', adminEmail);
    
    // Clear all database tables (V2 models only)
    await prisma.clue.deleteMany();
    await prisma.gameplayTurn.deleteMany();
    await prisma.finalLocationV2.deleteMany();
    await prisma.locationV2.deleteMany();
    await prisma.playerCaseV2.deleteMany();
    await prisma.gameV2.deleteMany();
    await prisma.generationV2.deleteMany();
    await prisma.player.deleteMany();
    
    console.log('Database cleanup completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Database cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to clear database',
      details: error.message
    });
  }
});

module.exports = router;