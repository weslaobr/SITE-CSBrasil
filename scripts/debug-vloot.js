const axios = require('axios');

async function testFetch() {
    const url = 'https://api.vloot.io/v1/prices/cs2';
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url, { timeout: 15000 });
        console.log('Success!');
        const data = response.data;
        
        const keys = Object.keys(data);
        console.log(`Total items: ${keys.length}`);
        
        if (keys.length > 0) {
            const firstKey = keys[0];
            const firstValue = data[firstKey];
            console.log(`Sample Key: "${firstKey}"`);
            console.log(`Sample Value: ${JSON.stringify(firstValue)}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFetch();
