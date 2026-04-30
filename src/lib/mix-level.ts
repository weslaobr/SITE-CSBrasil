/**
 * MIX LEVEL SYSTEM — Tabela oficial de níveis vs Tropoints
 * Esta é a ÚNICA fonte de verdade. Qualquer exibição de nível
 * deve usar esta função, nunca o campo salvo no banco diretamente.
 */

export const MIX_LEVEL_THRESHOLDS = [
    { level: 1,  min: 0,    max: 299,   label: 'Recruta',           color: '#6b7280' },
    { level: 2,  min: 300,  max: 499,   label: 'Aspirante',         color: '#6b7280' },
    { level: 3,  min: 500,  max: 699,   label: 'Soldado',           color: '#6b7280' },
    { level: 4,  min: 700,  max: 899,   label: 'Cabo',              color: '#22c55e' },
    { level: 5,  min: 900,  max: 1099,  label: 'Sargento',          color: '#22c55e' },
    { level: 6,  min: 1100, max: 1349,  label: 'Sargento-Mor',      color: '#22c55e' },
    { level: 7,  min: 1350, max: 1599,  label: 'Tenente',           color: '#3b82f6' },
    { level: 8,  min: 1600, max: 1899,  label: 'Capitão',           color: '#3b82f6' },
    { level: 9,  min: 1900, max: 2199,  label: 'Major',             color: '#3b82f6' },
    { level: 10, min: 2200, max: 2549,  label: 'Coronel',           color: '#8b5cf6' },
    { level: 11, min: 2550, max: 2899,  label: 'General',           color: '#8b5cf6' },
    { level: 12, min: 2900, max: 3299,  label: 'Elite',             color: '#8b5cf6' },
    { level: 13, min: 3300, max: 3749,  label: 'Mestre',            color: '#f59e0b' },
    { level: 14, min: 3750, max: 4249,  label: 'Grão-Mestre',       color: '#f59e0b' },
    { level: 15, min: 4250, max: 4799,  label: 'Lendário',          color: '#f59e0b' },
    { level: 16, min: 4800, max: 5399,  label: 'Supremo',           color: '#ef4444' },
    { level: 17, min: 5400, max: 5999,  label: 'Implacável',        color: '#ef4444' },
    { level: 18, min: 6000, max: 6699,  label: 'Global da Tropa',   color: '#f5c518' },
    { level: 19, min: 6700, max: 7499,  label: 'Imortal',           color: '#f5c518' },
    { level: 20, min: 7500, max: Infinity, label: 'S-Tier',         color: '#f5c518' },
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
