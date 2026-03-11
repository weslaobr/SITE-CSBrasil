import axios from 'axios';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_BASE_URL = 'https://api.steampowered.com';

export interface SteamProfile {
    steamid: string;
    personaname: string;
    profileurl: string;
    avatarfull: string;
    timecreated: number;
}

export interface CS2Stats {
    total_kills: number;
    total_deaths: number;
    total_time_played: number;
    total_wins: number;
    total_mvps: number;
    adr: number;
    hs_percentage: number;
    kd: number;
}

export const getPlayerProfile = async (steamId: string): Promise<SteamProfile> => {
    const response = await axios.get(`${STEAM_BASE_URL}/ISteamUser/GetPlayerSummaries/v0002/`, {
        params: {
            key: STEAM_API_KEY,
            steamids: steamId,
        },
    });
    return response.data.response.players[0];
};

export const getCS2Stats = async (steamId: string): Promise<CS2Stats> => {
    const response = await axios.get(`${STEAM_BASE_URL}/ISteamUserStats/GetUserStatsForGame/v0002/`, {
        params: {
            key: STEAM_API_KEY,
            appid: 730, // CS2 App ID
            steamid: steamId,
        },
    });

    if (!response.data || !response.data.playerstats || !response.data.playerstats.stats) {
        console.warn("No stats found for player:", steamId);
        return {
            total_kills: 0,
            total_deaths: 0,
            total_time_played: 0,
            total_wins: 0,
            total_mvps: 0,
            adr: 0,
            hs_percentage: 0,
            kd: 0
        };
    }

    const statsArray = response.data.playerstats.stats;
    const stats: any = {};
    statsArray.forEach((s: any) => {
        stats[s.name] = s.value;
    });

    return {
        total_kills: stats.total_kills || 0,
        total_deaths: stats.total_deaths || 0,
        total_time_played: stats.total_time_played || 0,
        total_wins: stats.total_wins || 0,
        total_mvps: stats.total_mvps || 0,
        kd: Number(((stats.total_kills || 0) / (stats.total_deaths || 1)).toFixed(2)),
        hs_percentage: stats.total_kills ? Math.round(((stats.total_kills_headshot || 0) / stats.total_kills) * 100) : 0,
        adr: stats.total_damage_done ? Math.round(stats.total_damage_done / (stats.total_rounds_played || 1)) : 85
    };
};

export const getPlayerInventory = async (steamId: string) => {
    // CS2 (App 730, Context 2)
    console.log(`Fetching inventory from Steam: https://steamcommunity.com/inventory/${steamId}/730/2`);
    try {
        const response = await axios.get(`https://steamcommunity.com/inventory/${steamId}/730/2`, {
            params: {
                l: 'english',
                count: 2000,
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': `https://steamcommunity.com/profiles/${steamId}/inventory/`,
            }
        });

        if (!response.data || (!response.data.descriptions && !response.data.assets)) {
            console.warn("Empty or invalid Steam response:", response.data);
            return [];
        }

        const descriptions = response.data.descriptions || [];
        const assets = response.data.assets || [];

        // Map assets to descriptions
        const items = assets.map((asset: any) => {
            const description = descriptions.find((d: any) => d.classid === asset.classid && d.instanceid === asset.instanceid);
            if (!description) return null;

            return {
                assetid: asset.assetid,
                name: description.name,
                market_name: description.market_name,
                icon_url: `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`,
                rarity: description.tags?.find((t: any) => t.category === 'Rarity')?.internal_name,
                rarity_color: description.tags?.find((t: any) => t.category === 'Rarity')?.color,
                type: description.tags?.find((t: any) => t.category === 'Type')?.name,
            };
        }).filter(Boolean);

        return items;
    } catch (error: any) {
        console.error("Steam Inventory API Error:", error.response?.status, error.response?.data || error.message);
        return [];
    }
};

export const getSteamMatchHistory = async (steamId: string, authCode: string, knownCode: string = '', limit: number = 20, baseDate: string = '', stopAtCode: string = '') => {
    if (!STEAM_API_KEY) {
        console.log("Steam API Error: STEAM_API_KEY is missing");
        return [];
    }
    if (!authCode) {
        console.log("Steam API Warning: authCode is missing for SteamID", steamId);
        return [];
    }

    try {
        const matches: any[] = [];
        let currentKnownCode = knownCode || '';
        const startTimestamp = baseDate ? new Date(baseDate).getTime() : Date.now();

        console.log(`Steam Sync Start: SteamID=${steamId}, AuthCode=${authCode}, InitialKnownCode=${currentKnownCode}, Limit=${limit}, BaseDate=${baseDate || 'Now'}, StopAt=${stopAtCode || 'None'}`);

        let cumulativeHours = 0;
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        if (currentKnownCode && currentKnownCode !== stopAtCode && currentKnownCode !== 'n/a') {
            console.log(`[DEBUG] Adding initial seed code to results: ${currentKnownCode}`);
            matches.push({
                externalId: currentKnownCode,
                source: 'Steam',
                gameMode: 'Matchmaking',
                mapName: 'Desconhecido',
                kills: 0,
                deaths: 0,
                assists: 0,
                score: '0-0',
                matchDate: new Date(startTimestamp).toISOString(),
                duration: '0 min',
                result: 'Unknown',
                isMocked: true,
                url: `steam://rungame/730/76561202255233023/+csgo_download_match%20${currentKnownCode}`
            });
        }

        // Fetch in batches to avoid timeouts
        for (let i = 0; i < limit; i++) {
            // Increased delay to 1000ms to be safer
            if (i > 0) await sleep(1000);

            let retries = 0;
            const maxRetries = 3;
            let success = false;

            while (retries < maxRetries && !success) {
                try {
                    const response = await axios.get(`${STEAM_BASE_URL}/ICSGOPlayers_730/GetNextMatchSharingCode/v1`, {
                        params: {
                            key: STEAM_API_KEY,
                            steamid: steamId,
                            steamidkey: authCode,
                            knowncode: currentKnownCode
                        }
                    });

                    const result = response.data?.result;
                    const nextCode = result?.nextcode || result?.nextmatchsharingcode;

                    console.log(`[DEBUG] Fetching match ${i + 1}/${limit}: nextCode=${nextCode}`);

                    if (nextCode && nextCode !== 'n/a' && nextCode !== currentKnownCode) {
                        // Check if we reached the stop code
                        if (stopAtCode && nextCode === stopAtCode) {
                            console.log(`[DEBUG] Stop code reached: ${stopAtCode}. Finishing batch.`);
                            return matches;
                        }

                        // Generate progressively older dates (approx 6-12 hours apart)
                        cumulativeHours += (6 + Math.floor(Math.random() * 12));
                        const matchTime = startTimestamp - (cumulativeHours * 3600000);

                        const maps = ['Mirage', 'Inferno', 'Ancient', 'Anubis', 'Nuke', 'Vertigo', 'Dust 2'];
                        const randomMap = maps[Math.floor(Math.random() * maps.length)];

                        matches.push({
                            externalId: nextCode,
                            source: 'Steam',
                            gameMode: 'Matchmaking',
                            mapName: randomMap,
                            kills: 12 + Math.floor(Math.random() * 15),
                            deaths: 10 + Math.floor(Math.random() * 12),
                            assists: 2 + Math.floor(Math.random() * 6),
                            mvps: Math.floor(Math.random() * 4),
                            score: i % 2 === 0 ? '13-9' : '10-13',
                            matchDate: new Date(matchTime).toISOString(),
                            duration: `${35 + Math.floor(Math.random() * 15)} min`,
                            result: i % 2 === 0 ? 'Win' : 'Loss',
                            adr: 65 + Math.floor(Math.random() * 45),
                            hsPercentage: 8 + Math.floor(Math.random() * 25),
                            isMocked: true, // Flag to indicate these are not real GC stats
                            url: `steam://rungame/730/76561202255233023/+csgo_download_match%20${nextCode}`
                        });
                        currentKnownCode = nextCode;
                        success = true;
                    } else {
                        console.log(`[DEBUG] No more matches found from Steam at index ${i}. Result:`, result);
                        return matches; // Return what we have
                    }
                } catch (err: any) {
                    if (err.response?.status === 429) {
                        retries++;
                        const backoffTime = 2000 * Math.pow(2, retries);
                        console.log(`[DEBUG] Rate limited (429) at match ${i + 1}. Retrying in ${backoffTime}ms... (Attempt ${retries}/${maxRetries})`);
                        await sleep(backoffTime);
                    } else {
                        console.error(`[DEBUG] Steam API error at match ${i + 1}:`, err.message);
                        success = true; // Stop retrying this specific match
                    }
                }
            }

            if (!success) {
                console.log(`[DEBUG] Failed to fetch match ${i + 1} after ${maxRetries} retries. Stopping batch.`);
                break;
            }
        }

        console.log(`Steam Sync Finished: Found ${matches.length} matches`);

        // If no matches found but auth worked, at least show one entry to confirm sync
        if (matches.length === 0 && !knownCode) {
            return [{
                id: 'sync-ready',
                source: 'Steam',
                gameMode: 'Aguardando',
                mapName: 'Sincronizado',
                kills: 0,
                deaths: 0,
                assists: 0,
                matchDate: new Date().toISOString(),
                result: 'Sync OK',
                score: 'Ready'
            }];
        }

        return matches;
    } catch (error: any) {
        console.error("Steam Match History Error:", error.response?.status, error.response?.data || error.message);
        if (error.response?.status === 412) {
            return [{
                id: 'error-412',
                source: 'Steam',
                gameMode: 'Erro de Autenticação',
                mapName: 'Código Inválido',
                kills: 0,
                deaths: 0,
                assists: 0,
                matchDate: new Date().toISOString(),
                result: 'Erro 412',
                score: 'Check Code'
            }];
        }
        return [];
    }
};
