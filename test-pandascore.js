const axios = require('axios');
require('dotenv').config();

const PANDASCORE_API_KEY = process.env.PANDASCORE_API_KEY;

async function testPandaScore() {
    try {
        console.log('Testing PandaScore API...');
        const response = await axios.get('https://api.pandascore.co/csgo/matches/upcoming', {
            headers: {
                'Authorization': `Bearer ${PANDASCORE_API_KEY}`,
                'Accept': 'application/json'
            },
            params: {
                per_page: 5
            }
        });

        console.log('Success! Found', response.data.length, 'upcoming matches.');
        response.data.forEach(match => {
            console.log(`- ${match.name} (${match.begin_at})`);
        });
    } catch (error) {
        console.error('Error testing PandaScore API:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testPandaScore();
