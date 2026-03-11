import * as dotenv from 'dotenv';
dotenv.config();

async function testMatchcode() {
    const steamId = '76561198024691636';
    const authCode = '9BEJ-H89HH-UPBD'; // Code provided by user
    const knownCode = 'CSGO-ayCMf-hSHUh-SQzDn-LUMje-YjEuA'; // Latest known code

    console.log("Testing Steam API directly...");
    console.log(`SteamID: ${steamId}`);
    console.log(`AuthCode: ${authCode}`);
    console.log(`KnownCode: ${knownCode}`);

    try {
        const { getSteamMatchHistory } = require('../src/services/steam-service');
        const matches = await getSteamMatchHistory(steamId, authCode, knownCode, 2);
        console.log(`\nSUCCESS! Found ${matches.length} matches.`);
        if (matches.length > 0) {
            console.log(matches[0]);
        }
    } catch (e: any) {
        console.log(`\nFAILED! Error data:`);
        console.dir(e, { depth: null });
    }
}

testMatchcode();
