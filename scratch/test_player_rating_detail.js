const axios = require('axios');

const LEETIFY_API_BASE = 'https://api.cs-prod.leetify.com/api';
const steamId64 = '76561198829795742';

async function test() {
    try {
        const response = await axios.get(`${LEETIFY_API_BASE}/profile/id/${steamId64}`, {
            headers: {
                'Origin': 'https://leetify.com',
                'Referer': 'https://leetify.com/',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        const games = data.games || [];
        
        console.log(`[Test] Total de jogos: ${games.length}`);
        
        const premierRatings = games
            .filter(g => g.dataSource === 'matchmaking' && g.skillLevel > 18) // CS2 Premier are usually > 1000
            .map(g => ({ rating: g.skillLevel, date: g.gameFinishedAt }));
            
        console.log(`[Test] Ratings Premier encontrados:`, JSON.stringify(premierRatings, null, 2));

        const maxRating = premierRatings.reduce((max, g) => Math.max(max, g.rating), 0);
        console.log(`[Test] Max Rating: ${maxRating}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
