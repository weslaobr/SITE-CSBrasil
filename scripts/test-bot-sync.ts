import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function runSync() {
    const userId = 'cmmdtsywu000063jwfmi5m0oz';

    // 1. Update the user with the code they provided
    console.log("Updating Auth Code...");
    await prisma.user.update({
        where: { id: userId },
        data: { steamMatchAuthCode: '9BEJ-H89HH-UPBD' }
    });

    // 2. We'll simulate the route's exact functionality but directly here to bypass NextAuth for the test
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { steamId: true, steamMatchAuthCode: true, steamLatestMatchCode: true }
    });

    const { getSteamMatchHistory } = require('../src/services/steam-service');

    const newestMatch = await prisma.match.findFirst({
        where: { userId, source: 'Steam' },
        orderBy: { matchDate: 'desc' }
    });

    const stopAtCode = newestMatch?.externalId || '';
    const startCode = user?.steamLatestMatchCode || '';

    console.log(`Starting Sync: start=${startCode}, stop=${stopAtCode}`);
    const steamMatches = await getSteamMatchHistory(
        user?.steamId,
        user?.steamMatchAuthCode,
        startCode,
        10,
        '',
        stopAtCode
    );

    console.log(`Found ${steamMatches.length} raw matches from Steam`);

    for (const match of steamMatches) {
        if (match.id === 'sync-ready' || match.id === 'error-412') continue;

        let realDetails = null;
        try {
            console.log(`Asking bot for details: ${match.externalId}`);
            const botRes = await axios.get(`http://localhost:3005/match/${match.externalId}`, { timeout: 15000 });
            if (botRes.status === 200) {
                realDetails = botRes.data;
                console.log(`Bot Success: ${realDetails.map_name}, SCORE: ${realDetails.score}`);
            }
        } catch (e: any) {
            console.log(`Bot Error for ${match.externalId}:`, e.message);
        }

        // Mock upsert
        console.log("UPSERT MOCK:", {
            externalId: match.externalId,
            mapName: realDetails?.map_name || match.mapName,
            kills: realDetails?.kills !== undefined ? realDetails.kills : match.kills,
            deaths: realDetails?.deaths !== undefined ? realDetails.deaths : match.deaths,
            score: realDetails?.score || match.score,
            isMocked: !realDetails
        });
    }
}

runSync().catch(console.error).finally(() => prisma.$disconnect());
