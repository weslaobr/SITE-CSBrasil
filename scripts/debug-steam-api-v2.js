const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STEAM_API_KEY = "75753DB88FD3EC75CA4A63681C3C4DFC";

async function main() {
    const user = await prisma.user.findFirst({
        where: { steamId: "76561198024691636" }
    });

    if (!user) {
        console.log("No user found with steamId 76561198024691636");
        return;
    }

    console.log(`Checking SteamID: ${user.steamId} (${user.name})`);
    console.log(`Auth Code: [${user.steamMatchAuthCode}]`);
    console.log(`Known Code: [${user.steamLatestMatchCode}]`);

    try {
        const matchRes = await axios.get(`https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1`, {
            params: {
                key: STEAM_API_KEY,
                steamid: user.steamId,
                steamidkey: user.steamMatchAuthCode,
                knowncode: user.steamLatestMatchCode || ''
            }
        });
        console.log("Match API Response:", JSON.stringify(matchRes.data, null, 2));
    } catch (err) {
        console.error("Match API Error Status:", err.response?.status);
        console.error("Match API Error Data:", JSON.stringify(err.response?.data, null, 2));

        // Test with empty knowncode just to see if it changes the error
        try {
            console.log("Retrying with empty knowncode...");
            const matchRes2 = await axios.get(`https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1`, {
                params: {
                    key: STEAM_API_KEY,
                    steamid: user.steamId,
                    steamidkey: user.steamMatchAuthCode,
                    knowncode: ''
                }
            });
            console.log("Match API Response (Empty):", JSON.stringify(matchRes2.data, null, 2));
        } catch (err2) {
            console.error("Match API Error (Empty) Status:", err2.response?.status);
        }
    }
}

main().finally(() => prisma.$disconnect());
