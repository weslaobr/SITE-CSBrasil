import axios from 'axios';

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY || '4549d73d-8a0d-40ff-9051-a3166c518dae';

export interface LeetifyRanks {
    premier: number | null;
    faceitElo: number | null;
    wingman: number | null;
    competitive: Array<{ map_name: string; rank: number }>;
}

export async function getLeetifyProfile(steamId64: string): Promise<LeetifyRanks | null> {
    const url = `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId64}`;

    try {
        const response = await axios.get(url, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            },
            timeout: 5000
        });

        if (response.data && response.data.ranks) {
            return {
                premier: response.data.ranks.premier,
                faceitElo: response.data.ranks.faceit_elo,
                wingman: response.data.ranks.wingman,
                competitive: response.data.ranks.competitive || []
            };
        }
        return null;
    } catch (error: any) {
        console.error(`[Leetify Service] Error fetching profile for ${steamId64}:`, error.message);
        return null;
    }
}
