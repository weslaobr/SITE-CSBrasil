import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const matchId = 'demo_dc5d64c6894fe35064dce1de';
    
    console.log(`Searching for match ID: ${matchId}`);

    const match = await prisma.match.findUnique({
        where: { id: matchId }
    });
    if (match) console.log('Found in Match table:', JSON.stringify(match, null, 2));

    const globalMatch = await prisma.globalMatch.findUnique({
        where: { id: matchId },
        include: { players: true }
    });
    if (globalMatch) console.log('Found in GlobalMatch table:', JSON.stringify(globalMatch, null, 2));

    const trackerMatch = await prisma.tracker_matches.findUnique({
        where: { match_id: matchId },
        include: { tracker_match_players: true }
    });
    if (trackerMatch) {
        // Handle BigInt for JSON.stringify
        const serialized = JSON.parse(JSON.stringify(trackerMatch, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
        console.log('Found in tracker_matches table:', JSON.stringify(serialized, null, 2));
    }

    if (!match && !globalMatch && !trackerMatch) {
        console.log('Match not found in any table.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
