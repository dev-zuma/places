# V2 Detective Interface Specification

## Overview
Create a simplified V2 detective interface that reuses the existing detective UI components while adapting them for the V2 game format (3+1 structure). No backward compatibility with V1 games needed.

## Core Requirements

### 1. Game Structure
- **3+1 locations**: 3 crime scenes + 1 final location to deduce
- **7 turns**: Turns 1-5 for crime scenes, turns 6-7 for final location
- **Two-phase gameplay**: First solve crime scenes, then deduce final location
- **Rich clues**: Multiple clue types per turn (theme, distance, image, breakthrough, etc.)

### 2. Timer System (Modified)
```javascript
// CHANGE: Timer tracks elapsed time, not countdown
let gameStartTime = Date.now();
let timerInterval;

function startElapsedTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - gameStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}
```

### 3. Reused UI Components

#### Investigation Journal (Enhanced)
- **Keep existing 3-tab structure**: Case Details, Investigation Journal, Check Answers
- **Enhance Investigation Journal tab**: Support multi-clue turns
- **Keep existing modal system**: Evidence photos open in modals

#### Case Header (Unchanged)
- Keep existing detective header with case title and user menu
- No changes needed to header component

#### Evidence System (Enhanced)
- **Reuse existing modal system**: `openEvidenceModal()` function
- **Enhance for multiple images per turn**: Support multiple evidence items per location

### 4. API Integration

#### V2 Game Data Structure
```javascript
// Expected V2 game data from API
{
    id: "game_id",
    caseTitle: "The Case of...",
    villainName: "Marcus Rodriguez",
    villainTitle: "Art Thief",
    villainImageUrl: "data:image/png;base64...",
    crimeSummary: "A sophisticated art theft...",
    finalLocationObjective: "WHERE_STASHED",
    locationsV2: [
        {
            position: 1,
            name: "Paris",
            country: "France",
            hasImage: true,
            imageTurn: 1,
            imageLevel: "obscured",
            imageUrl: "data:image/png;base64..."
        }
    ],
    finalLocationV2: {
        name: "Basel",
        country: "Switzerland",
        reason: "Where the stolen art will be sold"
    },
    gameplayTurns: [
        {
            turn: 1,
            narrative: "Investigation begins...",
            isFinalLocation: false,
            clues: [
                { type: "theme", content: "Art theft theme revealed" },
                { type: "image", description: "Security footage...", data: "{\"locationPosition\": 1}" }
            ]
        }
    ]
}
```

### 5. Investigation Journal Updates

#### Timeline View (Enhanced)
```html
<!-- Reuse existing structure, enhance content -->
<div class="timeline-view">
    <div class="timeline-turn" data-turn="1">
        <div class="turn-header">
            <span class="turn-number">Turn 1</span>
            <span class="turn-phase">Crime Scene Investigation</span>
        </div>
        <div class="turn-narrative">
            <p>Investigation begins at the first crime scene...</p>
        </div>
        <div class="turn-clues">
            <!-- Multiple clues per turn -->
            <div class="clue-item clue-theme">
                <span class="clue-type">🎯 Theme</span>
                <span class="clue-content">Art theft</span>
            </div>
            <div class="clue-item clue-image">
                <span class="clue-type">📸 Evidence Photo</span>
                <img src="..." class="evidence-thumbnail" onclick="openEvidenceModal(...)">
                <p class="clue-description">Security camera footage showing...</p>
            </div>
        </div>
    </div>
</div>
```

#### Locations View (Enhanced)
```html
<!-- Reuse existing location cards, add evidence grid -->
<div class="locations-view">
    <div class="location-card" data-position="1">
        <div class="location-header">
            <span class="location-label">Crime Scene 1</span>
            <span class="location-status">investigating</span>
        </div>
        <div class="location-evidence">
            <!-- Show all evidence for this location -->
            <div class="evidence-photo" onclick="openEvidenceModal(...)">
                <img src="turn1_image.jpg" alt="Evidence">
                <span class="evidence-label">Turn 1 Evidence</span>
            </div>
        </div>
        <div class="location-intel">
            <div class="intel-item">
                <span>Timezone:</span> <span>Europe/Paris (UTC+1)</span>
            </div>
        </div>
    </div>
</div>
```

### 6. Check Answers Tab (Major Update)

#### Two-Phase Answer System
```html
<!-- Phase 1: Crime Scene Locations (Always Visible) -->
<div class="check-answers-tab">
    <div class="answer-phase" id="crimeScenePhase">
        <h3>🔍 Crime Scene Locations</h3>
        <div class="location-inputs">
            <div class="location-input-group">
                <label>Crime Scene 1:</label>
                <input type="text" id="location1" placeholder="Enter city or country">
                <span class="input-feedback" id="feedback1"></span>
            </div>
            <div class="location-input-group">
                <label>Crime Scene 2:</label>
                <input type="text" id="location2" placeholder="Enter city or country">
                <span class="input-feedback" id="feedback2"></span>
            </div>
            <div class="location-input-group">
                <label>Crime Scene 3:</label>
                <input type="text" id="location3" placeholder="Enter city or country">
                <span class="input-feedback" id="feedback3"></span>
            </div>
        </div>
        <button id="checkCrimeScenes" class="submit-btn">Check Crime Scenes</button>
    </div>

    <!-- Phase 2: Final Location (Hidden Initially) -->
    <div class="answer-phase hidden" id="finalLocationPhase">
        <div class="phase-unlock-message">
            <h3>🎯 Final Investigation Phase Unlocked!</h3>
            <p id="finalObjectiveDescription">Based on the evidence, where did the villain stash the stolen goods?</p>
        </div>
        <div class="location-input-group">
            <label>Final Location:</label>
            <input type="text" id="finalLocation" placeholder="Enter the final location">
            <span class="input-feedback" id="finalFeedback"></span>
        </div>
        <button id="checkFinalLocation" class="submit-btn">Solve Case</button>
    </div>

    <!-- Case Complete (Hidden Initially) -->
    <div class="case-complete hidden" id="caseComplete">
        <h3>🎉 Case Solved!</h3>
        <div class="completion-message" id="completionMessage"></div>
        <div class="final-interesting-fact" id="finalFact"></div>
        <div class="game-stats">
            <div class="stat-item">
                <label>Time Taken:</label>
                <span id="finalTime"></span>
            </div>
        </div>
    </div>
</div>
```

### 7. Game Flow Logic

#### Crime Scene Checking
```javascript
async function checkCrimeScenes() {
    const answers = {
        location1: document.getElementById('location1').value.trim(),
        location2: document.getElementById('location2').value.trim(),
        location3: document.getElementById('location3').value.trim()
    };
    
    const correctAnswers = {
        location1: gameData.locationsV2.find(l => l.position === 1).name,
        location2: gameData.locationsV2.find(l => l.position === 2).name,
        location3: gameData.locationsV2.find(l => l.position === 3).name
    };
    
    const results = {
        location1: checkLocationMatch(answers.location1, correctAnswers.location1),
        location2: checkLocationMatch(answers.location2, correctAnswers.location2),
        location3: checkLocationMatch(answers.location3, correctAnswers.location3)
    };
    
    // Show feedback
    showCrimeSceneFeedback(results);
    
    if (results.location1 && results.location2 && results.location3) {
        // All correct - unlock final phase
        unlockFinalLocationPhase();
        
        // Show remaining turns if not at turn 5 yet
        if (currentTurn < 5) {
            revealRemainingCrimeTurns();
        }
        
        // Add turns 6-7 to timeline
        addFinalLocationTurns();
    }
}

function checkLocationMatch(answer, correct) {
    // Flexible matching (case insensitive, handle variations)
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrect = correct.toLowerCase().trim();
    return normalizedAnswer === normalizedCorrect || 
           normalizedAnswer.includes(normalizedCorrect) ||
           normalizedCorrect.includes(normalizedAnswer);
}
```

#### Final Location Checking
```javascript
async function checkFinalLocation() {
    const finalAnswer = document.getElementById('finalLocation').value.trim();
    const correctAnswer = gameData.finalLocationV2.name;
    
    const isCorrect = checkLocationMatch(finalAnswer, correctAnswer);
    
    if (isCorrect) {
        showCaseComplete();
        stopTimer();
    } else {
        showFinalLocationFeedback(false);
    }
}
```

### 8. Turn Progression System

#### Accelerated Progression
```javascript
function revealRemainingCrimeTurns() {
    // If user solves crime scenes before turn 5, show all remaining clues
    for (let turn = currentTurn + 1; turn <= 5; turn++) {
        displayTurn(turn, true); // true = instant reveal
        updateTimelineView(turn);
        updateLocationsView(turn);
    }
    currentTurn = 5;
}

function addFinalLocationTurns() {
    // Add turns 6-7 to the timeline
    setTimeout(() => {
        displayTurn(6);
        currentTurn = 6;
    }, 1000);
    
    setTimeout(() => {
        displayTurn(7);
        currentTurn = 7;
    }, 3000);
}
```

### 9. Clue Rendering System

#### Multi-Clue Display
```javascript
function renderClue(clue, turnNumber) {
    const clueElement = document.createElement('div');
    clueElement.className = `clue-item clue-${clue.type}`;
    
    switch (clue.type) {
        case 'theme':
            clueElement.innerHTML = `
                <span class="clue-type">🎯 Theme</span>
                <span class="clue-content">${clue.content}</span>
            `;
            break;
        
        case 'distance':
            clueElement.innerHTML = `
                <span class="clue-type">📏 Distance</span>
                <span class="clue-content">${clue.content}</span>
            `;
            break;
        
        case 'timezone':
            clueElement.innerHTML = `
                <span class="clue-type">🕐 Timezone</span>
                <span class="clue-content">${clue.content}</span>
            `;
            break;
        
        case 'image':
            const clueData = JSON.parse(clue.data || '{}');
            const location = gameData.locationsV2.find(l => 
                l.hasImage && l.imageTurn === turnNumber
            );
            
            if (location && location.imageUrl) {
                clueElement.innerHTML = `
                    <span class="clue-type">📸 Evidence Photo</span>
                    <img src="${location.imageUrl}" 
                         class="evidence-thumbnail" 
                         onclick="openEvidenceModal('${location.imageUrl}', 'Turn ${turnNumber} Evidence')"
                         title="Click to view full size">
                    <p class="clue-description">${clue.description || ''}</p>
                `;
            }
            break;
        
        case 'breakthrough':
            clueElement.innerHTML = `
                <span class="clue-type">💡 Breakthrough</span>
                <span class="clue-content">${clue.content}</span>
            `;
            break;
        
        default:
            clueElement.innerHTML = `
                <span class="clue-type">📝 Intel</span>
                <span class="clue-content">${clue.content}</span>
            `;
    }
    
    return clueElement;
}
```

### 10. CSS Enhancements (Minimal)

#### New Clue Type Styles
```css
/* Add to existing styles.css */
.clue-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    border-left: 4px solid #667eea;
}

.clue-type {
    font-weight: 600;
    color: #667eea;
    min-width: 120px;
}

.clue-content {
    flex: 1;
}

.clue-description {
    font-style: italic;
    color: #666;
    margin-top: 4px;
}

.evidence-thumbnail {
    width: 80px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid #ddd;
}

.evidence-thumbnail:hover {
    border-color: #667eea;
}

.phase-unlock-message {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
}

.case-complete {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
}

.input-feedback {
    font-size: 14px;
    margin-top: 4px;
}

.input-feedback.correct {
    color: #28a745;
}

.input-feedback.incorrect {
    color: #dc3545;
}
```

## Implementation Steps

1. **Create detective-v2.html**: Copy existing detective.html
2. **Update API calls**: Change to V2 endpoints (`/api/v2/cases/${id}`)
3. **Modify timer**: Change countdown to elapsed time tracker
4. **Enhance Investigation Journal**: Add multi-clue rendering
5. **Update Check Answers**: Implement two-phase system
6. **Add turn progression**: Handle accelerated reveals and final turns
7. **Test with V2 games**: Verify all clue types display correctly

## Key Reused Components

- ✅ **Header system**: No changes needed
- ✅ **Modal system**: Reuse `openEvidenceModal()` function
- ✅ **Tab switching**: Keep existing 3-tab structure
- ✅ **Case file styling**: Maintain authentic detective aesthetic
- ✅ **Responsive design**: Keep mobile-first approach

## Success Criteria

- V2 games load and display correctly
- All clue types render properly in timeline
- Two-phase answer system works (crime scenes → final location)
- Accelerated progression reveals remaining clues when needed
- Final location phase unlocks after crime scenes solved
- Timer tracks elapsed time instead of counting down
- Evidence modal system works with multiple images per location
- Existing detective interface aesthetic preserved