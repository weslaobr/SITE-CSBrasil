import axios from 'axios';

async function testLeetify() {
    const steamId64 = '76561198024691636'; // User's Steam ID
    const url = `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId64}`;

    try {
        console.log(`Buscando dados no Leetify para: ${steamId64}...`);
        const response = await axios.get(url, {
            headers: {
                '_leetify_key': `4549d73d-8a0d-40ff-9051-a3166c518dae`
            },
            timeout: 5000
        });

        console.log("--- SUCESSO! ---");

        // Exibir as chaves do nível superior
        console.log("Keys retornadas:", Object.keys(response.data));

        if (response.data.ranks) {
            console.log("🏆 Ranks:", JSON.stringify(response.data.ranks, null, 2));
        }
        if (response.data.rating) {
            console.log("⭐ Rating:", response.data.rating);
        }
        if (response.data.stats) {
            console.log("📈 Stats (Resumo):", Object.keys(response.data.stats));
        }

    } catch (error: any) {
        if (error.response) {
            console.log(`Falha: HTTP ${error.response.status}`);
            console.log(error.response.data);
        } else {
            console.log(`Falha na requisição: ${error.message}`);
        }
    }
}

testLeetify();
