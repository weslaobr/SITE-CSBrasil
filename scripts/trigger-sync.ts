import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { getSteamMatchHistory } from '../src/services/steam-service';

const prisma = new PrismaClient();

async function main() {
    const userId = 'cmmdtsywu000063jwfmi5m0oz'; // User WESLAO

    console.log('--- BEFORE SYNC ---');
    const countBefore = await prisma.match.count({ where: { userId } });
    console.log(`Total Matches: ${countBefore}`);

    console.log('\n--- STARTING SYNC ---');
    try {
        const del = await prisma.match.deleteMany({
            where: {
                userId: userId,
                externalId: 'CSGO-ayCMf-hSHUh-SQzDn-LUMje-YjEuA'
            }
        });
        console.log(`Deleted ${del.count} mocked matches for clean re-sync.`);

        // Alternative: Run a manual check using the service logic
        // But let's just use the user-matches script after the user clicks sync.
    } catch (e: any) {
        console.log('Error:', e.message);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
