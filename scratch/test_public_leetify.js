const axios = require('axios');

const LEETIFY_API_KEY = '4549d73d-8a0d-40ff-9051-a3166c518dae';
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com/v3';
const steamId64 = '76561198829795742';

async function test() {
    try {
        console.log(`[Test Public] Buscando dados para ${steamId64}...`);
        const response = await axios.get(`${LEETIFY_BASE_URL}/profile?steam64_id=${steamId64}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        const data = response.data;
        console.log(`[Test Public] Ranks:`, JSON.stringify(data.ranks, null, 2));
        console.log(`[Test Public] Premier Rating: ${data.ranks?.premier}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
