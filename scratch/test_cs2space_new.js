const axios = require('axios');
require('dotenv').config();

const CS2SPACE_API_KEY = process.env.CS2SPACE_API_KEY;
const STEAM_ID = "76561198024691636";

async function testCS2SpaceNew() {
    console.log("Testing CS2.space (NEW ENDPOINT) for ID:", STEAM_ID);
    try {
        const response = await axios.get(`https://cs2.space/api/profile/${STEAM_ID}`, {
            headers: {
                'x-api-key': CS2SPACE_API_KEY
            }
        });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.log("Data:", e.response.data);
    }
}

testCS2SpaceNew();
