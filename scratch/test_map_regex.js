const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
    try {
        const localMatch = await p.globalMatch.findUnique({
            where: { id: 'manual_1' }
        });
        
        let resolvedMapName = localMatch.mapName || 'Desconhecido';
        const localMeta = localMatch.metadata || {};
        
        console.log('Original Map Name:', resolvedMapName);
        console.log('Demo URL:', localMeta.demoUrl);
        
        if (resolvedMapName === 'Desconhecido' && localMeta.demoUrl) {
            const decodedUrl = decodeURIComponent(localMeta.demoUrl);
            const mapMatch = decodedUrl.match(/_(de_[a-zA-Z0-9]+|cs_[a-zA-Z0-9]+)_/i);
            
            console.log('Decoded URL:', decodedUrl);
            console.log('Regex Match:', mapMatch);
            
            if (mapMatch) resolvedMapName = mapMatch[1];
        }
        console.log('Final Map Name:', resolvedMapName);
        
    } finally {
        await p.$disconnect();
    }
}

run();
