const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STEAM_API_KEY = "75753DB88FD3EC75CA4A63681C3C4DFC";

async function main() {
    const user = await prisma.user.findFirst({
        where: { steamMatchAuthCode: { not: null } }
    });

    if (!user) {
        console.log("No user found with auth code");
        return;
    }

    console.log(`Checking SteamID: ${user.steamId}`);
    console.log(`Auth Code: ${user.steamMatchAuthCode}`);
    console.log(`Known Code: ${user.steamLatestMatchCode}`);

    try {
        const res = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/`, {
            params: { key: STEAM_API_KEY, steamids: user.steamId }
        });
        console.log("Steam Profile:", JSON.stringify(res.data.response.players[0], null, 2));

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
        console.error("Error:", err.response?.status, err.response?.data);
    }
}

main().finally(() => prisma.$disconnect());
