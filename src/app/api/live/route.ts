import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const steamApiKey = process.env.STEAM_API_KEY;

        if (!steamApiKey) {
            return NextResponse.json({ live: [] });
        }

        // Buscar todos os steamIds cadastrados
        const players = await (prisma as any).player.findMany({
            select: { steamId: true, steamName: true, steamAvatar: true },
        });

        if (players.length === 0) {
            return NextResponse.json({ live: [] });
        }

        // Steam API aceita até 100 IDs por request
        const chunks: any[][] = [];
        for (let i = 0; i < players.length; i += 100) {
            chunks.push(players.slice(i, i + 100));
        }

        const liveNow: any[] = [];

        for (const chunk of chunks) {
            const ids = chunk.map((p: any) => p.steamId).join(',');
            try {
                const res = await fetch(
                    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${ids}`,
                    { next: { revalidate: 60 } }
                );
                const data = await res.json();
                const summaries = data?.response?.players || [];

                for (const summary of summaries) {
                    const isPlayingCS = summary.gameextrainfo?.toLowerCase().includes('counter-strike') ||
                        summary.gameid === '730';

                    if (isPlayingCS && summary.gameserverip) {
                        const match = chunk.find((p: any) => p.steamId === summary.steamid);
                        liveNow.push({
                            steamId: summary.steamid,
                            playerName: summary.personaname || match?.steamName,
                            playerAvatar: summary.avatarfull || match?.steamAvatar,
                            gameMap: summary.gameextrainfo || 'Counter-Strike 2',
                            serverIp: summary.gameserverip,
                            since: new Date().toISOString(),
                        });
                    }
                }
            } catch (chunkErr) {
                console.warn('[LiveAPI] Chunk fetch failed:', chunkErr);
            }
        }

        return NextResponse.json({ live: liveNow, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error('[LiveAPI] Error:', error);
        return NextResponse.json({ live: [] });
    }
}
