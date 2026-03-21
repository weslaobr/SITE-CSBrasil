import axios from 'axios';

const LEETIFY_API_KEY = process.env.LEETIFY_API_KEY;
const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com/v3';

export interface LeetifyPlayerStats {
    meta: {
        name: string;
        avatarUrl: string;
        steamId64: string;
    };
    ranks: {
        premier?: number;
        faceitLevel?: number;
        faceitElo?: number;
        wingmanElo?: number;
        gamersClubLevel?: number;
    };
    ratings: {
        leetifyRating: number;
        aim: number;
        utility: number;
        positioning: number;
        clutching: number;
        opening: number;
    };
    recentMatches: any[];
}

export const getLeetifyPlayerData = async (steamId64: string): Promise<LeetifyPlayerStats | null> => {
    if (!LEETIFY_API_KEY) {
        console.error("LEETIFY_API_KEY is missing in environment variables.");
        return null;
    }

    try {
        const response = await axios.get(`${LEETIFY_BASE_URL}/profile?steam64_id=${steamId64}`, {
            headers: {
                '_leetify_key': LEETIFY_API_KEY
            }
        });

        const data = response.data;

        // Map ratings with fallbacks but keep null if nothing exists
        const ratingsData = data.ratings ? {
            leetifyRating: data.ratings?.leetify || 0,
            aim: data.ratings?.aim || 0,
            utility: data.ratings?.utility || 0,
            positioning: data.ratings?.positioning || 0,
            clutching: data.ratings?.clutching || data.ratings?.clutch || 0,
            opening: data.ratings?.opening || 0,
        } : null;

        return {
            meta: {
                name: data.name,
                avatarUrl: data.avatarUrl,
                steamId64: data.steamId64
            },
            ranks: {
                premier: data.ranks?.premier,
                faceitLevel: data.ranks?.faceit,
                faceitElo: data.ranks?.faceit_elo,
                wingmanElo: data.ranks?.wingman,
                gamersClubLevel: data.ranks?.gamers_club
            },
            ratings: ratingsData as any,
            recentMatches: data.recent_matches || []
        };
    } catch (error) {
        console.error(`Error fetching Leetify data for ${steamId64}:`, error);
        return null;
    }
};
