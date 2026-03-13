import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;

    if (!LEETIFY_API_KEY) {
        return NextResponse.json({ error: "LEETIFY_API_KEY missing" }, { status: 500 });
    }

    try {
        const matchResponse = await axios.get(`${LEETIFY_BASE_URL}/v2/matches/${matchId}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        const data = matchResponse.data;

        // Try to fetch real Steam avatars for all players
        if (data.stats && Array.isArray(data.stats)) {
            const steamIds = data.stats
                .map((p: any) => p.steam64_id || p.player_id || p.steamId)
                .filter(Boolean);

            if (steamIds.length > 0) {
                try {
                    const { getMultiplePlayerProfiles } = await import('@/services/steam-service');
                    const steamProfiles = await getMultiplePlayerProfiles(steamIds);
                    
                    // Create a map for quick lookup
                    const avatarMap = new Map();
                    steamProfiles.forEach((profile: any) => {
                        avatarMap.set(profile.steamid, profile.avatarfull);
                    });

                    // Merge avatars into stats
                    data.stats = data.stats.map((p: any) => ({
                        ...p,
                        avatar_url: avatarMap.get(p.steam64_id || p.player_id || p.steamId) || p.avatar_url
                    }));
                } catch (steamError) {
                    console.error("Error fetching Steam avatars for match details:", steamError);
                }
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {

        console.error(`Error fetching match ${matchId}:`, error.message);
        return NextResponse.json({ error: "Failed to fetch match details" }, { status: 500 });
    }
}
