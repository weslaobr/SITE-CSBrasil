const axios = require('axios');

async function test() {
    const url = 'https://raw.githubusercontent.com/SteamDatabase/MarketPrices/master/730.json';
    console.log(`Testing ${url}...`);
    try {
        const response = await axios.get(url, {
            timeout: 10000
        });
        console.log('Success!');
        const data = response.data;
        console.log('Data type:', typeof data);
        if (data && data.success && data.items) {
            const keys = Object.keys(data.items);
            console.log(`Total items: ${keys.length}`);
            if (keys.length > 0) {
                console.log(`Sample: ${keys[0]} =`, data.items[keys[0]]);
            }
        } else {
            console.log('Invalid format:', JSON.stringify(data).substring(0, 100));
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
