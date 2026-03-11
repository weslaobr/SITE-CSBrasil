const axios = require('axios');

const steamId = '76561198024691636'; // User's SteamID from logs

async function testInventory(url, label) {
    console.log(`--- Testing ${label} ---`);
    console.log(`URL: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': `https://steamcommunity.com/profiles/${steamId}/inventory/`
            },
            timeout: 10000
        });
        console.log(`Success! Found ${response.data.assets?.length || 0} assets and ${response.data.descriptions?.length || 0} descriptions.`);
        return true;
    } catch (error) {
        console.log(`Failed: ${error.response?.status} ${error.response?.statusText || ''}`);
        if (error.response?.data) {
            console.log('Error Data:', JSON.stringify(error.response.data).substring(0, 100));
        }
        return false;
    }
}

async function main() {
    // Test 1: Current implementation
    await testInventory(`https://steamcommunity.com/inventory/${steamId}/730/2?l=brazilian&count=5000`, 'Original');

    // Test 2: English + Smaller count
    await testInventory(`https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=75`, 'English + Small Count');

    // Test 3: No parameters
    await testInventory(`https://steamcommunity.com/inventory/${steamId}/730/2`, 'No Params');

    // Test 4: Alternative endpoint format (sometimes works better)
    await testInventory(`https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2`, 'Profiles JSON endpoint');
}

main();
