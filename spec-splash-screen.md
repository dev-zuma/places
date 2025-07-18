# Splash Screen Specification

## Overview
A dynamic splash screen that displays when `/game/` loads, featuring random villain and location images from the database with educational text about game mechanics.

## Visual Design

### Layout
- **Background**: Cork board or aged paper texture (matching detective theme)
- **Duration**: 4 seconds total
- **Container**: Full viewport overlay with semi-transparent black backdrop
- **Logo**: Worldwide Chase logo appears center-stage at end

### Dynamic Image Elements
- **Image Count**: 4-6 total (mix of villains and locations)
- **Image Style**: Polaroid-style frames with subtle shadows
- **Positioning**: Scattered placement with slight rotations (-5° to +5°)
- **Size**: 150x150px for villains, 200x150px for locations
- **Effects**: Tape/pin graphics on corners

### Game Mechanics Text
Three sequential messages teaching core gameplay:
1. "Investigate Crime Scenes"
2. "Track the Suspect"
3. "Capture the Villain"

**Text Style**:
- Font: Courier New (matching game typography)
- Size: 24px
- Color: #333 with subtle text shadow
- Animation: Typewriter effect

## Animation Timeline

### Phase 1: Background (0-0.5s)
- Cork board texture fades in (opacity 0 → 1)
- Subtle vignette effect on edges

### Phase 2: Investigation (0.5-1.5s)
- "Investigate Crime Scenes" types out (typewriter effect)
- 2-3 location images slide in from different angles
- Images have staggered entrance (0.2s delays)
- Polaroid drop shadow grows as they "land"

### Phase 3: Tracking (1.5-2.5s)
- "Track the Suspect" types out
- 2-3 villain portraits slide in
- Previous text fades to 50% opacity
- Red string briefly connects images (0.3s)

### Phase 4: Capture (2.5-3.5s)
- "Capture the Villain" types out with emphasis
- All images pulse once (scale 1 → 1.05 → 1)
- WWC logo fades in center (opacity 0 → 1)

### Phase 5: Exit (3.5-4s)
- Everything except logo fades out
- Logo scales up slightly and fades
- Splash container removes from DOM

## Technical Implementation

### API Endpoint
**Route**: `/api/v2/cases/splash-images`

**Response Format**:
```json
{
  "villains": [
    {
      "id": "uuid",
      "imageUrl": "https://s3-url...",
      "name": "Elena Vasquez"
    }
  ],
  "locations": [
    {
      "id": "uuid",
      "imageUrl": "https://s3-url...",
      "cityName": "Prague"
    }
  ]
}
```

**Logic**:
- Select 3 random published games
- Return villain portraits and location images
- Ensure mix of demographics
- Cache for 5 minutes to reduce DB load

### HTML Structure
```html
<div id="splashScreen" class="splash-container">
  <div class="splash-background"></div>
  <div class="splash-content">
    <div class="splash-images"></div>
    <div class="splash-text">
      <p class="splash-line" id="line1">Investigate Crime Scenes</p>
      <p class="splash-line" id="line2">Track the Suspect</p>
      <p class="splash-line" id="line3">Capture the Villain</p>
    </div>
    <img class="splash-logo" src="/game/wwc-logo.png" alt="Worldwide Chase">
  </div>
</div>
```

### CSS Classes
- `.splash-container`: Full viewport overlay
- `.splash-background`: Cork board texture
- `.splash-images`: Container for dynamic images
- `.splash-polaroid`: Individual image frame
- `.splash-villain`: Villain portrait styling
- `.splash-location`: Location image styling
- `.splash-text`: Text container
- `.splash-line`: Individual text lines
- `.splash-logo`: WWC logo styling

### JavaScript Functions
```javascript
// Main functions
async function showSplashScreen()
async function fetchSplashImages()
function createPolaroid(imageData, type)
function animateSplashSequence()
function removeSplashScreen()

// Animation helpers
function typewriterEffect(element, duration)
function slideInImage(element, delay, direction)
function pulseElement(element)
function fadeElement(element, opacity, duration)
```

### Integration Points

#### 1. Page Load Trigger
- Add to `/game/index.html` at start of page load
- Check localStorage for 'splashShown' flag (show once per session)
- Mobile: Reduce to 3 seconds total duration

#### 2. Loading States
- Show splash while initial case data loads
- Hide loading spinner during splash
- Ensure smooth transition to gallery

#### 3. Error Handling
- If API fails, show default splash without images
- Timeout after 5 seconds maximum
- Always remove splash container from DOM

## Performance Considerations

### Image Optimization
- Limit image size to 300KB max
- Use WebP format where supported
- Lazy load images during animation

### Mobile Adaptations
- Reduce image count to 3-4 total
- Smaller image sizes (100x100px)
- Faster animation (3s total)
- Simpler effects (no rotations)

### Caching Strategy
- Cache splash images for 5 minutes
- Store in sessionStorage
- Preload cork board texture

## Accessibility
- Skip button in corner (appears after 1s)
- Respect prefers-reduced-motion
- Alt text for all images
- Keyboard accessible (Escape to skip)

## Future Enhancements
1. Sound effects (typewriter, paper shuffling)
2. Different themes (night mode splash)
3. Seasonal variations
4. User preference to disable

## Success Metrics
- Load time under 500ms
- Smooth 60fps animations
- Positive user feedback
- No impact on game performance