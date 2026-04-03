// Sistema de Conquistas — desbloqueadas e disponíveis

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    locked?: boolean; // true = ainda não desbloqueada (exibida como disponível)
    lockedHint?: string; // dica de como desbloquear
}

export interface PlayerStats {
    // Ratings & rank
    rating: number;         // premier SR
    premierRating: number;
    faceitLevel: number;
    faceitElo: number;
    gcLevel: number;
    // Performance
    kdr: number;
    adr: number;
    hsPercentage: number;
    awpKillPercentage: number; // % de kills com AWP
    matchesPlayed: number;
    winRate: string;
    // Conta Steam
    accountAgeYears: number;
    // Especial
    isPro?: boolean;        // marcado manualmente no perfil
    rank?: number;          // posição no ranking da tropa
}

// ─── Definições de todas as conquistas ────────────────────────────────────────
const BADGE_DEFS: Array<Badge & { check: (s: PlayerStats) => boolean }> = [

    // ── ESPECIAIS / LENDÁRIAS ────────────────────────────────────────────────
    {
        id: 'lenda_pro',
        name: 'LENDA',
        description: 'Jogador profissional reconhecido pela comunidade',
        icon: '🌟',
        color: '#f5c518',
        rarity: 'legendary',
        lockedHint: 'Marcado manualmente pela staff',
        check: (s) => !!s.isPro,
    },
    {
        id: 'top1',
        name: 'Nº 1 da Tropa',
        description: 'Primeiro lugar no ranking',
        icon: '👑',
        color: '#f5c518',
        rarity: 'legendary',
        lockedHint: 'Seja o 1º no ranking geral',
        check: (s) => s.rank === 1,
    },
    {
        id: 'gold_premier',
        name: 'Gold Premier',
        description: 'SR acima de 30.000 no Premier',
        icon: '🏅',
        color: '#f5c518',
        rarity: 'legendary',
        lockedHint: 'Atinja 30.000 SR no Premier',
        check: (s) => s.premierRating >= 30000,
    },

    // ── PREMIER + OUTRAS PLATAFORMAS ─────────────────────────────────────────
    {
        id: 'plataformista',
        name: 'Plataformista',
        description: 'Joga Faceit ou GC mas não tem SR no Premier',
        icon: '🎮',
        color: '#38bdf8',
        rarity: 'common',
        lockedHint: 'Jogue Faceit ou GC sem Premier registrado',
        check: (s) => s.premierRating === 0 && (s.faceitLevel > 0 || s.gcLevel > 0),
    },
    {
        id: 'suspeito',
        name: 'Suspeito',
        description: 'Premier muito acima das outras plataformas (possível discrepância)',
        icon: '🔍',
        color: '#f59e0b',
        rarity: 'rare',
        lockedHint: 'Premier 15k+ acima com Faceit abaixo de 7 e GC abaixo de 8',
        check: (s) => s.premierRating >= 15000 && s.faceitLevel > 0 && s.faceitLevel < 7 && (s.gcLevel === 0 || s.gcLevel < 8),
    },
    {
        id: 'sub_rated',
        name: 'Subestimado',
        description: 'Faceit/GC altos mas Premier bem abaixo — talento escondido',
        icon: '💎',
        color: '#818cf8',
        rarity: 'rare',
        lockedHint: 'Seja Faceit 8+ ou GC 10+ com Premier abaixo de 10.000',
        check: (s) => (s.faceitLevel >= 8 || s.gcLevel >= 10) && s.premierRating > 0 && s.premierRating < 10000,
    },
    {
        id: 'multiplataforma',
        name: 'Multiplataforma',
        description: 'Ativo no Premier, Faceit E GamersClub ao mesmo tempo',
        icon: '🔗',
        color: '#22d3ee',
        rarity: 'rare',
        lockedHint: 'Tenha SR no Premier, nível no Faceit e no GC',
        check: (s) => s.premierRating > 0 && s.faceitLevel > 0 && s.gcLevel > 0,
    },

    // ── IDADE DA CONTA ──────────────────────────────────────────────────────
    {
        id: 'novato',
        name: 'Novato',
        description: 'Conta Steam com menos de 1 ano',
        icon: '🐣',
        color: '#86efac',
        rarity: 'common',
        lockedHint: 'Conta com menos de 1 ano',
        check: (s) => s.accountAgeYears >= 0 && s.accountAgeYears < 1,
    },
    {
        id: 'experiente',
        name: 'Experiente',
        description: 'Conta Steam com 2 a 5 anos de estrada',
        icon: '📅',
        color: '#60a5fa',
        rarity: 'common',
        lockedHint: 'Tenha conta Steam com 2 a 5 anos',
        check: (s) => s.accountAgeYears >= 2 && s.accountAgeYears <= 5,
    },
    {
        id: 'veterano_conta',
        name: 'Veterano',
        description: 'Conta Steam com mais de 5 anos',
        icon: '🎖️',
        color: '#818cf8',
        rarity: 'rare',
        lockedHint: 'Tenha conta Steam com mais de 5 anos',
        check: (s) => s.accountAgeYears > 5,
    },

    // ── PERFORMANCE ──────────────────────────────────────────────────────────
    {
        id: 'headshot_machine',
        name: 'HEADSHOT MACHINE',
        description: 'Mais de 60% dos abates com tiro na cabeça',
        icon: '💀',
        color: '#f97316',
        rarity: 'epic',
        lockedHint: 'Tenha 60%+ de headshot %',
        check: (s) => s.hsPercentage >= 60,
    },
    {
        id: 'olho_aguia',
        name: 'OLHO DE ÁGUIA',
        description: 'Mais de 25% dos abates com AWP',
        icon: '🦅',
        color: '#34d399',
        rarity: 'epic',
        lockedHint: 'Tenha 25%+ de kills com AWP',
        check: (s) => s.awpKillPercentage >= 25,
    },
    {
        id: 'el_matador',
        name: 'El Matador',
        description: 'KDR acima de 2.0',
        icon: '⚔️',
        color: '#10b981',
        rarity: 'epic',
        lockedHint: 'Atinja KDR 2.0+',
        check: (s) => s.kdr >= 2.0,
    },
    {
        id: 'machine_gun',
        name: 'Destruidor',
        description: 'ADR médio acima de 100',
        icon: '💥',
        color: '#ef4444',
        rarity: 'rare',
        lockedHint: 'Tenha ADR 100+ nas partidas registradas',
        check: (s) => s.adr >= 100,
    },
    {
        id: 'consistente',
        name: 'Implacável',
        description: 'Win Rate acima de 60%',
        icon: '⚡',
        color: '#3b82f6',
        rarity: 'rare',
        lockedHint: 'Mantenha 60%+ de win rate',
        check: (s) => {
            const wr = parseFloat(s.winRate?.replace('%', '') || '0');
            return wr >= 60;
        },
    },

    // ── ATIVIDADE ────────────────────────────────────────────────────────────
    {
        id: 'ativo',
        name: 'Tropa Ativa',
        description: '20 ou mais partidas registradas',
        icon: '🔥',
        color: '#f59e0b',
        rarity: 'common',
        lockedHint: 'Jogue 20+ partidas no sistema',
        check: (s) => s.matchesPlayed >= 20,
    },
    {
        id: 'guerreiro',
        name: 'Guerreiro',
        description: '50 ou mais partidas registradas',
        icon: '🪖',
        color: '#8b5cf6',
        rarity: 'common',
        lockedHint: 'Jogue 50+ partidas no sistema',
        check: (s) => s.matchesPlayed >= 50,
    },
    {
        id: 'centuriao',
        name: 'Centurião',
        description: '100 ou mais partidas registradas',
        icon: '🏛️',
        color: '#e879f9',
        rarity: 'rare',
        lockedHint: 'Jogue 100+ partidas no sistema',
        check: (s) => s.matchesPlayed >= 100,
    },

    // ── FACEIT ───────────────────────────────────────────────────────────────
    {
        id: 'faceit_top',
        name: 'Faceit Elite',
        description: 'Faceit level 10',
        icon: '🟠',
        color: '#f97316',
        rarity: 'legendary',
        lockedHint: 'Alcance o nível 10 no Faceit',
        check: (s) => s.faceitLevel >= 10,
    },
    {
        id: 'faceit_high',
        name: 'Faceit Pro',
        description: 'Faceit level 7 ou superior',
        icon: '🔶',
        color: '#fb923c',
        rarity: 'rare',
        lockedHint: 'Alcance o nível 7+ no Faceit',
        check: (s) => s.faceitLevel >= 7,
    },
    {
        id: 'faceit_mid',
        name: 'Faceit Sólido',
        description: 'Faceit level 5 ou superior',
        icon: '🔸',
        color: '#fdba74',
        rarity: 'common',
        lockedHint: 'Alcance o nível 5+ no Faceit',
        check: (s) => s.faceitLevel >= 5,
    },

    // ── GAMERSCLUB ───────────────────────────────────────────────────────────
    {
        id: 'gc_pro',
        name: 'GC Pro',
        description: 'GamersClub level 10 ou superior',
        icon: '🛡️',
        color: '#eab308',
        rarity: 'epic',
        lockedHint: 'Alcance o nível 10 na GamersClub',
        check: (s) => s.gcLevel >= 10,
    },
    {
        id: 'gc_mid',
        name: 'GC Rankeado',
        description: 'GamersClub level 5 ou superior',
        icon: '🏆',
        color: '#ca8a04',
        rarity: 'common',
        lockedHint: 'Alcance o nível 5+ na GamersClub',
        check: (s) => s.gcLevel >= 5,
    },
];

// ─── Retorna conquistas desbloqueadas (locked=false) ─────────────────────────
export function getBadges(stats: PlayerStats): Badge[] {
    return BADGE_DEFS
        .filter(b => b.check(stats))
        .map(({ check, ...badge }) => ({ ...badge, locked: false }))
        .sort((a, b) => {
            const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
            return order[a.rarity] - order[b.rarity];
        });
}

// ─── Retorna TODAS as conquistas (desbloqueadas + bloqueadas) ─────────────────
export function getAllBadges(stats: PlayerStats): Badge[] {
    return BADGE_DEFS
        .map(({ check, ...badge }) => ({
            ...badge,
            locked: !check(stats),
        }))
        .sort((a, b) => {
            // Desbloqueadas primeiro, depois por raridade
            if (a.locked !== b.locked) return a.locked ? 1 : -1;
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
