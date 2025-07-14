# Specification: Redesign /game/index.html Using Detective Template

## Overview
Redesign the case gallery page (`/game/index.html`) to use the same layout structure as `detective.html`, leveraging existing styles.css classes as much as possible. The goal is to maximize code reuse while maintaining the core case gallery functionality.

## Analysis: Current Structure Comparison

### Detective.html Template Structure
```html
<body>
  <div class="game-container">
    <!-- Detective Header Container (injected by detective-header.js) -->
    <div id="detective-header-container"></div>
    
    <!-- Detective File Tabs -->
    <div class="detective-tabs">
      <button class="tab-button active">Case Details</button>
      <button class="tab-button">Investigation Board</button>
    </div>
    
    <!-- Tab Content -->
    <div class="tab-content">
      <div class="tab-panel active">
        <!-- Main content -->
      </div>
    </div>
  </div>
</body>
```

### Current index.html Structure
```html
<body>
  <div class="gallery-container">
    <!-- Custom Header -->
    <div class="header">
      <div class="header-left">
        <img src="wwc-logo.png" class="main-logo">
        <div class="page-title">Case Gallery</div>
      </div>
      <div class="user-menu-container">
        <!-- User menu implementation -->
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="main-content">
      <!-- Welcome message and case cards -->
    </div>
  </div>
</body>
```

## New Design Specification

### 1. HTML Structure Changes

#### 1.1 Container Structure
- **Change**: Replace `gallery-container` with `game-container` class
- **Rationale**: Reuse existing `.game-container` styles from styles.css
- **CSS**: Use existing styles without modification

#### 1.2 Header System
- **Change**: Remove custom header, use detective-header.js injection system
- **Implementation**: 
  - Add `<div id="detective-header-container"></div>` 
  - Include `detective-header.js` script
  - Modify `renderDetectiveHeader()` to show "Case Gallery" as title
- **Benefits**: Consistent header across all pages, reuse existing styles

#### 1.3 Tab System Adaptation
- **Change**: Repurpose detective tab system for case gallery
- **Structure**:
  ```html
  <div class="detective-tabs">
    <button class="tab-button active" onclick="switchTab('allCases')">All Cases</button>
    <button class="tab-button" onclick="switchTab('myCases')">My Cases</button>
  </div>
  
  <div class="tab-content">
    <div class="tab-panel active" id="allCasesPanel">
      <!-- All cases content -->
    </div>
    <div class="tab-panel" id="myCasesPanel">
      <!-- User's solved cases -->
    </div>
  </div>
  ```
- **Benefits**: Reuse existing tab styles, add new functionality

### 2. CSS Strategy: Maximum Reuse

#### 2.1 Existing Styles to Reuse
- **Container**: `.game-container` - exact reuse
- **Header**: `.case-header`, `.case-header-content` - exact reuse
- **Tabs**: `.detective-tabs`, `.tab-button`, `.tab-content`, `.tab-panel` - exact reuse
- **Loading**: `.loading-container`, `.loading-spinner` - exact reuse
- **Modals**: `.image-modal`, `.modal-content`, `.modal-header` - exact reuse

#### 2.2 Minimal New CSS Required
```css
/* Case Gallery Specific Styles - ADD TO styles.css */
.case-gallery-section {
  padding: 20px;
  background: 
    repeating-linear-gradient(transparent 0px, transparent 40px, 
    rgba(26, 91, 91, 0.05) 40px, rgba(26, 91, 91, 0.05) 42px);
  background-color: #FFF8DC;
  background-attachment: local;
  flex: 1;
  overflow-y: auto;
}

.welcome-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.cases-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.case-item {
  background: 
    linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.95) 100%);
  border: 2px solid var(--primary-orange);
  padding: 16px;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
}

.case-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 91, 91, 0.2);
}

.case-item.solved {
  opacity: 0.8;
  border-color: var(--success);
}

.case-item.solved::after {
  content: 'SOLVED';
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--success);
  color: white;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.case-villain {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.villain-mugshot {
  width: 60px;
  height: 60px;
  border: 3px solid var(--primary-orange);
  cursor: pointer;
  position: relative;
}

.villain-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.villain-info h3 {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-black);
  margin: 0 0 4px 0;
  text-transform: uppercase;
}

.villain-info p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
}

.case-summary {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-bottom: 12px;
  padding: 8px 10px;
  background: rgba(248, 249, 250, 0.6);
  border-left: 2px solid var(--primary-teal);
}

.case-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  border: 2px solid var(--primary-teal);
  background: var(--primary-teal);
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Courier New', monospace;
  text-transform: uppercase;
  flex: 1;
}

.action-button:hover {
  background: var(--primary-orange);
  border-color: var(--primary-orange);
}

.action-button.secondary {
  background: transparent;
  color: var(--primary-teal);
}

.action-button.secondary:hover {
  background: var(--primary-teal);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
}

.empty-state h3 {
  font-size: 16px;
  color: var(--primary-teal);
  margin-bottom: 8px;
  text-transform: uppercase;
}
```

### 3. JavaScript Integration

#### 3.1 Detective Header Integration
- **Include**: `detective-header.js` script
- **Modify**: Update `renderDetectiveHeader()` to support gallery mode
- **Title**: Set dynamic title to "Case Gallery" 
- **No Theme Ribbon**: Skip theme ribbon for gallery

#### 3.2 Tab System Functionality
```javascript
let activeTab = 'allCases';

function switchTab(tabName) {
  // Reuse existing tab switching logic from detective.html
  const tabs = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  document.getElementById(tabName + 'Panel').classList.add('active');
  
  activeTab = tabName;
  renderCasesForTab(tabName);
}

function renderCasesForTab(tabName) {
  if (tabName === 'allCases') {
    renderAllCases();
  } else if (tabName === 'myCases') {
    renderSolvedCases();
  }
}
```

#### 3.3 Enhanced Functionality
- **All Cases Tab**: Shows all available cases (current functionality)
- **My Cases Tab**: Shows only cases solved by the user (new functionality)
- **Consistent Modals**: Reuse existing modal system from detective.html

### 4. Implementation Steps

#### Step 1: Backup Current File
```bash
mv /game/index.html /game/index_old.html
```

#### Step 2: Create New index.html Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Worldwide Chase - Case Gallery</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="game-container">
        <!-- Loading State -->
        <div class="loading-container" id="loadingContainer">
            <div class="loading-spinner"></div>
            <h3>Loading Case Gallery...</h3>
            <p>Gathering case files from headquarters</p>
        </div>

        <!-- Main Gallery Interface -->
        <div id="galleryInterface" style="display: none;">
            <!-- Detective Header Container -->
            <div id="detective-header-container"></div>

            <!-- Gallery Tabs -->
            <div class="detective-tabs">
                <button class="tab-button active" id="allCasesTab" onclick="switchTab('allCases')">
                    All Cases
                </button>
                <button class="tab-button" id="myCasesTab" onclick="switchTab('myCases')">
                    My Cases
                </button>
            </div>

            <!-- Tab Content -->
            <div class="tab-content">
                <!-- All Cases Tab -->
                <div class="tab-panel active" id="allCasesPanel">
                    <div class="case-gallery-section">
                        <div class="welcome-stats">
                            <span>📁 <span id="totalCases">0</span> Cases</span>
                            <span>🌍 <span id="totalThemes">0</span> Themes</span>
                            <span>🏆 <span id="solvedCases">0</span> Solved</span>
                        </div>
                        <div class="cases-grid" id="allCasesGrid">
                            <!-- Cases will be populated here -->
                        </div>
                    </div>
                </div>

                <!-- My Cases Tab -->
                <div class="tab-panel" id="myCasesPanel">
                    <div class="case-gallery-section">
                        <div class="empty-state" id="myCasesEmpty">
                            <h3>No Solved Cases Yet</h3>
                            <p>Start solving cases to see them here!</p>
                        </div>
                        <div class="cases-grid" id="myCasesGrid" style="display: none;">
                            <!-- Solved cases will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Reuse existing modals from detective.html -->
    <div id="imageModal" class="image-modal">
        <div class="modal-content">
            <button class="modal-close" onclick="closeImageModal()">&times;</button>
            <div class="modal-header" id="modalHeader">Case Details</div>
            <div id="modalBody"></div>
        </div>
    </div>

    <script src="detective-header.js"></script>
    <script>
        // Include existing case gallery JavaScript with modifications
        // Add tab switching functionality
        // Integrate with detective header system
    </script>
</body>
</html>
```

#### Step 3: Modify detective-header.js
```javascript
function renderDetectiveHeader(options = {}) {
    const isGallery = options.isGallery || false;
    const title = options.title || (isGallery ? 'Case Gallery' : document.getElementById('caseTitle')?.textContent || 'Investigation File');
    
    return `
        <div class="case-header">
            <div class="case-header-content">
                <div class="header-left">
                    <a href="/" style="display: block;">
                        <img src="wwc-logo.png" alt="Worldwide Chase" class="main-logo">
                    </a>
                </div>
                <div class="header-center" style="flex: 1;">
                    <h1 class="case-title">${title}</h1>
                </div>
                <div class="header-right">
                    <div id="userMenuContainer" class="user-menu-container">
                        <!-- User menu content -->
                    </div>
                </div>
            </div>
        </div>
        ${!isGallery ? `
        <div class="theme-ribbon">
            <span class="theme-text" id="themeBadge"></span>
        </div>
        ` : ''}
    `;
}

// Auto-inject with gallery detection
document.addEventListener('DOMContentLoaded', function() {
    const isGallery = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/game/');
    const headerContainer = document.getElementById('detective-header-container');
    if (headerContainer) {
        headerContainer.innerHTML = renderDetectiveHeader({ isGallery });
    }
});
```

#### Step 4: Add New CSS to styles.css
Add the minimal new CSS classes listed in section 2.2 to the existing styles.css file.

### 5. Enhanced Features Through Style Reuse

#### 5.1 Tab System Benefits
- **All Cases**: Shows all available cases (existing functionality)
- **My Cases**: Shows user's solved cases with progress tracking
- **Consistent UI**: Same look and feel as detective investigation tabs

#### 5.2 Modal System Reuse
- **Case Details Modal**: Reuse existing `.image-modal` styles
- **Villain Profile Modal**: Reuse existing modal system
- **Help Modal**: Integrate with existing modal patterns

#### 5.3 Loading States
- **Consistent Loading**: Reuse existing `.loading-container` styles
- **Error States**: Reuse existing error handling patterns

### 6. Key Benefits of This Approach

#### 6.1 Code Reuse
- **90% CSS Reuse**: Leveraging existing styles.css classes
- **Consistent Components**: Shared header and modal systems
- **Minimal New Code**: Only case-specific styles needed

#### 6.2 Enhanced Functionality
- **Tab System**: Adds "My Cases" view using existing tab styles
- **Better Organization**: Cleaner separation of all vs solved cases
- **Consistent Experience**: Same UI patterns as detective interface

#### 6.3 Maintainability
- **Single Source**: All styles in one file
- **Shared Components**: Header component used across pages
- **Easy Updates**: Changes to styles.css affect all pages

### 7. Functional Changes for Style Compatibility

#### 7.1 Acceptable Changes
- **Tab Navigation**: Split cases into "All Cases" and "My Cases" tabs
- **Card Layout**: Adapt case cards to use existing component styles
- **Modal System**: Use detective modal system instead of custom modals

#### 7.2 Preserved Core Functionality
- **Case Loading**: All cases still load and display
- **User Authentication**: User system remains intact
- **Case Selection**: Users can still select and solve cases
- **Villain Profiles**: Villain modal functionality preserved

### 8. Testing Strategy

#### 8.1 Style Verification
- [ ] All existing styles.css classes work correctly
- [ ] New minimal styles integrate properly
- [ ] No style conflicts between old and new code

#### 8.2 Functionality Testing
- [ ] Tab switching works correctly
- [ ] Case loading functions properly
- [ ] User authentication preserved
- [ ] Modal systems work as expected

#### 8.3 Integration Testing
- [ ] Header component works in gallery mode
- [ ] Navigation between gallery and detective works
- [ ] User state persists across page transitions

### 9. Implementation Priority

1. **Phase 1**: Basic structure with tab system
2. **Phase 2**: Case loading and display functionality
3. **Phase 3**: Modal integration and user system
4. **Phase 4**: Testing and refinement

This specification prioritizes maximum reuse of existing styles.css while enhancing the case gallery with a tab-based interface that provides better organization and user experience.