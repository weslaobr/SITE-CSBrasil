const axios = require('axios');

async function test() {
    const url = 'https://api.skinport.com/v1/items?app_id=730&currency=BRL';
    console.log(`Testing ${url}...`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 20000
        });
        console.log('Success!');
        const data = response.data;
        console.log('Data type:', typeof data);
        if (Array.isArray(data)) {
            console.log(`Total items: ${data.length}`);
            if (data.length > 0) {
                console.log(`Sample:`, JSON.stringify(data[0]));
            }
        } else {
            console.log('Invalid format');
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
        }
    }
}

test();
