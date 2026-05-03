const axios = require('axios');
require('dotenv').config();

const CS2SPACE_API_KEY = process.env.CS2SPACE_API_KEY;
const STEAM_ID = "76561198024691636";

async function checkPlayer() {
    console.log("Checking player:", STEAM_ID);
    console.log("CS2SPACE_API_KEY:", CS2SPACE_API_KEY ? "CONFIGURED" : "MISSING");
    
    if (!CS2SPACE_API_KEY) return;

    try {
        const response = await axios.get(`https://cs2.space/api/lookup`, {
            params: {
                key: CS2SPACE_API_KEY,
                id: STEAM_ID
            }
        });

        console.log("CS2.space response data:", JSON.stringify(response.data, null, 2));
        
        if (response.data.faceit) {
            console.log("Faceit data found:", response.data.faceit);
        } else {
            console.log("No Faceit data found for this player in CS2.space.");
        }
    } catch (error) {
        console.error("Error calling CS2.space:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

checkPlayer();
