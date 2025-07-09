/**
 * Detective Header Partial
 * Renders the case header with logo, title, and user menu
 */

function renderDetectiveHeader() {
    // Check if we're on the gallery page
    const isGalleryPage = window.location.pathname.includes('index.html') || 
                         window.location.pathname.endsWith('/game/') ||
                         window.location.pathname.endsWith('/game');
    
    return `
        <!-- Case Header -->
        <div class="case-header">
            <div class="case-header-content">
                <div class="header-left">
                    <a href="/" class="logo-link">
                        <img src="wwc-logo.png" alt="Worldwide Chase" class="main-logo">
                    </a>
                </div>
                <div class="header-center">
                    <h1 class="case-title" id="caseTitle"></h1>
                </div>
                <div class="header-right">
                    <div id="userMenuContainer" class="user-menu-container">
                        <!-- User Menu Button -->
                        <button id="userMenuButton" class="user-menu-button" onclick="toggleUserMenu()">
                            <span id="userMenuText">Sign In</span>
                            <svg class="menu-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            </svg>
                        </button>
                        
                        <!-- User Menu Dropdown -->
                        <div id="userMenuDropdown" class="user-menu-dropdown hidden">
                            <div id="signedOutMenu" class="menu-section">
                                <button class="menu-item" onclick="signIn()">
                                    <span class="menu-icon">👤</span>
                                    Sign In
                                </button>
                                <button class="menu-item" onclick="window.location.href='/game/'">
                                    <span class="menu-icon">📁</span>
                                    Cases
                                </button>
                                <button class="menu-item" onclick="showHelpModal()">
                                    <span class="menu-icon">❓</span>
                                    How to Play
                                </button>
                            </div>
                            
                            <div id="signedInMenu" class="menu-section hidden">
                                <div class="menu-header" id="menuUserName">Detective</div>
                                <button class="menu-item" onclick="showProfileModal()">
                                    <span class="menu-icon">👤</span>
                                    Profile
                                </button>
                                <button class="menu-item" onclick="window.location.href='/game/'">
                                    <span class="menu-icon">📁</span>
                                    Cases
                                </button>
                                <button class="menu-item" onclick="showHelpModal()">
                                    <span class="menu-icon">❓</span>
                                    How to Play
                                </button>
                                <div class="menu-divider"></div>
                                <button class="menu-item" onclick="signOut()">
                                    <span class="menu-icon">🚪</span>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function to inject the header into the page
function injectDetectiveHeader() {
    const headerContainer = document.getElementById('detective-header-container');
    if (headerContainer) {
        headerContainer.innerHTML = renderDetectiveHeader();
    }
}

// Auto-inject when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    injectDetectiveHeader();
    
    // Set appropriate title based on page
    setTimeout(() => {
        const caseTitleElement = document.getElementById('caseTitle');
        if (caseTitleElement) {
            // Check if we're on the gallery page (index.html or root)
            const isGalleryPage = window.location.pathname.includes('index.html') || 
                                 window.location.pathname.endsWith('/game/') ||
                                 window.location.pathname.endsWith('/game');
            
            if (isGalleryPage) {
                caseTitleElement.textContent = 'Case Gallery';
            }
            // For detective.html, the title will be set by the case loading logic
        }
    }, 50);
});