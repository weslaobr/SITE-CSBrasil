/**
 * MIX LEVEL SYSTEM — Tabela oficial de níveis vs Tropoints
 * Esta é a ÚNICA fonte de verdade. Qualquer exibição de nível
 * deve usar esta função, nunca o campo salvo no banco diretamente.
 */

export const MIX_LEVEL_THRESHOLDS = [
    { level: 1,  min: 0,    max: 99,    label: 'Recruta',           color: '#6b7280' },
    { level: 2,  min: 100,  max: 199,   label: 'Aspirante',         color: '#6b7280' },
    { level: 3,  min: 200,  max: 299,   label: 'Soldado',           color: '#6b7280' },
    { level: 4,  min: 300,  max: 399,   label: 'Cabo',              color: '#22c55e' },
    { level: 5,  min: 400,  max: 499,   label: 'Sargento',          color: '#22c55e' },
    { level: 6,  min: 500,  max: 599,   label: 'Sargento-Mor',      color: '#22c55e' },
    { level: 7,  min: 600,  max: 699,   label: 'Tenente',           color: '#3b82f6' },
    { level: 8,  min: 700,  max: 799,   label: 'Capitão',           color: '#3b82f6' },
    { level: 9,  min: 800,  max: 899,   label: 'Major',             color: '#3b82f6' },
    { level: 10, min: 900,  max: 999,   label: 'Coronel',           color: '#8b5cf6' },
    { level: 11, min: 1000, max: 1099,  label: 'General',           color: '#8b5cf6' },
    { level: 12, min: 1100, max: 1199,  label: 'Elite',             color: '#8b5cf6' },
    { level: 13, min: 1200, max: 1299,  label: 'Mestre',            color: '#f59e0b' },
    { level: 14, min: 1300, max: 1399,  label: 'Grão-Mestre',       color: '#f59e0b' },
    { level: 15, min: 1400, max: 1499,  label: 'Lendário',          color: '#f59e0b' },
    { level: 16, min: 1500, max: 1599,  label: 'Supremo',           color: '#ef4444' },
    { level: 17, min: 1600, max: 1699,  label: 'Implacável',        color: '#ef4444' },
    { level: 18, min: 1700, max: 1799,  label: 'Global da Tropa',   color: '#f5c518' },
    { level: 19, min: 1800, max: 1899,  label: 'Imortal',           color: '#f5c518' },
    { level: 20, min: 1900, max: Infinity, label: 'S-Tier',         color: '#f5c518' },
] as const;

export type MixLevelInfo = {
    level: number;
    label: string;
    color: string;
    min: number;
    max: number;
    /** Progresso dentro do nível atual (0-100) */
    progress: number;
    /** Pontos necessários para o próximo nível */
    pointsToNext: number | null;
};

/**
 * Retorna as informações completas de nível a partir dos Tropoints.
 * Sempre use esta função — nunca confie no campo `mixLevel` do banco.
 */
export function getMixLevelFromPoints(points: number): MixLevelInfo {
    const pts = Math.max(0, points || 0);
    const tier = MIX_LEVEL_THRESHOLDS.find(t => pts >= t.min && pts <= t.max)
        ?? MIX_LEVEL_THRESHOLDS[MIX_LEVEL_THRESHOLDS.length - 1];

    const rangeSize = tier.max === Infinity ? 1000 : (tier.max - tier.min + 1);
    const progress = tier.max === Infinity ? 100 : Math.round(((pts - tier.min) / rangeSize) * 100);

    const nextTier = MIX_LEVEL_THRESHOLDS.find(t => t.level === tier.level + 1);
    const pointsToNext = nextTier ? nextTier.min - pts : null;

    return {
        level: tier.level,
        label: tier.label,
        color: tier.color,
        min: tier.min,
        max: tier.max === Infinity ? tier.min + 999 : tier.max,
        progress: Math.min(100, Math.max(0, progress)),
        pointsToNext,
    };
}
