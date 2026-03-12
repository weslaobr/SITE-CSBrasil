const axios = require('axios');

async function testFetch() {
    // Testando cs2.sh ou outra fonte estável
    const url = 'https://api.cs2.sh/v1/prices';
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url, { timeout: 15000 });
        console.log('Success!');
        const data = response.data;
        
        // Verifica estrutura (cs2.sh costuma ter { "status": "success", "data": { ... } } ou direto)
        const prices = data.data || data;
        const keys = Object.keys(prices);
        console.log(`Total items: ${keys.length}`);
        
        if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = prices[firstKey];
            console.log(`Sample Key: "${firstKey}"`);
            console.log(`Sample Value: ${JSON.stringify(firstValue)}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFetch();
