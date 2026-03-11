import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSteam() {
    console.log("Fetching user...");
    const user = await prisma.user.findUnique({ where: { id: 'cmmdtsywu000063jwfmi5m0oz' } });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log(`User: ${user.steamId}, Auth: ${user.steamMatchAuthCode}, Latest: ${user.steamLatestMatchCode}`);

    const { getSteamMatchHistory } = require('../src/services/steam-service');
    const matches = await getSteamMatchHistory(
        user.steamId as string,
        user.steamMatchAuthCode as string,
        user.steamLatestMatchCode || '',
        5
    );

    console.log("Fetched Steam Matches Count:", matches.length);
    if (matches.length > 0) {
        console.log("First Match:", matches[0]);
    } else {
        console.log("No matches returned from Steam.");
    }
}

checkSteam().catch(console.error).finally(() => prisma.$disconnect());
