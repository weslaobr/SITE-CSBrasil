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
        matchmaking?: number;
    };
    ratings: {
        leetifyRating: number;
        aim: number;
        utility: number;
        positioning: number;
        clutching: number;
        opening: number;
        // Advanced Stats
        timeToDamage?: number;
        reactionTime?: number;
        crosshairPlacement?: number;
        preaim?: number;
        kdRatio?: number;
        adr?: number;
        aimAccuracy?: number;
        headAccuracy?: number;
        wallbangKillPercentage?: number;
        smokeKillPercentage?: number;
        hltvRating2?: number;
        kast?: number;
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
            // Map advanced stats if present, otherwise null (will be mocked in API or frontend)
            timeToDamage: data.ratings?.timeToDamage,
            reactionTime: data.ratings?.reactionTime,
            crosshairPlacement: data.ratings?.crosshairPlacement,
            preaim: data.ratings?.preaim,
            kdRatio: data.ratings?.kdRatio,
            adr: data.ratings?.adr,
            aimAccuracy: data.ratings?.aimAccuracy,
            headAccuracy: data.ratings?.headAccuracy,
            wallbangKillPercentage: data.ratings?.wallbangKillPercentage,
            smokeKillPercentage: data.ratings?.smokeKillPercentage,
            hltvRating2: data.ratings?.hltvRating2,
            kast: data.ratings?.kast,
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
                gamersClubLevel: data.ranks?.gamers_club,
                matchmaking: data.ranks?.skill_level || data.ranks?.matchmaking
            },
            ratings: ratingsData as any,
            recentMatches: data.recent_matches || []
        };
    } catch (error) {
        console.error(`Error fetching Leetify data for ${steamId64}:`, error);
        return null;
    }
};
/**
 * Busca o rating máximo histórico do jogador no Leetify (Premier/Matchmaking)
 * Útil como fallback quando a API pública retorna null
 */
export const getLeetifyMaxRating = async (steamId64: string): Promise<number> => {
    try {
        const response = await axios.get(`https://api.cs-prod.leetify.com/api/profile/id/${steamId64}`, {
            headers: {
                'Origin': 'https://leetify.com',
                'Referer': 'https://leetify.com/',
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        const games = response.data?.games || [];
        // Filtra jogos de matchmaking/premier e pega o maior skillLevel visto
        // Consideramos apenas skillLevel > 100 para evitar confundir Rank Competitivo (1-18) com Rating Premier
        const max = games
            .filter((g: any) => g.dataSource === 'matchmaking' && g.skillLevel > 100)
            .reduce((m: number, g: any) => Math.max(m, g.skillLevel), 0);
            
        return max;
    } catch (error: any) {
        console.error(`[Leetify MaxRating] Error for ${steamId64}:`, error.message);
        return 0;
    }
};
