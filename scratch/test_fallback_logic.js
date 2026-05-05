const axios = require('axios');

async function testApi() {
    try {
        const url = 'http://localhost:3000/api/match/manual_1?profileSteamId=76561198375946288';
        console.log('Fetching:', url);
        // Fallback since server might not be running: test the logic directly
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const localMatch = await prisma.globalMatch.findUnique({
            where: { id: 'manual_1' }
        });
        
        const localMeta = localMatch.metadata || {};
        
        let resolvedMapName = localMatch.mapName || 'Desconhecido';
        if (resolvedMapName === 'Desconhecido' && localMeta.demoUrl) {
            const demoFileName = decodeURIComponent(localMeta.demoUrl).split('/').pop() || '';
            console.log('Demo filename:', demoFileName);
            const mapMatch = demoFileName.match(/_(de_[a-z0-9]+|cs_[a-z0-9]+)/i);
            console.log('Map match regex result:', mapMatch);
            if (mapMatch) resolvedMapName = mapMatch[1];
        }
        
        console.log('Resolved Map Name:', resolvedMapName);
        
        const totalRounds = (localMatch.scoreA ?? 0) + (localMatch.scoreB ?? 0);
        const estimatedDuration = localMeta.duration || 
            (totalRounds > 0 ? `${Math.floor(totalRounds * 1.75)}:00` : null);
        console.log('Total rounds:', totalRounds);
        console.log('Estimated Duration:', estimatedDuration);
        
        const myScore = localMatch.scoreB; // steamId above is in team 2
        const theirScore = localMatch.scoreA;
        const resolvedResult = myScore > theirScore ? 'win' : myScore < theirScore ? 'loss' : 'tie';
        console.log('My Score (Team 2):', myScore, 'Their Score (Team 3):', theirScore, 'Result:', resolvedResult);
        
        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
    }
}

testApi();
