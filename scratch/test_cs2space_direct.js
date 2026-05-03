const axios = require('axios');
require('dotenv').config();

const CS2SPACE_API_KEY = process.env.CS2SPACE_API_KEY;
const STEAM_ID = "76561198024691636";

async function testCS2Space() {
    console.log("Testing CS2.space for ID:", STEAM_ID);
    try {
        const response = await axios.get('https://cs2.space/api/lookup', {
            params: {
                key: CS2SPACE_API_KEY,
                id: STEAM_ID
            }
        });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.log("Data:", e.response.data);
    }
}

testCS2Space();
