const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the game details page
  await page.goto('http://localhost:9091/admin/game-details-v2.html?id=cmcy5qle70000n7ac8o1x1022');
  
  // Wait for the page to load
  await page.waitForSelector('main', { timeout: 5000 });
  
  // Execute JavaScript in the browser context to get currentGame
  const gameData = await page.evaluate(() => {
    if (typeof currentGame \!== 'undefined') {
      return {
        gameId: currentGame.id,
        locationsV2Count: currentGame.locationsV2 ? currentGame.locationsV2.length : 0,
        locationsV2: currentGame.locationsV2 ? currentGame.locationsV2.map(loc => ({
          position: loc.position,
          name: loc.name,
          imageTurn: loc.imageTurn,
          hasImageUrl: \!\!loc.imageUrl
        })) : [],
        gameplayTurnsCount: currentGame.gameplayTurns ? currentGame.gameplayTurns.length : 0,
        imageClues: currentGame.gameplayTurns ? currentGame.gameplayTurns
          .filter(turn => turn.clues && turn.clues.some(clue => clue.type === 'image'))
          .map(turn => ({
            turnNumber: turn.turnNumber,
            imageClues: turn.clues.filter(clue => clue.type === 'image').map(clue => ({
              type: clue.type,
              data: clue.data,
              locationPosition: clue.locationPosition
            }))
          })) : []
      };
    } else {
      return { error: 'currentGame is not defined' };
    }
  });
  
  console.log('Game Data Structure:');
  console.log(JSON.stringify(gameData, null, 2));
  
  await browser.close();
})();
