const axios = require('axios');

async function testFetch() {
    const url = 'https://prices.csgotrader.app/latest/prices_v6.json';
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url, { 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
            }
        });
        console.log('Success!');
        if (typeof response.data === 'string') {
            console.log('Response is a STRING (probably HTML). First 500 chars:');
            console.log(response.data.substring(0, 500));
            return;
        }
        
        const keys = Object.keys(response.data);
        console.log(`Total items: ${keys.length}`);
        
        if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = response.data[firstKey];
            console.log(`Sample Key: "${firstKey}"`);
            console.log(`Sample Value Type: ${typeof firstValue}`);
            console.log(`Sample Value: ${JSON.stringify(firstValue).substring(0, 100)}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', JSON.stringify(err.response.data).substring(0, 200));
        }
    }
}

testFetch();
