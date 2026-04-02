// Badges automáticos baseados nas stats do jogador
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface PlayerStats {
    rating: number;
    kdr: number;
    adr: number;
    hsPercentage: number;
    matchesPlayed: number;
    winRate: string;
    gcLevel: number;
    faceitLevel: number;
    rank?: number;
}

const BADGE_DEFS: Array<Badge & { check: (s: PlayerStats) => boolean }> = [
    {
        id: 'top1',
        name: 'Nº 1 da Tropa',
        description: 'Primeiro lugar no ranking',
        icon: '👑',
        color: '#f5c518',
        rarity: 'legendary',
        check: (s) => s.rank === 1,
    },
    {
        id: 'gold_premier',
        name: 'Gold Premier',
        description: 'SR acima de 30.000',
        icon: '🏅',
        color: '#f5c518',
        rarity: 'legendary',
        check: (s) => s.rating >= 30000,
    },
    {
        id: 'lenda',
        name: 'Lenda',
        description: 'SR acima de 25.000',
        icon: '🌟',
        color: '#ef9a9a',
        rarity: 'epic',
        check: (s) => s.rating >= 25000,
    },
    {
        id: 'headhunter',
        name: 'Headhunter',
        description: 'Headshot % acima de 60%',
        icon: '🎯',
        color: '#f97316',
        rarity: 'rare',
        check: (s) => s.hsPercentage >= 60,
    },
    {
        id: 'machine_gun',
        name: 'Machine Gun',
        description: 'ADR médio acima de 100',
        icon: '💥',
        color: '#ef4444',
        rarity: 'rare',
        check: (s) => s.adr >= 100,
    },
    {
        id: 'el_matador',
        name: 'El Matador',
        description: 'KDR acima de 2.0',
        icon: '⚔️',
        color: '#10b981',
        rarity: 'epic',
        check: (s) => s.kdr >= 2.0,
    },
    {
        id: 'consistente',
        name: 'Consistente',
        description: 'Win Rate acima de 60%',
        icon: '⚡',
        color: '#3b82f6',
        rarity: 'rare',
        check: (s) => {
            const wr = parseFloat(s.winRate?.replace('%', '') || '0');
            return wr >= 60;
        },
    },
    {
        id: 'veterano',
        name: 'Veterano',
        description: '50 ou mais partidas registradas',
        icon: '🎖️',
        color: '#8b5cf6',
        rarity: 'common',
        check: (s) => s.matchesPlayed >= 50,
    },
    {
        id: 'ativo',
        name: 'Tropa Ativa',
        description: '20 ou mais partidas registradas',
        icon: '🔥',
        color: '#f59e0b',
        rarity: 'common',
        check: (s) => s.matchesPlayed >= 20,
    },
    {
        id: 'gc_pro',
        name: 'GC Pro',
        description: 'GamersClub level 10 ou superior',
        icon: '🛡️',
        color: '#eab308',
        rarity: 'epic',
        check: (s) => s.gcLevel >= 10,
    },
    {
        id: 'faceit_top',
        name: 'Faceit Elite',
        description: 'Faceit level 10',
        icon: '🟠',
        color: '#f97316',
        rarity: 'legendary',
        check: (s) => s.faceitLevel >= 10,
    },
    {
        id: 'faceit_high',
        name: 'Faceit High',
        description: 'Faceit level 7 ou superior',
        icon: '🔶',
        color: '#fb923c',
        rarity: 'rare',
        check: (s) => s.faceitLevel >= 7,
    },
];

export function getBadges(stats: PlayerStats): Badge[] {
    return BADGE_DEFS
        .filter(b => b.check(stats))
        .map(({ check, ...badge }) => badge)
        .sort((a, b) => {
            const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
            return order[a.rarity] - order[b.rarity];
        });
}

export const RARITY_COLORS: Record<string, string> = {
    legendary: '#f5c518',
    epic: '#8b5cf6',
    rare: '#3b82f6',
    common: '#6b7280',
};

export const RARITY_LABELS: Record<string, string> = {
    legendary: 'Lendário',
    epic: 'Épico',
    rare: 'Raro',
    common: 'Comum',
};
