const axios = require('axios');
async function run() {
    try {
        const url = 'http://localhost:3000/api/match/manual_1?profileSteamId=76561198375946288';
        const { data } = await axios.get(url);
        console.log("SUCCESS:", data);
    } catch(e) {
        if (e.response) {
            console.error("STATUS:", e.response.status);
            console.error("DATA:", typeof e.response.data === 'string' ? e.response.data.substring(0, 500) : e.response.data);
        } else {
            console.error(e.message);
        }
    }
}
run();
