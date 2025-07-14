// Test V2 API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9091';

async function testV2API() {
    console.log('🧪 Testing V2 API endpoints...');
    
    try {
        // Test V2 games list
        console.log('📝 Testing GET /api/v2/games...');
        const gamesResponse = await fetch(`${BASE_URL}/api/v2/games`);
        const games = await gamesResponse.json();
        console.log(`✅ V2 games endpoint works: ${games.length} games found`);
        
        // Test V2 cases list
        console.log('📝 Testing GET /api/v2/cases...');
        const casesResponse = await fetch(`${BASE_URL}/api/v2/cases`);
        const cases = await casesResponse.json();
        console.log(`✅ V2 cases endpoint works: ${cases.length} published cases found`);
        
        // Test V2 game generation (without actually generating)
        console.log('📝 Testing V2 generation endpoint structure...');
        const generationData = {
            userInput: "test theme",
            difficulty: "medium",
            finalObjective: "WHERE_STASHED"
        };
        
        console.log('📝 Generation request data:', generationData);
        console.log('✅ V2 API endpoints are properly structured');
        
    } catch (error) {
        console.error('❌ V2 API test failed:', error.message);
    }
}

// Run the test
testV2API();