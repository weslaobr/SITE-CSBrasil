const axios = require('axios');

async function testFetch() {
    // API pública da Skinport
    const url = 'https://api.skinport.com/v1/prices?app_id=730&currency=BRL';
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url, { timeout: 15000 });
        console.log('Success!');
        const data = response.data; // Skinport retorna um array de objetos
        
        console.log(`Total items: ${data.length}`);
        
        if (data.length > 0) {
            const firstItem = data[0];
            console.log(`Sample Item:`, JSON.stringify(firstItem));
            
            // Procura por um item comum de CS2
            const commonItem = 'AK-47 | Slate (Field-Tested)';
            const found = data.find(i => i.market_hash_name === commonItem);
            if (found) {
                console.log(`Found "${commonItem}":`, found);
            } else {
                console.log(`"${commonItem}" not found in list.`);
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFetch();
