import axios from 'axios';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const FACEIT_BASE_URL = 'https://open.faceit.com/data/v4';

export interface FaceitProfile {
    player_id: string;
    nickname: string;
    avatar: string;
    games: {
        cs2?: {
            skill_level: number;
            faceit_elo: number;
        };
    };
}

export interface FaceitMatch {
    match_id: string;
    competition_name: string;
    started_at: number;
    finished_at: number;
    teams: any;
    results: any;
}

export const getFaceitPlayer = async (nickname: string): Promise<FaceitProfile | null> => {
    if (!FACEIT_API_KEY) return null;

    try {
        const response = await axios.get(`${FACEIT_BASE_URL}/players`, {
            params: { nickname },
            headers: {
                Authorization: `Bearer ${FACEIT_API_KEY}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching Faceit player:", error);
        return null;
    }
};

export const getFaceitMatchDetails = async (matchId: string): Promise<any | null> => {
    if (!FACEIT_API_KEY) return null;
    try {
        const response = await axios.get(`${FACEIT_BASE_URL}/matches/${matchId}`, {
            headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching Faceit match details:", error);
        return null;
    }
};

export const getFaceitMatchStats = async (matchId: string): Promise<any | null> => {
    if (!FACEIT_API_KEY) return null;
    try {
        const response = await axios.get(`${FACEIT_BASE_URL}/matches/${matchId}/stats`, {
            headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching Faceit match stats:", error);
        return null;
    }
};

export const getFaceitMatches = async (playerId: string): Promise<any[]> => {
    if (!FACEIT_API_KEY) return [];

    try {
        let allMatches: any[] = [];
        let offset = 0;
        const limit = 50; // Reduced limit for better performance when fetching details
        let hasMore = true;

        // Use the stats endpoint which contains real map names and more accurate data
        const response = await axios.get(`${FACEIT_BASE_URL}/players/${playerId}/games/cs2/stats`, {
            params: { offset, limit },
            headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
        });

        const items = response.data.items || [];

        const mapped = items.map((item: any) => {
            const stats = item.stats || {};
            const matchId = item.match_id;
            const rawMap = stats.Map || 'TBD';
            const mapName = rawMap.replace('de_', '').charAt(0).toUpperCase() + rawMap.replace('de_', '').slice(1);

            return {
                externalId: matchId,
                source: 'Faceit',
                gameMode: stats.Mode || 'Faceit',
                mapName: mapName,
                kills: parseInt(stats.Kills || '0'),
                deaths: parseInt(stats.Deaths || '0'),
                assists: parseInt(stats.Assists || '0'),
                mvps: parseInt(stats.MVPs || '0'),
                score: stats.Score || "0-0",
                duration: '40 min',
                result: stats.Result === '1' ? 'Win' : 'Loss',
                adr: parseFloat(stats.ADR || '0') || 80,
                hsPercentage: parseFloat(stats['Headshots %'] || '0') || 20,
                matchDate: new Date(parseInt(item.created_at) * 1000 || Date.now()).toISOString(),
                url: `https://www.faceit.com/en/cs2/room/${matchId}`,
                metadata: {
                    rounds: stats.Rounds || "0",
                    tripleKills: stats["Triple Kills"] || "0",
                    quadroKills: stats["Quadro Kills"] || "0",
                    pentaKills: stats["Penta Kills"] || "0",
                    headshots: stats.Headshots || "0",
                    teamName: stats.Team || "Team",
                    matchId: matchId,
                    kdRatio: stats["K/D Ratio"],
                    krRatio: stats["K/R Ratio"]
                }
            };
        });

        return mapped;
    } catch (error) {
        console.error("Error fetching Faceit matches:", error);
        return [];
    }
};
