import axios from 'axios';

const CS2SPACE_API_KEY = process.env.CS2SPACE_API_KEY;
const BASE_URL = 'https://cs2.space/api';

export interface CS2SpacePlayerData {
    steam: {
        id64: string;
        personaname: string;
        profileurl: string;
        avatarfull: string;
        timecreated?: number;
    };
    faceit?: {
        id: string;
        nickname: string;
        avatar: string;
        level: number;
        elo: number;
        plus: boolean;
        banned: boolean;
        region: string;
    };
    leetify?: {
        id: string;
        rating: number;
        aim: number;
        positioning: number;
        utility: number;
        opening: number;
        clutch: number;
        ct_rating?: number;
        t_rating?: number;
    };
    ranks?: {
        premier?: number;
        wingman?: { rank: number; wins: number };
        competitive?: Record<string, { rank: number; wins: number }>;
    };
}

/**
 * Busca dados completos de um jogador na CS2.space (Leetify, Faceit, Ranks)
 * @param steamId64 O ID64 da Steam do jogador
 */
export const getCS2SpacePlayerInfo = async (steamId64: string): Promise<CS2SpacePlayerData | null> => {
    if (!CS2SPACE_API_KEY) {
        console.warn("CS2SPACE_API_KEY não configurada no .env");
        return null;
    }

    try {
        const response = await axios.get(`${BASE_URL}/lookup`, {
            params: {
                key: CS2SPACE_API_KEY,
                id: steamId64
            }
        });

        if (!response.data || response.data.error) {
            console.error("Erro na API CS2.space:", response.data?.error || "Desconhecido");
            return null;
        }

        // A API da CS2.space retorna os dados agrupados
        const d = response.data;
        
        return {
            steam: d.steam,
            faceit: d.faceit,
            leetify: d.leetify,
            ranks: d.ranks
        };
    } catch (error: any) {
        console.error("Falha ao consultar CS2.space:", error.message);
        return null;
    }
};

/**
 * Pesquisa jogadores (por nome ou ID)
 */
export const searchCS2SpacePlayers = async (query: string) => {
    if (!CS2SPACE_API_KEY) return [];

    try {
        const response = await axios.get(`${BASE_URL}/search`, {
            params: {
                key: CS2SPACE_API_KEY,
                id: query
            }
        });
        return response.data?.results || [];
    } catch (error) {
        return [];
    }
};
