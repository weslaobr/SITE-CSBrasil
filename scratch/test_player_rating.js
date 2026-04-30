const axios = require('axios');

const LEETIFY_API_BASE = 'https://api.cs-prod.leetify.com/api';
const steamId64 = '76561198829795742';

async function test() {
    try {
        console.log(`[Test] Buscando dados para ${steamId64}...`);
        const response = await axios.get(`${LEETIFY_API_BASE}/profile/id/${steamId64}`, {
            headers: {
                'Origin': 'https://leetify.com',
                'Referer': 'https://leetify.com/',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        const games = data.games || [];

        console.log(`[Test] Encontrados ${games.length} jogos/ranks no perfil.`);
        
        const matchmakingGames = games.filter(g => g.dataSource === 'matchmaking');
        console.log(`[Test] Jogos de Matchmaking/Premier:`, JSON.stringify(matchmakingGames, null, 2));

        const premier = matchmakingGames
            .filter(g => g.skillLevel > 0)
            .reduce((max, g) => Math.max(max, g.skillLevel), 0);

        console.log(`[Test] Resultado Premier Rating (Max): ${premier}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
