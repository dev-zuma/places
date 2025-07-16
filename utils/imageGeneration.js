const { openai } = require('./clients');
const { uploadImageToS3 } = require('./imageUpload');
const { updateGenerationProgress } = require('./database');
const { prisma } = require('./clients');

// Function to determine specific items for villain elements
function getSpecificVillainElement(placement, gameData) {
  switch(placement.villainElement) {
    case 'belongings':
      // Parse clothing description to find droppable items
      const clothingItems = gameData.villainProfile.clothingDescription.toLowerCase();
      const possibleItems = [];
      
      if (clothingItems.includes('jacket') || clothingItems.includes('coat')) possibleItems.push('jacket');
      if (clothingItems.includes('hat') || clothingItems.includes('cap')) possibleItems.push('hat');
      if (clothingItems.includes('scarf')) possibleItems.push('scarf');
      if (clothingItems.includes('gloves')) possibleItems.push('glove');
      if (clothingItems.includes('bag') || clothingItems.includes('backpack')) possibleItems.push('bag');
      
      // If no obvious items, use shirt/t-shirt based on theme
      if (possibleItems.length === 0) {
        const theme = gameData.theme.toLowerCase();
        if (theme.includes('environment') || theme.includes('tree') || theme.includes('forest') || theme.includes('deforestation')) {
          return 'green t-shirt with tree logo';
        } else if (theme.includes('chocolate') || theme.includes('cocoa') || theme.includes('candy')) {
          return 'brown hoodie with cocoa bean design';
        } else if (theme.includes('space')) {
          return 'space-themed t-shirt';
        } else if (theme.includes('art')) {
          return 'paint-splattered shirt';
        } else {
          return 'distinctive t-shirt related to ' + gameData.theme;
        }
      }
      
      return possibleItems[Math.floor(Math.random() * possibleItems.length)];
      
    case 'security_footage':
      return 'security camera footage';
      
    case 'reflection':
      return 'reflection in glass/water';
      
    case 'shadow':
      return 'distinctive shadow';
      
    default:
      return placement.villainElement;
  }
}

function generateImagePromptV2(location, landmark, placement, gameData) {
  // Use the pre-determined specific item from the placement
  const specificItem = placement.specificItem || getSpecificVillainElement(placement, gameData);
  
  // Map villain elements to more detailed, specific prompts
  const villainIntegration = {
    'security_footage': `CRITICAL REQUIREMENT: This MUST be a security camera footage screenshot. Include:
    - Black and white or grainy color security camera view
    - Timestamp overlay in corner (e.g., "2024-01-15 14:32:17")
    - Security camera UI elements (REC indicator, camera ID)
    - A person matching this description visible in the scene: ${gameData.villainProfile.clothingDescription}
    - The person should be walking through or standing in ${landmark}
    - The distinctive feature (${gameData.villainProfile.distinctiveFeature}) should be somewhat visible
    - Wide-angle security camera perspective showing the location`,
    
    'belongings': `CRITICAL REQUIREMENT: Show a close-up of a dropped/forgotten ${specificItem}. Include:
    - Main focus: The ${specificItem} lying on the ground at ${landmark}
    - The item should be prominently displayed in foreground  
    - Background should clearly show ${landmark} to establish location
    - Make the ${specificItem} the clear focal point of the image
    - The item should look accidentally dropped or left behind
    - Show the exact item: ${specificItem}`,
    
    'reflection': `CRITICAL REQUIREMENT: Show a clear reflection revealing the villain. Include:
    - A reflective surface (window, water, mirror, glass door) at ${landmark}
    - In the reflection: clearly show a person wearing ${gameData.villainProfile.clothingDescription}
    - The ${gameData.villainProfile.distinctiveFeature} should be visible in the reflection
    - The reflection should be the main focus while still showing the location
    - Make it look like surveillance evidence capturing the villain unknowingly`,
    
    'shadow': `CRITICAL REQUIREMENT: Show a distinctive shadow cast by the villain. Include:
    - A clear shadow on ground/wall at ${landmark}
    - Shadow should show silhouette of person in ${gameData.villainProfile.clothingDescription}
    - If possible, the shadow should hint at ${gameData.villainProfile.distinctiveFeature}
    - Strong lighting to create dramatic shadow
    - Location should be clearly identifiable despite focus on shadow`,
    
    'location_specific': `Show evidence of ${gameData.theme}-related activity at ${landmark}, with signs that someone was recently there conducting suspicious activity related to ${gameData.theme}`
  };
  
  const obscurityLevels = {
    'obscured': 'heavily obscured and mysterious, location barely recognizable but villain element still visible',
    'medium': 'moderately clear, location features visible but not immediately obvious',
    'clear': 'clear and detailed view of the location'
  };
  
  const villainHint = villainIntegration[placement.villainElement] || villainIntegration['location_specific'];
  const obscurity = obscurityLevels[placement.level] || obscurityLevels['medium'];
  
  return `Create a ${obscurity} detective evidence photograph.

${villainHint}

LOCATION CONTEXT:
- Primary location: ${landmark} in ${location.name}, ${location.country}
- This is evidence from a ${gameData.theme}-related crime investigation
- The image should tell a story about the villain's presence at this location

CRITICAL COMPOSITION RULES:
1. The villain element (${placement.villainElement}) MUST be the primary focus
2. The location should provide context but not overshadow the evidence
3. Even if the location is obscured, the villain element must remain clear
4. Style: Realistic crime scene/surveillance photography
5. Appropriate for children ages 10+ (no violence or scary content)
6. The image must match what will be described in clues about this evidence

IMPORTANT: The villain element is MORE important than the location obscurity. Prioritize showing clear evidence of the villain's presence.`;
}

async function generateVillainPortraitV2(gameData) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('🎨 Generating V2 villain portrait...');
    
    const prompt = `Create a clean painterly storybook-style portrait of a person with the following characteristics:
    
Character Details:
- Gender: ${gameData.villainProfile.gender}
- Age: ${gameData.villainProfile.age}
- Race: ${gameData.villainProfile.race}
- Ethnicity: ${gameData.villainProfile.ethnicity}
- Distinctive Feature: ${gameData.villainProfile.distinctiveFeature}
- Clothing: ${gameData.villainProfile.clothingDescription}

CRITICAL REQUIREMENTS:
- MODERN-DAY REALISTIC CLOTHING ONLY (jeans, t-shirts, jackets, sneakers, etc.)
- NO sci-fi outfits, space suits, costumes, or fantasy clothing
- The character must look like a normal person you'd meet on the street today
- NO futuristic, alien, or supernatural elements
- NO text, labels, signs, or written words anywhere in the image
- NO other objects, props, or items beyond the person themselves
- CLEAN portrait with minimal background elements

Style Requirements:
- Painterly storybook illustration style
- 3/4 view portrait, chest-up
- Confident expression (not scary or threatening)
- Muted, elegant color palette
- Plain solid background (no detailed backgrounds)
- Size: 1024x1024
- Kid-friendly appearance - charming and mischievous rather than menacing
- Focus entirely on the person's face and upper body

The portrait should show only the person against a simple background with no additional elements, text, or objects.`;

    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png'
    });

    console.log('✅ V2 villain portrait generated successfully');
    
    // GPT-Image-1 returns base64, convert to data URL
    const base64Data = response.data[0].b64_json;
    const dataUrl = `data:image/png;base64,${base64Data}`;
    
    return {
      url: dataUrl,
      prompt: prompt
    };
    
  } catch (error) {
    console.error('V2 villain portrait generation failed:', error);
    throw new Error('V2 villain portrait generation failed: ' + error.message);
  }
}

async function generateLocationImagesV2Individual(gameId, gameData, locationRecords) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Please check your API key settings.');
  }
  
  try {
    console.log('📸 Generating V2 location images individually...');
    
    // Generate only the images specified in the strategy, with individual timing
    let imageNumber = 1;
    for (const placement of gameData.imageStrategy.placements) {
      const location = gameData.locations.find(l => l.position === placement.location);
      const locationRecord = locationRecords.find(r => r.position === placement.location);
      
      if (!location || !locationRecord) {
        console.error(`Location not found for position ${placement.location}`);
        continue;
      }
      
      console.log(`🎨 Phase 4${String.fromCharCode(97 + imageNumber)}: Generating image ${imageNumber} for ${location.name} (Turn ${placement.turn}, ${placement.level})`);
      
      // Track individual image generation timing
      const imageStartTime = new Date();
      const phaseFields = {
        1: { start: 'locationImage1StartTime', end: 'locationImage1EndTime' },
        2: { start: 'locationImage2StartTime', end: 'locationImage2EndTime' },
        3: { start: 'locationImage3StartTime', end: 'locationImage3EndTime' }
      };
      
      if (phaseFields[imageNumber]) {
        await prisma.generationV2.updateMany({
          where: { gameV2Id: gameId },
          data: { 
            [phaseFields[imageNumber].start]: imageStartTime,
            currentStep: `generating_location_image_${imageNumber}`
          }
        });
      }
      
      const landmarkIndex = Math.floor(Math.random() * location.landmarks.length);
      const landmark = location.landmarks[landmarkIndex];
      
      // Create image prompt with villain integration
      const imagePrompt = generateImagePromptV2(location, landmark, placement, gameData);
      
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
        output_format: 'png'
      });
      
      // GPT-Image-1 returns base64, convert to data URL
      const base64Data = response.data[0].b64_json;
      const dataUrl = `data:image/png;base64,${base64Data}`;
      
      // Upload to S3
      const s3Url = await uploadImageToS3(
        dataUrl,
        gameId,
        `location_${placement.location}`,
        `turn_${placement.turn}`
      );
      
      // Update location record with image URL
      await prisma.locationV2.update({
        where: { id: locationRecord.id },
        data: { imageUrl: s3Url }
      });
      
      // Record end time
      const imageEndTime = new Date();
      if (phaseFields[imageNumber]) {
        await prisma.generationV2.updateMany({
          where: { gameV2Id: gameId },
          data: { [phaseFields[imageNumber].end]: imageEndTime }
        });
      }
      
      const duration = ((imageEndTime - imageStartTime) / 1000).toFixed(1);
      console.log(`✅ Image ${imageNumber} generated for ${location.name} (${duration}s)`);
      
      // Update progress
      await updateGenerationProgress(gameId, `location_image_${imageNumber}_generated`, 12 + imageNumber * 2);
      
      console.log(`✅ Progress updated for image ${imageNumber}: location_image_${imageNumber}_generated`);
      
      imageNumber++;
    }
    
    console.log(`✅ All V2 location images generated individually (${gameData.imageStrategy.placements.length} images processed)`);
    
  } catch (error) {
    console.error('V2 location images generation failed:', error);
    throw new Error('V2 location images generation failed: ' + error.message);
  }
}

// Keep the original function for backward compatibility
async function generateLocationImagesV2(gameId, gameData, locationRecords) {
  return generateLocationImagesV2Individual(gameId, gameData, locationRecords);
}

module.exports = {
  getSpecificVillainElement,
  generateImagePromptV2,
  generateVillainPortraitV2,
  generateLocationImagesV2Individual,
  generateLocationImagesV2
};